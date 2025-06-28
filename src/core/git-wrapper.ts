import { execSync, spawn } from 'child_process';
import * as path from 'path';
import chalk from 'chalk';

export class GitWrapper {
  async clone(repoUrl: string, targetDir: string, sshKeyPath: string): Promise<void> {
    try {
      const sshCommand = `ssh -i "${sshKeyPath}" -F /dev/null -o IdentitiesOnly=yes -o StrictHostKeyChecking=no`;
      
      // Execute git clone and show native Git output
      execSync(`git clone --config core.sshCommand="${sshCommand}" "${repoUrl}" "${targetDir}"`, {
        stdio: 'inherit', // This shows Git's native progress and messages
        env: { ...process.env, GIT_SSH_COMMAND: sshCommand }
      });
      
    } catch (error) {
      throw new Error(`Git clone failed: ${error}`);
    }
  }

  async configureRepo(repoPath: string, sshKeyPath: string): Promise<void> {
    try {
      const sshCommand = `ssh -i "${sshKeyPath}" -F /dev/null -o IdentitiesOnly=yes`;
      
      execSync(`git config core.sshCommand "${sshCommand}"`, {
        cwd: repoPath,
        stdio: 'pipe'
      });
      
    } catch (error) {
      throw new Error(`Failed to configure repository: ${error}`);
    }
  }

  extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }

  isGitRepository(dir: string): boolean {
    try {
      execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}