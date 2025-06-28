import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { SSHManager } from '../core/ssh-manager';
import { RepoConfigManager } from '../core/repo-config';
import { GitWrapper } from '../core/git-wrapper';
import { PromptUtils } from '../utils/prompt-utils';

export class FixCommand {
  private sshManager: SSHManager;
  private configManager: RepoConfigManager;
  private gitWrapper: GitWrapper;
  private promptUtils: PromptUtils;

  constructor() {
    this.sshManager = new SSHManager();
    this.configManager = new RepoConfigManager();
    this.gitWrapper = new GitWrapper();
    this.promptUtils = new PromptUtils();
  }

  async execute(repoPath: string): Promise<void> {
    try {
      const fs = require('fs');
      const fsExtra = require('fs-extra');
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
        // SSH repository - check SSH key config
        const config = await this.configManager.loadConfig();
        const repoConfig = config.repositories[repoPath];
        let sshKeyPath = repoConfig?.sshKeyPath;
        let keyExists = sshKeyPath && await fsExtra.pathExists(sshKeyPath);

        console.log(chalk.yellow(`[DEBUG] Previous SSH key path in config: ${sshKeyPath}`));

        if (!keyExists) {
          console.log(chalk.yellow('⚠️  Configured SSH key does not exist or is not set.'));
          const sshKeys = await this.sshManager.discoverSSHKeys();
          if (sshKeys.length === 0) {
            console.log(chalk.red('No SSH keys found in ~/.ssh. Aborting.'));
            return;
          }
          const selectedKey = await this.promptUtils.selectSSHKey(sshKeys);
          sshKeyPath = selectedKey.path;
          console.log(chalk.yellow(`[DEBUG] Setting new SSH key path: ${sshKeyPath}`));
        }
        // Always rewrite config with normalized, quoted path using direct text edit
        const path = require('path');
        const normalizedPathForConfig = sshKeyPath.replace(/\\/g, '/');
        const sshConfigValue = `ssh -i "${normalizedPathForConfig}" -F /dev/null -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
        const { execFileSync } = require('child_process');
        execFileSync('git', [
          'config',
          'core.sshCommand',
          sshConfigValue
        ], { cwd: repoPath });
        await this.configManager.setRepoConfig(repoPath, sshKeyPath, currentUrl);
        console.log(chalk.green('✅ SSH key configuration updated.'));
      } else {
        console.log(chalk.green('✅ Repository is already configured for HTTPS. No fix needed.'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error fixing repository: ${error}`));
    }
  }
}
