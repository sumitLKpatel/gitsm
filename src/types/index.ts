export interface SSHKey {
  name: string;
  path: string;
  publicKeyPath: string;
  fingerprint?: string;
  type: 'rsa' | 'ed25519' | 'ecdsa' | 'dsa';
}

export interface RepoConfig {
  repoPath: string;
  sshKeyPath: string;
  remoteUrl: string;
  createdAt: Date;
}

export interface GSMConfig {
  repositories: Record<string, RepoConfig>;
  defaultSSHPath: string;
}