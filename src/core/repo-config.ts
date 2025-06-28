import * as fs from 'fs-extra';
import * as path from 'path';
import { RepoConfig, GSMConfig } from '../types';

export class RepoConfigManager {
  private configPath: string;

  constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    this.configPath = path.join(homeDir, '.gitsm', 'config.json');
  }

  async ensureConfigDir(): Promise<void> {
    await fs.ensureDir(path.dirname(this.configPath));
  }

  async loadConfig(): Promise<GSMConfig> {
    await this.ensureConfigDir();
    
    if (await fs.pathExists(this.configPath)) {
      return await fs.readJson(this.configPath);
    }

    const defaultConfig: GSMConfig = {
      repositories: {},
      defaultSSHPath: path.join(process.env.HOME || '', '.ssh')
    };

    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  async saveConfig(config: GSMConfig): Promise<void> {
    await this.ensureConfigDir();
    await fs.writeJson(this.configPath, config, { spaces: 2 });
  }

  async setRepoConfig(repoPath: string, sshKeyPath: string, remoteUrl: string): Promise<void> {
    const config = await this.loadConfig();
    
    config.repositories[repoPath] = {
      repoPath,
      sshKeyPath,
      remoteUrl,
      createdAt: new Date()
    };

    await this.saveConfig(config);
    await this.setupRepoGitConfig(repoPath, sshKeyPath);
  }

  private async setupRepoGitConfig(repoPath: string, sshKeyPath: string): Promise<void> {
    const gitConfigPath = path.join(repoPath, '.git', 'config');
    
    if (await fs.pathExists(gitConfigPath)) {
      // Create a custom git wrapper script for this repo
      const wrapperScript = await this.createGitWrapper(repoPath, sshKeyPath);
      
      // Set git config to use our wrapper
      const { execSync } = require('child_process');
      execSync(`git config core.sshCommand "ssh -i ${sshKeyPath} -F /dev/null -o IdentitiesOnly=yes"`, {
        cwd: repoPath
      });
    }
  }

  private async createGitWrapper(repoPath: string, sshKeyPath: string): Promise<string> {
    const wrapperDir = path.join(repoPath, '.git', 'gitsm');
    await fs.ensureDir(wrapperDir);
    
    const wrapperPath = path.join(wrapperDir, 'ssh-wrapper.sh');
    const wrapperContent = `#!/bin/bash
ssh -i "${sshKeyPath}" -F /dev/null -o IdentitiesOnly=yes "$@"
`;

    await fs.writeFile(wrapperPath, wrapperContent);
    await fs.chmod(wrapperPath, '755');
    
    return wrapperPath;
  }
}