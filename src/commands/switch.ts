import { execSync } from 'child_process';
import chalk from 'chalk';

interface SwitchOptions {
  force?: boolean;
  noPull?: boolean;
  createBranch?: boolean;
}

export class SwitchCommand {
  async execute(targetBranch: string, options: SwitchOptions = {}): Promise<void> {
    try {
      // Get current branch name
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      
      if (currentBranch === targetBranch) {
        console.log(chalk.yellow(`Already on branch '${targetBranch}'`));
        if (!options.noPull) {
          console.log(chalk.blue('⬇️  Pulling latest changes...'));
          execSync('git pull', { stdio: 'inherit' });
        }
        return;
      }

      // Check if target branch exists
      const branchExists = this.branchExists(targetBranch);
      if (!branchExists && !options.createBranch) {
        console.error(chalk.red(`Branch '${targetBranch}' doesn't exist.`));
        console.log(chalk.gray('Tip: Use --create or -b to create a new branch'));
        process.exit(1);
      }

      // Show changes if any
      const hasChanges = this.hasUncommittedChanges();
      if (hasChanges) {
        console.log(chalk.yellow('\nUncommitted changes found:'));
        execSync('git status --short', { stdio: 'inherit' });
        
        if (!options.force) {
          console.log(chalk.blue('\nChanges will be stashed. Summary:'));
          execSync('git diff --stat', { stdio: 'inherit' });
        }
      }
      
      let stashId = '';
      if (hasChanges) {
        console.log(chalk.blue('📦 Stashing current changes...'));
        // Create stash and get its ID
        const stashOutput = execSync('git stash push -m "Auto-stash before switching to ' + targetBranch + '"', { encoding: 'utf8' });
        stashId = this.getStashId(stashOutput);
        console.log(chalk.gray(`Stash created: ${stashId}`));
      }

      // Create or switch to branch
      if (!branchExists && options.createBranch) {
        console.log(chalk.blue(`🔄 Creating and switching to new branch '${targetBranch}'...`));
        execSync(`git checkout -b ${targetBranch}`, { stdio: 'inherit' });
      } else {
        console.log(chalk.blue(`🔄 Switching to ${targetBranch}...`));
        execSync(`git checkout ${targetBranch}`, { stdio: 'inherit' });
      }

      // Pull latest changes unless --no-pull is specified
      if (!options.noPull && branchExists) {
        console.log(chalk.blue('⬇️  Pulling latest changes...'));
        try {
          execSync('git pull', { stdio: 'inherit' });
        } catch (error) {
          console.log(chalk.yellow('⚠️  Pull failed. You might need to set up tracking or handle merge conflicts.'));
        }
      }

      if (hasChanges && stashId) {
        try {
          // Try to apply stashed changes using apply (keeps the stash)
          console.log(chalk.blue('📦 Applying stashed changes...'));
          execSync('git stash apply ' + stashId, { stdio: 'inherit' });
          console.log(chalk.green('✅ Successfully applied stashed changes'));
          
          // Ask user if they want to drop the stash
          const keepStash = this.hasConflicts();
          if (!keepStash) {
            console.log(chalk.blue('🗑️  Removing successful stash...'));
            execSync('git stash drop ' + stashId, { stdio: 'inherit' });
          } else {
            console.log(chalk.yellow('⚠️  Changes applied but there might be conflicts.'));
            console.log(chalk.yellow(`Your changes are preserved in stash: ${stashId}`));
            console.log(chalk.gray('After resolving conflicts, you can remove the stash with:'));
            console.log(chalk.gray(`git stash drop ${stashId}`));
          }
        } catch (error) {
          console.log(chalk.yellow('⚠️  There were conflicts while applying your changes.'));
          console.log(chalk.yellow(`Your changes are safe in stash: ${stashId}`));
          console.log(chalk.gray('To recover:'));
          console.log(chalk.gray('1. Resolve conflicts manually'));
          console.log(chalk.gray(`2. Run: git stash apply ${stashId}`));
          console.log(chalk.gray('3. After successful apply and conflict resolution:'));
          console.log(chalk.gray(`   git stash drop ${stashId}`));
          return;
        }
      }

      console.log(chalk.green(`✅ Successfully switched to ${targetBranch} and pulled latest changes`));

    } catch (error: any) {
      if (error.message.includes('Please commit your changes or stash them')) {
        console.error(chalk.red('❌ You have conflicting changes that cannot be stashed automatically.'));
        console.error(chalk.yellow('Please commit or stash your changes manually before switching branches.'));
      } else {
        console.error(chalk.red(`❌ Failed to switch branch: ${error.message}`));
      }
      process.exit(1);
    }
  }

  private getStashId(stashOutput: string): string {
    // Example output: "Saved working directory and index state On branch-name: Auto-stash..."
    const match = stashOutput.match(/Saved working directory.*state\s+(.*?):/);
    return match ? match[1] : 'stash@{0}';
  }

  private hasConflicts(): boolean {
    try {
      // Check both merge conflicts and stash conflicts
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const lines = status.split('\n');
      return lines.some(line => 
        line.startsWith('UU') || // Merge conflicts
        line.startsWith('AA') || // Both added
        line.startsWith('DD')    // Both deleted
      );
    } catch {
      return false;
    }
  }

  private hasUncommittedChanges(): boolean {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      return status.length > 0;
    } catch {
      return false;
    }
  }

  private branchExists(branch: string): boolean {
    try {
      execSync(`git rev-parse --verify ${branch}`, { stdio: 'ignore' });
      return true;
    } catch {
      try {
        execSync(`git rev-parse --verify origin/${branch}`, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  }

  private async getStashList(): Promise<string[]> {
    try {
      const output = execSync('git stash list', { encoding: 'utf8' });
      return output.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }
}
