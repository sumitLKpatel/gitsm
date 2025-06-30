#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { CloneCommand } from './commands/clone';
import { ListCommand } from './commands/list';
import { FixCommand } from './commands/fix';
import { ConvertCommand } from './commands/convert';

const program = new Command();

program
  .name('gitsm')
  .description('Git SSH Key Manager - Seamless SSH key management for repository')
  .version('2.0.0', '-v, --version', 'Show version information');

// Clone command
program
  .command('clone <repository>')
  .description('Clone a repository with SSH key selection')
  .option('--ssh', 'Force SSH clone (default behavior)')
  .option('--https', 'Force HTTPS clone (fallback)')
  .option('-d, --dir <directory>', 'Target directory name')
  .action(async (repository: string, options) => {
    const cloneCmd = new CloneCommand();
    await cloneCmd.execute(repository, options);
  });

// List commands
const listCmd = program
  .command('list')
  .description('List SSH keys or configured repositories');

listCmd
  .command('keys')
  .description('List available SSH keys')
  .action(async () => {
    const listCommand = new ListCommand();
    await listCommand.listKeys();
  });

listCmd
  .command('repos')
  .description('List configured repositories')
  .action(async () => {
    const listCommand = new ListCommand();
    await listCommand.listRepos();
  });

// Register fix command
program
  .command('fix <repoPath>')
  .description('Fix SSH key configuration for a repository')
  .action(async (repoPath: string) => {
    if (!repoPath) {
      console.log(chalk.red('Please provide the path to the repository.'));
      return;
    }
    const fixCmd = new FixCommand();
    await fixCmd.execute(repoPath);
  });

// Add convert command
program
  .command('convert [repoPath]')
  .description('Convert an existing repository to use gitsm')
  .action(async (repoPath?: string) => {
    const convertCmd = new ConvertCommand();
    await convertCmd.execute(repoPath);
  });

// Add upgrade command
program
  .command('upgrade')
  .description('Check for updates and upgrade gitsm to the latest version')
  .action(async () => {
    console.log(chalk.blue('🔍 Checking for updates...'));
    
    const { execSync } = require('child_process');
    try {
      // Get current version from npm registry
      const latestVersion = execSync('npm show gitsm version', { encoding: 'utf8' }).trim();
      const currentVersion = process.env.npm_package_version || '2.0.0'; // Fallback to a default version if not set
      
      if (latestVersion === currentVersion) {
        console.log(chalk.green('✓ You are already using the latest version:', currentVersion));
      } else {
        console.log(chalk.yellow(`New version available: ${latestVersion} (current: ${currentVersion})`));
        console.log(chalk.blue('\nUpgrading gitsm...'));
        
        try {
          execSync('npm install -g gitsm@latest', { stdio: 'inherit' });
          console.log(chalk.green('\n✓ Successfully upgraded to version', latestVersion));
          console.log(chalk.gray('Restart your terminal to use the new version.'));
        } catch (error: any) {
          console.log(chalk.red('\n✕ Upgrade failed. Try running manually:'));
          console.log(chalk.gray('  npm install -g gitsm@latest'));
          if (error?.message?.includes('EACCES')) {
            console.log(chalk.yellow('\nTip: You might need to use sudo on Linux/macOS:'));
            console.log(chalk.gray('  sudo npm install -g gitsm@latest'));
          }
        }
      }
    } catch (error) {
      console.log(chalk.red('✕ Failed to check for updates.'));
      console.log(chalk.yellow('\nTo upgrade manually, run:'));
      console.log(chalk.gray('  npm install -g gitsm@latest'));
    }
  });

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(chalk.blue('🚀 Git SSH Key Manager (GITSM)'));
    console.log(chalk.gray('Seamless SSH key management per repository\n'));
    
    console.log(chalk.yellow('📖 Usage Examples:'));
    console.log('  gitsm clone git@github.com:user/repo.git');
    console.log('  gitsm clone git@github.com:user/repo.git -d my-project');
    console.log('  gitsm list keys');
    console.log('  gitsm list repos');
    console.log('  gitsm convert              # Convert current directory repository');
    console.log('  gitsm convert ./path/repo  # Convert specific repository');
    console.log('  gitsm upgrade              # Check for and install updates\n');
    
    program.help();
  });


// Default action
program.action(() => {
  console.log(chalk.blue('🚀 Git SSH Key Manager'));
  console.log(chalk.gray('Run "gitsm help" for usage information'));
});

program.parse();