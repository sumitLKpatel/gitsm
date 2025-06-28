import * as path from 'path';
import * as os from 'os';

export class PathUtils {
  /**
   * Normalize path for cross-platform compatibility
   * Converts Windows backslashes to forward slashes for Git/SSH compatibility
   */
  static normalizeForSSH(filePath: string): string {
    // First resolve the path to get the absolute path
    const absolutePath = path.resolve(filePath);
    
    if (process.platform === 'win32') {
      // On Windows, we need to be more careful with path handling
      let normalized = absolutePath.replace(/\\/g, '/');
      
      // Ensure proper Windows drive letter format for SSH
      // Some SSH implementations on Windows prefer different formats
      if (normalized.match(/^[A-Za-z]:/)) {
        // Keep the C:/ format but ensure no double slashes
        normalized = normalized.replace(/\/+/g, '/');
      }
      
      return normalized;
    } else {
      // On Unix systems (Mac, Linux), just normalize backslashes if any
      return absolutePath.replace(/\\/g, '/');
    }
  }

  /**
   * Alternative SSH path formatting for Windows compatibility
   * Uses MSYS/Cygwin style paths as fallback
   */
  static normalizeForSSHWindows(filePath: string): string {
    if (process.platform !== 'win32') {
      return this.normalizeForSSH(filePath);
    }
    
    const absolutePath = path.resolve(filePath);
    let normalized = absolutePath.replace(/\\/g, '/');
    
    // Convert C:/Users/... to /c/Users/... format (MSYS style)
    if (normalized.match(/^([A-Za-z]):/)) {
      const driveLetter = normalized.charAt(0).toLowerCase();
      normalized = `/${driveLetter}${normalized.substring(2)}`;
    }
    
    return normalized;
  }

  /**
   * Get the user's home directory in a cross-platform way
   */
  static getHomeDirectory(): string {
    return os.homedir();
  }

  /**
   * Get the SSH directory path
   */
  static getSSHDirectory(): string {
    return path.join(this.getHomeDirectory(), '.ssh');
  }

  /**
   * Escape path for shell command usage
   */
  static escapeForShell(filePath: string): string {
    // Normalize first, then add quotes if needed
    const normalized = this.normalizeForSSH(filePath);
    
    // If path contains spaces or special characters, wrap in quotes
    if (normalized.includes(' ') || normalized.includes('(') || normalized.includes(')')) {
      return `"${normalized}"`;
    }
    
    return normalized;
  }

  /**
   * Check if a path is absolute
   */
  static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Convert relative path to absolute from current working directory
   */
  static toAbsolute(filePath: string): string {
    if (this.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(process.cwd(), filePath);
  }

  /**
   * Debug method to test path normalization
   */
  static debugPath(filePath: string): void {
    console.log(`Original path: ${filePath}`);
    console.log(`Normalized path: ${PathUtils.normalizeForSSH(filePath)}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Absolute path: ${path.resolve(filePath)}`);
  }

  /**
   * Create a properly escaped SSH command for shell execution
   */
  static createSSHCommand(sshKeyPath: string, extraOptions: string[] = []): string {
    const normalizedPath = this.normalizeForSSH(sshKeyPath);
    
    // Build SSH command parts
    const sshParts = [
      'ssh',
      '-i',
      this.escapeForShell(normalizedPath),
      '-F',
      '/dev/null',
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'StrictHostKeyChecking=no',
      ...extraOptions
    ];
    
    return sshParts.join(' ');
  }

  /**
   * Create SSH command using array approach (safer for complex paths)
   */
  static createSSHCommandArray(sshKeyPath: string, extraOptions: string[] = []): string[] {
    const normalizedPath = this.normalizeForSSH(sshKeyPath);
    
    return [
      'ssh',
      '-i', normalizedPath,
      '-F', '/dev/null',
      '-o', 'IdentitiesOnly=yes',
      '-o', 'StrictHostKeyChecking=no',
      ...extraOptions
    ];
  }

  /**
   * Convert absolute SSH key path to relative path using tilde notation
   * Example: C:/Users/BAPS/.ssh/id_personal -> ~/.ssh/id_personal
   */
  static toRelativeSSHPath(absolutePath: string): string {
    const homeDir = this.getHomeDirectory();
    const sshDir = this.getSSHDirectory();
    
    // Normalize paths for comparison
    const normalizedAbsolute = path.normalize(absolutePath);
    const normalizedHome = path.normalize(homeDir);
    const normalizedSSH = path.normalize(sshDir);
    
    // If the path is in the SSH directory, use ~/.ssh/filename format
    if (normalizedAbsolute.startsWith(normalizedSSH)) {
      const relativePart = path.relative(normalizedSSH, normalizedAbsolute);
      return `~/.ssh/${relativePart}`;
    }
    
    // If the path is in the home directory, use ~/path format
    if (normalizedAbsolute.startsWith(normalizedHome)) {
      const relativePart = path.relative(normalizedHome, normalizedAbsolute);
      return `~/${relativePart.replace(/\\/g, '/')}`;
    }
    
    // If not in home directory, return as-is but normalized
    return this.normalizeForSSH(absolutePath);
  }

  /**
   * Convert relative path (with ~) back to absolute path
   */
  static fromRelativeSSHPath(relativePath: string): string {
    if (relativePath.startsWith('~/')) {
      const homeDir = this.getHomeDirectory();
      const pathWithoutTilde = relativePath.substring(2);
      return path.join(homeDir, pathWithoutTilde);
    }
    
    return relativePath;
  }
}
