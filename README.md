# Git SSH Key Manager (gitsm)

![Git](https://img.shields.io/badge/git-F05032?style=flat&logo=git&logoColor=white)
![gitsm](https://img.shields.io/badge/gitsm-v2.0.1-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![node](https://img.shields.io/badge/node-%3E=16.x-brightgreen?logo=node.js)

**🔐 SSH Key Management for Git, Simplified.**

`gitsm` is a powerful Git wrapper that automatically configures different SSH keys for different repositories. No more editing `~/.ssh/config`, just clone and go.

--- 

## Overview

- Do you use **multiple GitHub or GitLab accounts**?
- Do you need to use **different SSH keys for different projects**?
- Are you tired of editing `.git/config` or `~/.ssh/config` by hand?
- Do you want a **cross-platform** solution that "just works" on Windows, macOS, and Linux?

**gitsm** is the solution you need.

--- 

## Demo

![GITSM Demo](https://ucarecdn.com/0ca63af1-9c8f-4ec9-8889-86908d01886d/gitsm.gif)

*Demonstration: Repository cloning with interactive SSH key selection and automatic configuration.*

--- 

## Features

- **Auto-discovery**: Automatic detection of SSH keys in your `~/.ssh` directory
- **Per-repository Configuration**: Each repository can use a different SSH key
- **Smart Cloning**: Interactive SSH key selection during clone operations
- **Repository Management**: Commands to fix, convert, and manage repositories
- **Key Management**: List and validate SSH keys across your system
- **Security**: Built-in SSH key testing and validation
- **State Management**: Persistent configuration storage
- **Branch Operations**: Safe branch switching with state preservation
- **Cross-platform**: Full support for Windows, macOS, and Linux

--- 

## Installation

```bash
npm install -g gitsm
```

---

## Getting Started

### 1. Clone a Repository

Run `gitsm clone` instead of `git clone`.

```bash
gitsm clone git@github.com:username/repo.git
```

`gitsm` will prompt you to select an SSH key from your `~/.ssh` directory. It then clones the repository and automatically configures it to use that key for all future Git operations (`pull`, `push`, `fetch`, etc.).

### 2. Use Git as Usual

Once cloned, you can use standard Git commands inside the repository.

```bash
cd repo
git pull
git push
```

### 3. List Managed Repositories

See all repositories configured with `gitsm`.

```bash
gitsm list repos
```

### 4. Fix a Repository's SSH Config

If you move your SSH keys or encounter a path error, `gitsm fix` can repair the configuration.

```bash
gitsm fix /path/to/your/repo
```

--- 

## Usage

### Command Reference

| Command | Description | Options | Example |
|---------|-------------|----------|---------|
| `clone` | Clone a repository with SSH key selection | `--dir <directory>`: Target directory | `gitsm clone git@github.com:user/repo.git` |
| `switch` | Safely switch branches with stash handling | `--force`: Force switch with changes<br>`--no-pull`: Skip pulling updates<br>`--create`: Create new branch | `gitsm switch feature-branch` |
| `convert` | Convert existing repo to use gitsm | `[repoPath]`: Path to repository<br>(defaults to current directory) | `gitsm convert ~/projects/myrepo` |
| `list keys` | Show available SSH keys | None | `gitsm list keys` |
| `list repos` | Show gitsm-managed repositories | None | `gitsm list repos` |
| `fix` | Repair SSH configuration | `<repoPath>`: Repository path | `gitsm fix ~/projects/myrepo` |
| `upgrade` | Update gitsm to latest version | None | `gitsm upgrade` |
| `help` | Show command help | `[command]`: Show help for specific command | `gitsm help switch` |



--- 

## Prerequisites

- **Node.js**: Version 16.x or higher.
- **Git**: Must be installed and available in your system's PATH.
- **SSH Directory**: Must have a `.ssh` directory in your home folder:
  - Unix/Linux/macOS: `~/.ssh`
  - Windows: `C:\Users\YourUsername\.ssh`
- **SSH Keys**: SSH keys must be in the root of your `.ssh` directory (not in subdirectories)
  - Example: `~/.ssh/id_rsa`, `~/.ssh/id_ed25519`
  - Public keys must have `.pub` extension: `id_rsa.pub`, `id_ed25519.pub`

--- 

## License

This project is licensed under the **[MIT License](https://github.com/sumitLKpatel/gitsm?tab=MIT-1-ov-file)**.

--- 

## Contributing

Contributions are welcome! Please feel free to [open an issue](https://github.com/sumitLKpatel/gitsm/issues) or submit a pull request. Whether it's a bug report, feature request, or documentation improvement, all contributions are appreciated.

**Made with ❤️ for developers who juggle multiple SSH keys.**