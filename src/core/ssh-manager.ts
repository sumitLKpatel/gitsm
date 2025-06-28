import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { SSHKey } from '../types';
import chalk from 'chalk';

export class SSHManager {
  private sshDir: string;

  constructor() {
    this.sshDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.ssh');
  }

  async discoverSSHKeys(): Promise<SSHKey[]> {
    const keys: SSHKey[] = [];
    
    try {
      const files = await fs.readdir(this.sshDir);
      const keyFiles = files.filter(file => 
        !file.endsWith('.pub') && 
        !file.includes('known_hosts') &&
        !file.includes('config') &&
        !file.includes('authorized_keys')
      );

      for (const keyFile of keyFiles) {
        const keyPath = path.join(this.sshDir, keyFile);
        const pubKeyPath = `${keyPath}.pub`;
        
        // Check if both private and public key exist
        if (await fs.pathExists(keyPath) && await fs.pathExists(pubKeyPath)) {
          try {
            const keyType = await this.getKeyType(keyPath);
            const fingerprint = await this.getKeyFingerprint(pubKeyPath);
            
            keys.push({
              name: keyFile,
              path: keyPath,
              publicKeyPath: pubKeyPath,
              fingerprint,
              type: keyType
            });
          } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not read key: ${keyFile}`));
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to discover SSH keys: ${error}`);
    }

    return keys;
  }

  private async getKeyType(keyPath: string): Promise<'rsa' | 'ed25519' | 'ecdsa' | 'dsa'> {
    try {
      const keyContent = await fs.readFile(keyPath, 'utf8');
      if (keyContent.includes('BEGIN OPENSSH PRIVATE KEY')) {
        // Parse OpenSSH format
        if (keyContent.includes('ssh-ed25519')) return 'ed25519';
        if (keyContent.includes('ssh-rsa')) return 'rsa';
        if (keyContent.includes('ecdsa')) return 'ecdsa';
      }
      // Default fallback
      return 'rsa';
    } catch {
      return 'rsa';
    }
  }

  private async getKeyFingerprint(pubKeyPath: string): Promise<string> {
    try {
      const result = execSync(`ssh-keygen -lf "${pubKeyPath}"`, { encoding: 'utf8' });
      return result.split(' ')[1] || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  async testSSHKey(keyPath: string, host: string = 'github.com'): Promise<boolean> {
    try {
      execSync(`ssh -i "${keyPath}" -T git@${host}`, { 
        stdio: 'pipe',
        timeout: 10000 
      });
      return true;
    } catch {
      return false;
    }
  }
}