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

  async testSSHKey(keyPath: string, repoUrl: string): Promise<{success: boolean, error?: string}> {
    try {
      const host = this.extractHostFromUrl(repoUrl);
      
      // Test SSH connection with timeout
      const result = execSync(`ssh -i "${keyPath}" -T -o ConnectTimeout=10 -o StrictHostKeyChecking=no git@${host}`, { 
        stdio: 'pipe',
        timeout: 15000,
        encoding: 'utf8'
      });
      
      // This shouldn't happen for GitHub, but if it does, it's success
      return { success: true };
    } catch (error: any) {
      // GitHub and other Git providers return exit code 1 with a success message
      // Check if the error output contains success indicators
      const output = error.stdout || error.stderr || error.message || '';
      
      // Common success patterns from different Git providers
      const successPatterns = [
        /You've successfully authenticated/i,           // GitHub
        /successfully authenticated/i,                  // General
        /Welcome to GitLab/i,                          // GitLab
        /logged in as/i,                               // Bitbucket
        /Hi \w+!/i,                                    // GitHub personal greeting
        /You can use git or hg to connect/i            // Bitbucket
      ];
      
      const isSuccessfulAuth = successPatterns.some(pattern => 
        pattern.test(output)
      );
      
      if (isSuccessfulAuth) {
        return { success: true };
      }
      
      // If no success pattern found, it's a real failure
      return { 
        success: false, 
        error: `SSH authentication failed: ${output || error.message}` 
      };
    }
  }

  private extractHostFromUrl(repoUrl: string): string {
    try {
      // Handle different URL formats
      if (repoUrl.startsWith('git@')) {
        // git@github.com:user/repo.git
        const match = repoUrl.match(/git@([^:]+):/);
        return match ? match[1] : 'github.com';
      } else if (repoUrl.startsWith('https://')) {
        // https://github.com/user/repo.git
        const url = new URL(repoUrl);
        return url.hostname;
      }
      
      // Default fallback
      return 'github.com';
    } catch (error) {
      console.warn(chalk.yellow(`Could not extract host from URL: ${error}`));
      return 'github.com';
    }
  }
}