// src/core/git-wrapper.ts - Enhanced with HTTPS fallback
import { execSync, spawn } from 'child_process';
import * as path from 'path';
import { PathUtils } from '../utils/path-utils';
import chalk from 'chalk';

export class GitWrapper {
  async clone(repoUrl: string, targetDir: string, sshKeyPath?: string): Promise<void> {
    try {
      if (sshKeyPath && repoUrl.startsWith('git@')) {
        // Try SSH clone first
        await this.cloneWithSSH(repoUrl, targetDir, sshKeyPath);
      } else if (!repoUrl.startsWith('git@')) {
        // Only use HTTPS if URL is already HTTPS
        await this.cloneWithHTTPS(repoUrl, targetDir);
      } else {
        throw new Error('SSH key is required for SSH URLs');
      }
    } catch (error) {
      // Don't auto-fallback to HTTPS, let the calling code handle it
      throw error;
    }
  }

  private async cloneWithSSH(repoUrl: string, targetDir: string, sshKeyPath: string): Promise<void> {
    const fs = require('fs-extra');
    try {
      // Normalize and validate SSH key path
      const normalizedPath = PathUtils.normalizeForSSH(sshKeyPath);
      if (!await fs.pathExists(normalizedPath)) {
        throw new Error(`SSH key file does not exist: ${normalizedPath}`);
      }
      
      // Use GIT_SSH_COMMAND for the initial clone
      const sshCommand = `ssh -i "${normalizedPath}" -F /dev/null -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
      
      // Clone the repository
      console.log(chalk.blue('🚀 Cloning repository...'));
      execSync(`git clone "${repoUrl}" "${targetDir}"`, {
        stdio: 'inherit',
        env: { ...process.env, GIT_SSH_COMMAND: sshCommand }
      });
      
      // Configure SSH command in the repository
      try {
        const configPath = path.join(targetDir, '.git', 'config');
        let configText = fs.readFileSync(configPath, 'utf-8');
        const normalizedPathForConfig = normalizedPath.replace(/\\/g, '/');
        const sshConfigValue = `ssh -i "${normalizedPathForConfig}" -F /dev/null -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
        
        // Find [core] section
        const coreSectionRegex = /(^|\n)\[core\][^\[]*/;
        const match = configText.match(coreSectionRegex);
        if (match) {
          let coreBlock = match[0];
          if (/sshCommand\s*=/.test(coreBlock)) {
            coreBlock = coreBlock.replace(/sshCommand\s*=.*(\n|$)/, `sshCommand = ${sshConfigValue}\n`);
          } else {
            coreBlock = coreBlock.replace(/(\[core\][^\n]*\n)/, `$1sshCommand = ${sshConfigValue}\n`);
          }
          configText = configText.replace(coreSectionRegex, coreBlock);
        } else {
          configText += `\n[core]\nsshCommand = ${sshConfigValue}\n`;
        }
        fs.writeFileSync(configPath, configText, 'utf-8');
      } catch (configError) {
        console.warn(chalk.yellow(`Repository cloned, but failed to set SSH configuration: ${configError}`));
      }
    } catch (error) {
      throw new Error(`SSH clone failed: ${error}`);
    }
  }

  private async cloneWithHTTPS(repoUrl: string, targetDir: string): Promise<void> {
    const httpsUrl = this.convertToHTTPS(repoUrl);
    console.log(chalk.blue('🌐 Cloning with HTTPS...'));
    console.log(chalk.yellow('You will need:'));
    console.log(chalk.gray('1. Your GitHub/GitLab username'));
    console.log(chalk.gray('2. A Personal Access Token (NOT your password)'));
    console.log(chalk.gray('   Get one from: GitHub -> Settings -> Developer Settings -> Personal Access Tokens'));
    
    try {
      execSync(`git clone "${httpsUrl}" "${targetDir}"`, { stdio: 'inherit' });
    } catch (error: any) {
      throw new Error(`HTTPS clone failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async configureRepo(repoPath: string, sshKeyPath?: string): Promise<void> {
    try {
      if (sshKeyPath) {
        // Configure SSH for this repository
        const normalizedPath = PathUtils.normalizeForSSH(sshKeyPath);
        const quotedPath = `\"${normalizedPath}\"`;
        const sshCommand = [
          'ssh',
          '-i', quotedPath,
          '-F', '/dev/null',
          '-o', 'IdentitiesOnly=yes',
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'UserKnownHostsFile=/dev/null'
        ].join(' ');
        
        // Correct quoting for Windows: double quotes for value, escaped double quotes for path
        const shellCommand = `git config core.sshCommand "ssh -i \"${normalizedPath}\" -F /dev/null -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"`;
        const { execSync } = require('child_process');
        execSync(shellCommand, { cwd: repoPath, stdio: 'pipe' });

        // Also set up local SSH config for this repo
        await this.createLocalSSHConfig(repoPath, sshKeyPath);
        
        console.log(chalk.green(`Repository configured with SSH key: ${path.basename(sshKeyPath)}`));
      } else {
        // Configure for HTTPS (remove any SSH config)
        try {
          execSync('git config --unset core.sshCommand', {
            cwd: repoPath,
            stdio: 'pipe'
          });
        } catch {
          // Ignore if config doesn't exist
        }
        
        console.log(chalk.green('Repository configured for HTTPS'));
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not configure repository: ${error}`));
    }
  }

  private async createLocalSSHConfig(repoPath: string, sshKeyPath: string): Promise<void> {
    const fs = require('fs-extra');
    const configDir = path.join(repoPath, '.git', 'ssh');
    
    try {
      await fs.ensureDir(configDir);
      
      const configContent = `#!/bin/bash
# Auto-generated SSH wrapper for this repository
exec ssh -i "${sshKeyPath}" -F /dev/null -o IdentitiesOnly=yes -o StrictHostKeyChecking=no "$@"
`;
      
      const wrapperPath = path.join(configDir, 'wrapper.sh');
      await fs.writeFile(wrapperPath, configContent);
      
      // Make executable on Unix-like systems
      if (process.platform !== 'win32') {
        await fs.chmod(wrapperPath, '755');
      }
      
    } catch (error) {
      console.warn(chalk.yellow(`Could not create local SSH config: ${error}`));
    }
  }

  convertToHTTPS(sshUrl: string): string {
    try {
      if (sshUrl.startsWith('git@')) {
        // Convert git@github.com:user/repo.git to https://github.com/user/repo.git
        const match = sshUrl.match(/git@([^:]+):(.+)/);
        if (match) {
          const [, host, repoPath] = match;
          return `https://${host}/${repoPath}`;
        }
      }
      
      // If already HTTPS or unknown format, return as-is
      return sshUrl;
    } catch (error) {
      console.warn(chalk.yellow(`Could not convert URL: ${error}`));
      return sshUrl;
    }
  }

  extractRepoName(repoUrl: string): string {
    try {
      const match = repoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
      return match ? match[1] : 'repository';
    } catch (error) {
      return 'repository';
    }
  }

  isGitRepository(dir: string): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: dir, 
        stdio: 'pipe',
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  async getRemoteUrl(repoPath: string): Promise<string | null> {
    try {
      const result = execSync('git remote get-url origin', {
        cwd: repoPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return result.trim();
    } catch {
      return null;
    }
  }

  async switchToHTTPS(repoPath: string): Promise<void> {
    try {
      const currentUrl = await this.getRemoteUrl(repoPath);
      if (currentUrl && currentUrl.startsWith('git@')) {
        const httpsUrl = this.convertToHTTPS(currentUrl);
        
        execSync(`git remote set-url origin "${httpsUrl}"`, {
          cwd: repoPath,
          stdio: 'pipe'
        });
        
        // Remove SSH configuration
        execSync('git config --unset core.sshCommand', {
          cwd: repoPath,
          stdio: 'pipe'
        });
        
        console.log(chalk.green(`Switched to HTTPS: ${httpsUrl}`));
      }
    } catch (error) {
      console.warn(chalk.yellow(`Could not switch to HTTPS: ${error}`));
    }
  }

  async setRemoteUrl(repoPath: string, url: string): Promise<void> {
    try {
      execSync(`git -C "${repoPath}" remote set-url origin "${url}"`, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Failed to set remote URL: ${error}`);
    }
  }
}