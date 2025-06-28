import inquirer from 'inquirer';
import { SSHKey } from '../types';
import chalk from 'chalk';

export class PromptUtils {
  async selectSSHKey(keys: SSHKey[]): Promise<SSHKey> {
    if (keys.length === 0) {
      throw new Error('No SSH keys found in ~/.ssh directory');
    }

    if (keys.length === 1) {
      console.log(chalk.blue(`Using SSH key: ${keys[0].name}`));
      return keys[0];
    }

    // Clean display - only show key names
    const choices = keys.map(key => ({
      name: key.name,
      value: key,
      short: key.name
    }));

    const { selectedKey } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedKey',
        message: 'Select SSH key:',
        choices,
        pageSize: Math.min(keys.length, 8),
        loop: false
      }
    ]);

    return selectedKey;
  }

  async confirmAction(message: string): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: true
      }
    ]);

    return confirmed;
  }

  async getTargetDirectory(defaultName: string): Promise<string> {
    const { targetDir } = await inquirer.prompt([
      {
        type: 'input',
        name: 'targetDir',
        message: '📁 Target directory:',
        default: defaultName,
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Directory name cannot be empty';
          }
          return true;
        }
      }
    ]);

    return targetDir.trim();
  }
}