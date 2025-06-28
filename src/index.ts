#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { CloneCommand } from './commands/clone';
import { ListCommand } from './commands/list';
import { FixCommand } from './commands/fix';

const program = new Command();

program
  .name('gitsm')
  .description('Git SSH Manager - Seamless SSH key management for repository')
  .version('1.0.30', '-v, --version', 'Show version information');

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

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(chalk.blue('🚀 Git SSH Manager (GITSM)'));
    console.log(chalk.gray('Seamless SSH key management per repository\n'));
    
    console.log(chalk.yellow('📖 Usage Examples:'));
    console.log('  gitsm clone git@github.com:user/repo.git');
    console.log('  gitsm clone git@github.com:user/repo.git -d my-project');
    console.log('  gitsm list keys');
    console.log('  gitsm list repos\n');
    
    program.help();
  });


// Default action
program.action(() => {
  console.log(chalk.blue('🚀 Git SSH Manager'));
  console.log(chalk.gray('Run "gitsm help" for usage information'));
});

program.parse();