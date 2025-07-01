// src/core/ssh-manager.ts - Enhanced version with better error handling
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { SSHKey } from '../types';
import { PathUtils } from '../utils/path-utils';
import chalk from 'chalk';

export class SSHManager {
  private sshDir: string;

  constructor() {
    // Handle both Unix and Windows paths properly
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.sshDir = path.join(homeDir, '.ssh');
  }

  async discoverSSHKeys(): Promise<SSHKey[]> {
    const keys: SSHKey[] = [];
    
    try {
      // Ensure SSH directory exists
      if (!await fs.pathExists(this.sshDir)) {
        console.log(chalk.yellow(`SSH directory not found: ${this.sshDir}`));
        console.log(chalk.blue('Creating SSH directory...'));
        await fs.ensureDir(this.sshDir);
        
        // Set secure permissions on Unix-like systems
        if (process.platform !== 'win32') {
          await fs.chmod(this.sshDir, '700');
        }
        
        // Offer to generate keys
        await this.offerKeyGeneration();
        return keys;
      }

      const files = await fs.readdir(this.sshDir);
      const keyFiles = files.filter(file => 
        !file.endsWith('.pub') && 
        !file.includes('known_hosts') &&
        !file.includes('config') &&
        !file.includes('authorized_keys') &&
        !file.startsWith('.')
      );

      for (const keyFile of keyFiles) {
        const keyPath = path.join(this.sshDir, keyFile);
        const pubKeyPath = `${keyPath}.pub`;
        
        // Validate key file accessibility
        if (await this.validateKeyFile(keyPath, pubKeyPath)) {
          try {
            const keyType = await this.getKeyType(keyPath);
            const fingerprint = await this.getKeyFingerprint(pubKeyPath);
            
            keys.push({
              name: keyFile,
              path: keyPath,
              relativePath: PathUtils.toRelativeSSHPath(keyPath),
              publicKeyPath: pubKeyPath,
              fingerprint,
              type: keyType
            });
          } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not read key: ${keyFile} - ${error}`));
          }
        }
      }

      // If no valid keys found, offer to create one
      if (keys.length === 0) {
        await this.offerKeyGeneration();
      }

    } catch (error) {
      console.error(chalk.red(`Failed to discover SSH keys: ${error}`));
      // Don't throw, return empty array to allow HTTPS fallback
      return [];
    }

    return keys;
  }

  private async validateKeyFile(keyPath: string, pubKeyPath: string): Promise<boolean> {
    try {
      // Check if files exist and are readable
      const keyExists = await fs.pathExists(keyPath);
      const pubKeyExists = await fs.pathExists(pubKeyPath);
      
      if (!keyExists) {
        console.warn(chalk.yellow(`Private key not accessible: ${keyPath}`));
        return false;
      }
      
      if (!pubKeyExists) {
        console.warn(chalk.yellow(`Public key not found: ${pubKeyPath}`));
        return false;
      }

      // Test if we can actually read the files
      try {
        await fs.access(keyPath, fs.constants.R_OK);
        await fs.access(pubKeyPath, fs.constants.R_OK);
      } catch (accessError) {
        console.warn(chalk.yellow(`Cannot access key files: ${accessError}`));
        return false;
      }

      // Fix permissions on Unix-like systems
      if (process.platform !== 'win32') {
        try {
          const stats = await fs.stat(keyPath);
          const mode = stats.mode & parseInt('777', 8);
          if (mode !== parseInt('600', 8) && mode !== parseInt('400', 8)) {
            console.log(chalk.blue(`Fixing permissions for: ${path.basename(keyPath)}`));
            await fs.chmod(keyPath, '600');
          }
        } catch (permError) {
          console.warn(chalk.yellow(`Could not fix permissions: ${permError}`));
        }
      }

      return true;
    } catch (error) {
      console.warn(chalk.yellow(`Key validation failed for ${path.basename(keyPath)}: ${error}`));
      return false;
    }
  }

  private async offerKeyGeneration(): Promise<void> {
    console.log(chalk.yellow('\n🔑 No valid SSH keys found!'));
    console.log(chalk.blue('Generate a new SSH key with:'));
    console.log(chalk.green('ssh-keygen -t ed25519 -C "your_email@example.com"'));
    console.log(chalk.blue('Or use an existing key:'));
    console.log(chalk.green('ssh-keygen -t rsa -b 4096 -C "your_email@example.com"'));
    console.log(chalk.gray('Then add the public key to your Git service (GitHub, GitLab, etc.)'));
    console.log(chalk.yellow('Falling back to HTTPS clone...\n'));
  }

  private async getKeyType(keyPath: string): Promise<'rsa' | 'ed25519' | 'ecdsa' | 'dsa'> {
    try {
      const keyContent = await fs.readFile(keyPath, 'utf8');
      
      // Check for different key types
      if (keyContent.includes('ssh-ed25519') || keyContent.includes('ED25519')) return 'ed25519';
      if (keyContent.includes('ssh-rsa') || keyContent.includes('RSA')) return 'rsa';
      if (keyContent.includes('ecdsa') || keyContent.includes('ECDSA')) return 'ecdsa';
      if (keyContent.includes('ssh-dss') || keyContent.includes('DSA')) return 'dsa';
      
      // Default fallback
      return 'rsa';
    } catch (error) {
      console.warn(chalk.yellow(`Could not determine key type: ${error}`));
      return 'rsa';
    }
  }

  private async getKeyFingerprint(pubKeyPath: string): Promise<string> {
    try {
      const result = execSync(`ssh-keygen -lf "${pubKeyPath}"`, { 
        encoding: 'utf8',
        timeout: 5000 
      });
      const parts = result.trim().split(' ');
      return parts[1] || 'Unknown';
    } catch (error) {
      console.warn(chalk.yellow(`Could not get fingerprint: ${error}`));
      return 'Unknown';
    }
  }

  private extractRepoInfo(repoUrl: string): { host: string; owner: string; repo: string } {
    // Handle SSH URLs (git@github.com:owner/repo.git)
    const sshMatch = repoUrl.match(/git@([^:]+):([^\/]+)\/([^\.]+)(?:\.git)?$/);
    if (sshMatch) {
      return {
        host: sshMatch[1],
        owner: sshMatch[2],
        repo: sshMatch[3]
      };
    }

    // Handle HTTPS URLs (https://github.com/owner/repo.git)
    const httpsMatch = repoUrl.match(/https:\/\/([^\/]+)\/([^\/]+)\/([^\.]+)(?:\.git)?$/);
    if (httpsMatch) {
      return {
        host: httpsMatch[1],
        owner: httpsMatch[2],
        repo: httpsMatch[3]
      };
    }

    throw new Error(`Invalid repository URL format: ${repoUrl}`);
  }

  async testSSHKey(keyPath: string, repoUrl: string): Promise<{success: boolean, error?: string}> {
    try {
      const { host, owner, repo } = this.extractRepoInfo(repoUrl);
      
      // First test basic SSH authentication
      try {
        execSync(`ssh -i "${keyPath}" -T -o ConnectTimeout=10 -o StrictHostKeyChecking=no git@${host}`, { 
          stdio: 'pipe',
          timeout: 15000,
          encoding: 'utf8'
        });
      } catch (error: any) {
        // Check for success patterns in the error output
        const output = error.stdout || error.stderr || error.message || '';
        const basicAuthSuccess = [
          /You've successfully authenticated/i,           // GitHub
          /successfully authenticated/i,                  // General
          /Welcome to GitLab/i,                          // GitLab
          /logged in as/i,                               // Bitbucket
          /Hi \w+!/i,                                    // GitHub personal greeting
          /You can use git or hg to connect/i            // Bitbucket
        ].some(pattern => pattern.test(output));

        if (!basicAuthSuccess) {
          return { 
            success: false, 
            error: `Failed to authenticate with ${host}. Please ensure your SSH key is added to your account.` 
          };
        }
      }

      // Now test repository-specific access using git ls-remote
      try {
        const sshCommand = process.platform === 'win32'
          ? `set GIT_SSH_COMMAND=ssh -i "${keyPath}" -o StrictHostKeyChecking=no && git ls-remote git@${host}:${owner}/${repo}.git HEAD`
          : `GIT_SSH_COMMAND="ssh -i '${keyPath}' -o StrictHostKeyChecking=no" git ls-remote git@${host}:${owner}/${repo}.git HEAD`;

        execSync(sshCommand, { 
          stdio: 'pipe',
          timeout: 15000,
          encoding: 'utf8'
        });
        return { success: true };
      } catch (error: any) {
        const output = error.toString().toLowerCase();
        if (output.includes('permission denied') || output.includes('access denied')) {
          return { 
            success: false, 
            error: `You don't have access to ${owner}/${repo}. Please check your repository permissions.` 
          };
        } else if (output.includes('repository not found')) {
          return { 
            success: false, 
            error: `Repository ${owner}/${repo} not found. Please check if the repository exists and you have the correct URL.` 
          };
        }
        return { 
          success: false, 
          error: `Failed to verify repository access: ${error.message || error}` 
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: `SSH test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}