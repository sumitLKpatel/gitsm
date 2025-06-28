# Git SSH Manager (gitsm) &nbsp; 
![Git](https://img.shields.io/badge/git-F05032?style=flat&logo=git&logoColor=white)
![gitsm](https://img.shields.io/badge/gitsm-v1.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?logo=windows&logoColor=blue)
![node](https://img.shields.io/badge/node-%3E=18.x-brightgreen?logo=node.js)



🔑 **Seamless SSH key management per Git repository**

SSH Key Management for Git, Simplified. Automatically configure different SSH keys for different repositories with our powerful Git wrapper. Eliminate manual setup and streamline your workflow.

---

## 🚩 Why gitsm?

- Do you use **multiple GitHub or GitLab accounts**?
- Do you need to use **different SSH keys for different projects**?
- Are you tired of editing `.git/config` or `~/.ssh/config` by hand?
- Do you want a **cross-platform** solution that "just works" on Windows, macOS, and Linux?

**gitsm** is for you!

---

## ✨ Features

- 🔍 **Auto-discovery** of SSH keys in your `~/.ssh` directory
- 🎯 **Per-repository SSH key configuration** (each repo can use a different key)
- 🚀 **Smart cloning** with interactive SSH key selection
- 🛠️ **Fix command** to repair broken SSH key configs
- 📋 **Repository listing** with SSH key information
- 🔐 **SSH key testing** to verify connectivity
- 💾 **Configuration persistence** - remembers your choices
- 🎨 **Beautiful CLI interface** with colors and emojis
- 🪟 **Windows, macOS, and Linux support**

---

## 📦 Installation

```bash
npm install -g gitsm
```

---

## 🚀 Quick Start

### 1. Clone a repository with SSH key selection

```bash
gitsm clone git@github.com:username/repo.git
```
- Discover all SSH keys in your `~/.ssh` directory
- Select which key to use
- Clone the repository and auto-configure it

### 2. Clone to a specific directory

```bash
gitsm clone git@github.com:username/repo.git --dir /path/to/directory
```

### 3. List all managed repositories

```bash
gitsm list repos
```

### 4. List all available SSH keys

```bash
gitsm list keys
```

### 5. Fix a repository's SSH config

If you ever see SSH path errors or change your key, run:
```bash
gitsm fix /path/to/your/repo
```
This will repair the SSH config for that repo.

---

## 📖 Usage

### Commands

- `clone <repository-url> [options]`  
  Clone a Git repository with SSH key selection.
  - `--dir <directory>`: Specify target directory
  - `--ssh`: Force SSH mode (default)
  - `--https`: Force HTTPS mode

- `list keys`  
  List all available SSH keys.

- `list repos`  
  List all repositories managed by gitsm.

- `fix <repoPath>`  
  Fix SSH key configuration for a repository.

- `help`  
  Show help and usage examples.

---

## 🛠️ Prerequisites

- **Node.js** 16.0.0 or higher
- **Git** installed and configured
- **SSH keys** generated and added to your Git provider

---

## 💡 Use Cases

- **Multiple GitHub accounts**: Use a different key for work and personal projects.
- **Different Git providers**: Use the right key for GitHub, GitLab, Bitbucket, etc.
- **Team environments**: Onboard new team members with zero SSH config hassle.

---

## 🔍 How It Works

1. **SSH Key Discovery**: Scans `~/.ssh/` for private keys
2. **Interactive Selection**: Presents a user-friendly selection menu
3. **Repository Configuration**: Sets up Git config for the selected SSH key
4. **Persistent Storage**: Saves configuration for future Git operations

---

## 🐛 Troubleshooting

### Windows: SSH path errors

If you see:
```
Warning: Identity file C:Users... not accessible: No such file or directory.
```
- Run `gitsm fix <repoPath>` to repair the config.
- Make sure your SSH key path uses **forward slashes** and is **quoted** in `.git/config`:
  ```
  sshCommand = ssh -i "C:/Users/YourUser/.ssh/id_ed25519" ...
  ```