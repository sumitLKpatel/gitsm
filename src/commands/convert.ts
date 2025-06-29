import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { SSHManager } from '../core/ssh-manager';
import { GitWrapper } from '../core/git-wrapper';
import { RepoConfigManager } from '../core/repo-config';
import { PromptUtils } from '../utils/prompt-utils';

export class ConvertCommand {
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

    async execute(repoPath: string = '.'): Promise<void> {
        try {
            const fullRepoPath = path.resolve(repoPath);

            // Verify it's a git repository
            if (!this.gitWrapper.isGitRepository(fullRepoPath)) {
                console.error(chalk.red('❌ Not a git repository'));
                return;
            }

            // Get current remote URL
            const remoteUrl = await this.gitWrapper.getRemoteUrl(fullRepoPath);
            if (!remoteUrl) {
                console.error(chalk.red('❌ No remote URL found'));
                return;
            }

            console.log(chalk.blue(`Converting repository: ${fullRepoPath}`));
            console.log(chalk.gray(`Current remote URL: ${remoteUrl}`));

            // Handle HTTPS to SSH conversion if needed
            if (!remoteUrl.startsWith('git@')) {
                const switchToSSH = await this.promptUtils.confirmAction(
                    'Repository is using HTTPS. Would you like to switch to SSH?'
                );

                if (switchToSSH) {
                    const sshUrl = this.gitWrapper.convertToHTTPS(remoteUrl);
                    await this.gitWrapper.setRemoteUrl(fullRepoPath, sshUrl);
                    console.log(chalk.green('✅ Switched to SSH remote URL'));
                } else {
                    console.log(chalk.yellow('Keeping HTTPS remote URL'));
                    return;
                }
            }

            // Discover and select SSH key
            const sshKeys = await this.sshManager.discoverSSHKeys();
            
            if (sshKeys.length === 0) {
                console.log(chalk.yellow('⚠️  No SSH keys found'));
                return;
            }

            console.log(chalk.blue('🔑 Select SSH key for this repository:'));
            const selectedKey = await this.promptUtils.selectSSHKey(sshKeys);

            // Test SSH connection
            console.log(chalk.blue('🔐 Testing SSH connection...'));
            const testResult = await this.sshManager.testSSHKey(selectedKey.path, remoteUrl);
            
            if (!testResult.success) {
                console.log(chalk.yellow(`⚠️  SSH test failed: ${testResult.error}`));
                const tryAnyway = await this.promptUtils.confirmAction(
                    'SSH test failed. Configure anyway?'
                );
                if (!tryAnyway) {
                    return;
                }
            } else {
                console.log(chalk.green('✅ SSH connection successful'));
            }

            // Configure repository
            await this.gitWrapper.configureRepo(fullRepoPath, selectedKey.path);
            await this.configManager.setRepoConfig(fullRepoPath, selectedKey.path, remoteUrl);

            console.log(chalk.green(`✅ Repository successfully converted to use gitsm with SSH key: ${selectedKey.relativePath}`));

        } catch (error) {
            console.error(chalk.red(`❌ Conversion failed: ${error}`));
            process.exit(1);
        }
    }
}
