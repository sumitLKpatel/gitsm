// src/commands/clone.ts
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { SSHManager } from '../core/ssh-manager';
import { GitWrapper } from '../core/git-wrapper';
import { RepoConfigManager } from '../core/repo-config';
import { PromptUtils } from '../utils/prompt-utils';

export class CloneCommand {
  private sshManager: SSHManager;
  private gitWrapper: GitWrapper;
  private configManager: RepoConfigManager;
  private promptUtils: PromptUtils;

  constructor() {
    this.sshManager = new SSHManager();
    this.gitWrapper = new GitWrapper();
    this.configManager = new RepoConfigManager();
    this.promptUtils = new PromptUtils();
  }

  async execute(repoUrl: string, options: { ssh?: boolean; dir?: string; https?: boolean }): Promise<void> {
    try {
      // Determine target directory
      const repoName = this.gitWrapper.extractRepoName(repoUrl);
      const targetDir = options.dir || repoName;
      const fullTargetPath = path.resolve(targetDir);

      // Check if directory already exists
      if (await fs.pathExists(fullTargetPath)) {
        console.error(chalk.red(`fatal: destination path '${targetDir}' already exists and is not an empty directory.`));
        process.exit(1);
      }

      // Determine clone method
      let useHttps = options.https;
      if (!useHttps && !repoUrl.startsWith('git@')) {
        // For HTTPS URLs, confirm if user wants to proceed with HTTPS
        useHttps = await this.promptUtils.confirmAction(
          'This is an HTTPS URL. Would you like to proceed with HTTPS clone? (You will need a Personal Access Token for private repos)'
        );
        if (!useHttps) {
          console.log(chalk.yellow('Clone cancelled.'));
          process.exit(1);
        }
      }

      // Use HTTPS if requested
      if (useHttps) {
        await this.cloneWithHTTPS(repoUrl, fullTargetPath);
        return;
      }

      // Try SSH approach for SSH URLs
      if (repoUrl.startsWith('git@')) {
        const sshSuccess = await this.trySSHClone(repoUrl, fullTargetPath);
        if (!sshSuccess) {
          // Check if directory exists and is not empty before HTTPS fallback
          if (await fs.pathExists(fullTargetPath)) {
            const files = await fs.readdir(fullTargetPath);
            if (files.length > 0) {
              console.error(chalk.red(`fatal: destination path '${targetDir}' already exists and is not an empty directory.`));
              process.exit(1);
            }
          }

          // Ask user if they want to try HTTPS
          const tryHTTPS = await this.promptUtils.confirmAction(
            'SSH clone failed. Would you like to try HTTPS instead?'
          );

          if (!tryHTTPS) {
            console.log(chalk.yellow('Clone cancelled.'));
            process.exit(1);
          }

          // Switch to HTTPS with user confirmation
          const httpsUrl = this.gitWrapper.convertToHTTPS(repoUrl);
          await this.cloneWithHTTPS(httpsUrl, fullTargetPath);
        }
      } else {
        // Direct HTTPS clone
        await this.cloneWithHTTPS(repoUrl, fullTargetPath);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Clone failed: ${error}`));
      process.exit(1);
    }
  }

  private async trySSHClone(repoUrl: string, fullTargetPath: string): Promise<boolean> {
    try {
      const sshKeys = await this.sshManager.discoverSSHKeys();
      
      if (sshKeys.length === 0) {
        console.log(chalk.yellow('⚠️  No SSH keys found'));
        return false;
      }

      // Interactive SSH key selection
      console.log(chalk.blue('🔑 Select SSH key for this repository:'));
      const selectedKey = await this.promptUtils.selectSSHKey(sshKeys);

      if (!await fs.pathExists(selectedKey.path)) {
        console.log(chalk.red(`Selected SSH key does not exist: ${selectedKey.path}`));
        const availableKeys = await this.sshManager.discoverSSHKeys();
        if (availableKeys.length === 0) {
          console.log(chalk.red('No valid SSH keys available. Aborting.'));
          return false;
        }
        const newKey = await this.promptUtils.selectSSHKey(availableKeys);
        selectedKey.path = newKey.path;
        selectedKey.relativePath = newKey.relativePath;
      }
      
      // Test SSH connection
      console.log(chalk.blue('🔐 Testing SSH connection...'));
      const testResult = await this.sshManager.testSSHKey(selectedKey.path, repoUrl);
      
      if (!testResult.success) {
        console.log(chalk.yellow(`⚠️  SSH test failed: ${testResult.error}`));
        const tryAnyway = await this.promptUtils.confirmAction(
          'SSH test failed. Try cloning anyway?'
        );
        if (!tryAnyway) {
          return false;
        }
      } else {
        console.log(chalk.green('✅ SSH connection successful'));
      }

      // Clone with selected SSH key
      await this.gitWrapper.clone(repoUrl, fullTargetPath, selectedKey.path);
      await this.gitWrapper.configureRepo(fullTargetPath, selectedKey.path);
      await this.configManager.setRepoConfig(fullTargetPath, selectedKey.path, repoUrl);

      console.log(chalk.green(`✅ Repository cloned successfully with SSH key: ${selectedKey.relativePath}`));
      return true;

    } catch (error) {
      console.log(chalk.yellow(`⚠️  SSH clone failed: ${error}`));
      return false;
    }
  }

  private async cloneWithHTTPS(repoUrl: string, fullTargetPath: string): Promise<void> {
    try {
      // Convert SSH URL to HTTPS if needed
      const httpsUrl = repoUrl.startsWith('git@') 
        ? this.gitWrapper.convertToHTTPS(repoUrl)
        : repoUrl;

      // Clone with HTTPS
      await this.gitWrapper.clone(httpsUrl, fullTargetPath);

      // Configure repository for HTTPS
      await this.gitWrapper.configureRepo(fullTargetPath);

      // Save configuration
      await this.configManager.setRepoConfig(fullTargetPath, '', httpsUrl);

    } catch (error) {
      // Provide helpful error messages
      const errMsg = (typeof error === 'object' && error !== null && 'toString' in error)
        ? (error as Error).toString()
        : String(error);

      if (errMsg.includes('Authentication failed')) {
        console.log(chalk.red('\n❌ Authentication failed'));
        console.log(chalk.blue('💡 Solutions:'));
        console.log(chalk.gray('   1. Use a Personal Access Token instead of password'));
        console.log(chalk.gray('   2. Set up SSH keys for passwordless authentication'));
        console.log(chalk.gray('   3. Check if the repository exists and you have access'));
      } else if (errMsg.includes('Repository not found')) {
        console.log(chalk.red('\n❌ Repository not found'));
        console.log(chalk.blue('💡 Check:'));
        console.log(chalk.gray('   1. Repository URL is correct'));
        console.log(chalk.gray('   2. Repository exists'));
        console.log(chalk.gray('   3. You have access permissions'));
      }
      
      throw error;
    }
  }

  // Add a method to fix existing repositories
  async fixRepository(repoPath: string): Promise<void> {
    try {
      if (!this.gitWrapper.isGitRepository(repoPath)) {
        console.error(chalk.red('❌ Not a Git repository'));
        return;
      }

      const currentUrl = await this.gitWrapper.getRemoteUrl(repoPath);
      if (!currentUrl) {
        console.error(chalk.red('❌ No remote URL found'));
        return;
      }

      console.log(chalk.blue(`Current remote: ${currentUrl}`));

      if (currentUrl.startsWith('git@')) {
        // SSH repository - try to fix SSH or switch to HTTPS
        const fixSSH = await this.promptUtils.confirmAction(
          'Try to fix SSH configuration?'
        );

        if (fixSSH) {
          const sshKeys = await this.sshManager.discoverSSHKeys();
          if (sshKeys.length > 0) {
            const selectedKey = await this.promptUtils.selectSSHKey(sshKeys);
            await this.gitWrapper.configureRepo(repoPath, selectedKey.path);
            await this.configManager.setRepoConfig(repoPath, selectedKey.path, currentUrl);
            console.log(chalk.green('✅ SSH configuration updated'));
          } else {
            console.log(chalk.yellow('No SSH keys found, switching to HTTPS...'));
            await this.gitWrapper.switchToHTTPS(repoPath);
          }
        } else {
          // Switch to HTTPS
          await this.gitWrapper.switchToHTTPS(repoPath);
        }
      } else {
        console.log(chalk.green('✅ Repository is already configured for HTTPS'));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Failed to fix repository: ${error}`));
    }
  }
}