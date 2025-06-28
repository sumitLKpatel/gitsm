# Git SSH Manager (gitsm)

🔑 **Seamless SSH key management per Git repository**

A powerful CLI tool that simplifies SSH key management for Git repositories. Automatically configure different SSH keys for different repositories without the hassle of manual configuration.

## ✨ Features

- 🔍 **Auto-discovery** of SSH keys in your `~/.ssh` directory
- 🎯 **Per-repository SSH key configuration** - each repo can use a different key
- 🚀 **Smart cloning** with interactive SSH key selection
- 📋 **Repository listing** with SSH key information
- 🔐 **SSH key testing** to verify connectivity
- 💾 **Configuration persistence** - remembers your choices
- 🎨 **Beautiful CLI interface** with colors and emojis

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g gitsm
```

### Local Installation

```bash
npm install gitsm
npx gitsm --help
```

## 🚀 Quick Start

### 1. Clone a repository with SSH key selection

```bash
gitsm clone git@github.com:username/repo.git
```

The tool will:
- Discover all SSH keys in your `~/.ssh` directory
- Let you select which key to use
- Clone the repository
- Automatically configure the repository to use the selected SSH key

### 2. Clone to a specific directory

```bash
gitsm clone git@github.com:username/repo.git --dir /path/to/directory
```

### 3. List configured repositories

```bash
gitsm list
```

Shows all repositories managed by gitsm with their configured SSH keys.

## 📖 Usage

### Commands

#### `clone <repository-url> [options]`

Clone a Git repository with SSH key selection.

**Options:**
- `--dir <directory>` - Specify target directory
- `--ssh` - Force SSH mode (default behavior)

**Example:**
```bash
gitsm clone git@github.com:myorg/private-repo.git --dir ./projects/private-repo
```

#### `list`

List all repositories managed by gitsm.

**Example:**
```bash
gitsm list
```

Output:
```
📁 Repository: /home/user/projects/repo1
🔑 SSH Key: ~/.ssh/id_ed25519_work
🌐 Remote: git@github.com:company/repo1.git

📁 Repository: /home/user/projects/repo2
🔑 SSH Key: ~/.ssh/id_rsa_personal
🌐 Remote: git@github.com:personal/repo2.git
```

### Global Options

- `--help`, `-h` - Show help
- `--version`, `-V` - Show version

## 🔧 Configuration

Git SSH Manager automatically creates and manages configuration files:

- **Repository config**: `.gitsm/config.json` in each managed repository
- **SSH keys**: Auto-discovered from `~/.ssh/` directory

### SSH Key Discovery

The tool automatically finds SSH keys with these patterns:
- `id_rsa`, `id_rsa_*`
- `id_ed25519`, `id_ed25519_*`
- `id_ecdsa`, `id_ecdsa_*`
- `id_dsa`, `id_dsa_*`

## 🛠️ Prerequisites

- **Node.js** 16.0.0 or higher
- **Git** installed and configured
- **SSH keys** generated and added to your Git provider

### Generate SSH Keys

If you don't have SSH keys yet:

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_work

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519_work

# Copy public key to clipboard (Linux/macOS)
cat ~/.ssh/id_ed25519_work.pub | pbcopy

# Copy public key to clipboard (Windows)
type ~/.ssh/id_ed25519_work.pub | clip
```

Then add the public key to your Git provider (GitHub, GitLab, Bitbucket, etc.).

## 💡 Use Cases

### Multiple GitHub Accounts

Perfect for developers who work with multiple GitHub accounts:

```bash
# Work repository
gitsm clone git@github.com:company/work-repo.git
# Select: ~/.ssh/id_ed25519_work

# Personal repository
gitsm clone git@github.com:personal/personal-repo.git
# Select: ~/.ssh/id_rsa_personal
```

### Different Git Providers

Easily manage repositories across different Git providers:

```bash
# GitHub Enterprise
gitsm clone git@github.company.com:org/repo.git

# GitLab
gitsm clone git@gitlab.com:user/repo.git

# Bitbucket
gitsm clone git@bitbucket.org:user/repo.git
```

## 🔍 How It Works

1. **SSH Key Discovery**: Scans `~/.ssh/` for private keys
2. **Interactive Selection**: Presents a user-friendly selection menu
3. **Repository Configuration**: Sets up Git configuration for the specific SSH key
4. **Persistent Storage**: Saves configuration for future Git operations

Under the hood, gitsm configures:
- `core.sshCommand` in the repository's Git config
- Custom SSH command that uses the selected private key
- Repository tracking in `.gitsm/config.json`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/username/gitsm/issues) page
2. Create a new issue with:
   - Your operating system
   - Node.js version (`node --version`)
   - Git version (`git --version`)
   - Steps to reproduce the problem

## 🚀 Roadmap

- [ ] SSH key generation from within the tool
- [ ] Bulk repository configuration
- [ ] SSH agent integration
- [ ] Configuration export/import
- [ ] Repository grouping and tagging
- [ ] SSH key rotation helpers

---

**Made with ❤️ for developers who juggle multiple SSH keys**
