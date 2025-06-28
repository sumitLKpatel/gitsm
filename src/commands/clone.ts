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

  async execute(repoUrl: string, options: { ssh?: boolean; dir?: string }): Promise<void> {
    try {
      // Discover available SSH keys
      const sshKeys = await this.sshManager.discoverSSHKeys();
      
      if (sshKeys.length === 0) {
        console.error('No SSH keys found in ~/.ssh directory');
        console.log('Generate an SSH key first: ssh-keygen -t ed25519 -C "your_email@example.com"');
        process.exit(1);
      }

      // Interactive SSH key selection (clean - just names)
      const selectedKey = await this.promptUtils.selectSSHKey(sshKeys);

      // Determine target directory
      const repoName = this.gitWrapper.extractRepoName(repoUrl);
      const targetDir = options.dir || repoName;
      const fullTargetPath = path.resolve(targetDir);

      // Check if directory already exists
      if (await fs.pathExists(fullTargetPath)) {
        console.error(`fatal: destination path '${targetDir}' already exists and is not an empty directory.`);
        process.exit(1);
      }

      // Clone repository (shows native Git messages)
      await this.gitWrapper.clone(repoUrl, fullTargetPath, selectedKey.path);

      // Configure repository silently
      await this.gitWrapper.configureRepo(fullTargetPath, selectedKey.path);

      // Save configuration silently
      await this.configManager.setRepoConfig(fullTargetPath, selectedKey.path, repoUrl);

      // Simple success message like Git
      console.log(`Repository configured to use SSH key: ${selectedKey.name}`);

    } catch (error) {
      console.error(`gitsm: ${error}`);
      process.exit(1);
    }
  }
}