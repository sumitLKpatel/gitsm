import chalk from 'chalk';
import { SSHManager } from '../core/ssh-manager';
import { RepoConfigManager } from '../core/repo-config';

export class ListCommand {
  private sshManager: SSHManager;
  private configManager: RepoConfigManager;

  constructor() {
    this.sshManager = new SSHManager();
    this.configManager = new RepoConfigManager();
  }

  async listKeys(): Promise<void> {
    try {
      console.log(chalk.blue('🔑 Available SSH Keys:'));
      console.log(chalk.gray('─'.repeat(50)));

      const keys = await this.sshManager.discoverSSHKeys();
      
      if (keys.length === 0) {
        console.log(chalk.yellow('No SSH keys found in ~/.ssh directory'));
        return;
      }

      keys.forEach((key, index) => {
        console.log(chalk.green(`${index + 1}. ${key.name}`));
        console.log(chalk.gray(`   Type: ${key.type}`));
        console.log(chalk.gray(`   Path: ${key.path}`));
        console.log(chalk.gray(`   Fingerprint: ${key.fingerprint}`));
        console.log();
      });

    } catch (error) {
      console.error(chalk.red(`❌ Error listing SSH keys: ${error}`));
    }
  }

  async listRepos(): Promise<void> {
    try {
      console.log(chalk.blue('📁 Configured Repositories:'));
      console.log(chalk.gray('─'.repeat(50)));

      const config = await this.configManager.loadConfig();
      const repos = Object.values(config.repositories);

      if (repos.length === 0) {
        console.log(chalk.yellow('No repositories configured with GITSM'));
        return;
      }

      repos.forEach((repo, index) => {
        console.log(chalk.green(`${index + 1}. ${repo.repoPath}`));
        console.log(chalk.gray(`   Remote: ${repo.remoteUrl}`));
        console.log(chalk.gray(`   SSH Key: ${repo.sshKeyPath}`));
        console.log(chalk.gray(`   Created: ${new Date(repo.createdAt).toLocaleDateString()}`));
        console.log();
      });

    } catch (error) {
      console.error(chalk.red(`❌ Error listing repositories: ${error}`));
    }
  }
}