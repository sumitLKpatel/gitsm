import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { SSHManager } from '../core/ssh-manager';
import { GitWrapper } from '../core/git-wrapper';
import { RepoConfigManager } from '../core/repo-config';
import { PromptUtils } from '../utils/prompt-utils';

interface ConversionResult {
    success: boolean;
    error?: string;
}

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

    private convertHttpsToSsh(httpsUrl: string): string {
        try {
            // Convert https://github.com/user/repo.git to git@github.com:user/repo.git
            const url = new URL(httpsUrl);
            const pathParts = url.pathname.split('/');
            const user = pathParts[1];
            const repo = pathParts[2].replace(/\.git$/, ''); // Remove .git if present
            return `git@${url.hostname}:${user}/${repo}.git`;
        } catch (error) {
            throw new Error(`Invalid HTTPS URL: ${httpsUrl}`);
        }
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

            // Discover available SSH keys first
            const sshKeys = await this.sshManager.discoverSSHKeys();
            if (sshKeys.length === 0) {
                console.log(chalk.red('❌ No SSH keys found in ~/.ssh directory'));
                console.log(chalk.gray('Please generate an SSH key first and add it to your Git provider'));
                console.log(chalk.gray('You can use: ssh-keygen -t ed25519 -C "your@email.com"'));
                return;
            }

            // Handle URL conversion if needed
            let targetUrl = remoteUrl;
            let urlChanged = false;

            if (remoteUrl.startsWith('https://')) {
                const switchToSSH = await this.promptUtils.confirmAction(
                    'Repository is using HTTPS. Would you like to switch to SSH?'
                );

                if (switchToSSH) {
                    try {
                        targetUrl = this.convertHttpsToSsh(remoteUrl);
                        console.log(chalk.blue(`Will convert to SSH URL: ${targetUrl}`));
                        urlChanged = true;
                    } catch (error) {
                        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
                        return;
                    }
                } else {
                    console.log(chalk.yellow('⚠️ Keeping HTTPS configuration'));
                    console.log(chalk.gray('Note: HTTPS authentication might require a Personal Access Token'));
                    return;
                }
            }

            // Select SSH key
            console.log(chalk.blue('\n🔑 Select SSH key to use with this repository:'));
            const selectedKey = await this.promptUtils.selectSSHKey(sshKeys);
            
            // Test SSH connection before making any changes
            console.log(chalk.blue('\n🔐 Testing SSH connection...'));
            const testResult = await this.sshManager.testSSHKey(selectedKey.path, targetUrl);
            
            if (!testResult.success) {
                console.log(chalk.red('❌ SSH key test failed'));
                console.log(chalk.yellow('This might mean:'));
                console.log(chalk.gray('1. The SSH key is not added to your Git provider'));
                console.log(chalk.gray('2. You don\'t have access to this repository'));
                console.log(chalk.gray('3. The repository URL is incorrect'));
                console.log(chalk.yellow('\nError details:', testResult.error));

                const proceedAnyway = await this.promptUtils.confirmAction(
                    'Would you like to proceed with the configuration anyway? (Not recommended)'
                );

                if (!proceedAnyway) {
                    console.log(chalk.gray('Aborting. Please fix the SSH access issues and try again.'));
                    return;
                }

                console.log(chalk.yellow('⚠️ Proceeding with configuration despite SSH test failure'));
            } else {
                console.log(chalk.green('✅ SSH connection test successful'));
            }

            // Update configuration
            console.log(chalk.blue('\n📝 Updating repository configuration...'));

            // Update remote URL if it changed
            if (urlChanged) {
                await this.gitWrapper.setRemoteUrl(fullRepoPath, targetUrl);
                console.log(chalk.green('✅ Updated remote URL to use SSH'));
            }

            // Configure repository to use the selected SSH key
            await this.gitWrapper.configureRepo(fullRepoPath, selectedKey.path);
            await this.configManager.setRepoConfig(fullRepoPath, selectedKey.path, targetUrl);

            console.log(chalk.green(`\n✅ Repository successfully configured to use gitsm with SSH key: ${selectedKey.relativePath}`));
            console.log(chalk.gray('You can now use gitsm commands with this repository'));

        } catch (error) {
            console.error(chalk.red(`\n❌ Conversion failed: ${error instanceof Error ? error.message : String(error)}`));
            process.exit(1);
        }
    }
}
