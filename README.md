# Git SSH Key Manager (gitsm)

![Git](https://img.shields.io/badge/git-F05032?style=flat&logo=git&logoColor=white)
![gitsm](https://img.shields.io/badge/gitsm-v1.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![node](https://img.shields.io/badge/node-%3E=18.x-brightgreen?logo=node.js)

**🔐 SSH Key Management for Git, Simplified.**

`gitsm` is a powerful Git wrapper that automatically configures different SSH keys for different repositories. No more editing `~/.ssh/config`, just clone and go.

--- 

## 🚩 Why gitsm?

- Do you use **multiple GitHub or GitLab accounts**?
- Do you need to use **different SSH keys for different projects**?
- Are you tired of editing `.git/config` or `~/.ssh/config` by hand?
- Do you want a **cross-platform** solution that "just works" on Windows, macOS, and Linux?

**gitsm** is for you!

--- 

## 👀 See It In Action

![GITSM Demo](assets/gitsm.gif)

*In this demo: Clone a repository, select an SSH key interactively, and see automatic configuration in action.*

--- 

## ✨ Features

- 🔍 **Auto-discovery** of SSH keys in your `~/.ssh` directory.
- 🎯 **Per-repository SSH key configuration**—each repo can use a different key.
- 🚀 **Smart cloning** with an interactive SSH key selection prompt.
- 🛠️ **`fix` command** to repair broken or outdated SSH configurations.
- 📋 **Repository listing** with associated SSH key information.
- 🔐 **SSH key testing** to verify connectivity before use.
- 💾 **Persistent configuration** that remembers your choices.
- 🪟 **Full cross-platform support**: Windows, macOS, and Linux.

--- 

## 📦 Installation

```bash
npm install -g gitsm
```

---

## 🚀 Quick Start

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

## 📖 Usage

### Commands

- `clone <repo-url> [options]`
  - Clones a Git repository and prompts for SSH key selection.
  - `--dir <directory>`: Specify a target directory.

- `list keys`
  - Lists all available SSH keys found in `~/.ssh`.

- `list repos`
  - Lists all repositories managed by `gitsm`.

- `fix <repoPath>`
  - Repairs the SSH key configuration for a specific repository.

- `help`
  - Shows help and usage examples.

--- 

## 🛠️ Prerequisites

- **Node.js**: Version 18.x or higher.
- **Git**: Must be installed and available in your system's PATH.
- **SSH Keys**: You should have already generated SSH keys and added them to your Git provider (GitHub, GitLab, etc.).

--- 

## 🔍 How It Works

`gitsm` acts as a wrapper around Git. When you clone a repository, it:
1.  **Discovers SSH Keys**: Scans your `~/.ssh` directory for private keys.
2.  **Prompts for Selection**: Asks you to choose which key to associate with the repository.
3.  **Configures Git**: Modifies the repository's local `.git/config` to set the `core.sshCommand` to point to the selected key.
4.  **Delegates to Git**: All other commands are passed directly to Git, so your workflow remains unchanged.

This approach avoids global configuration changes and provides fine-grained, per-repository control.

--- 

## 🐛 Troubleshooting

### SSH Key Path Errors on Windows

If you encounter an error like `Warning: Identity file C:Users... not accessible: No such file or directory`, it often means the path in your Git configuration is malformed.

**Solution:**
Run the `fix` command on the repository path.
```bash
gitsm fix C:\Users\YourUser\path\to\repo
```
This command automatically corrects the path to use forward slashes (`/`) and ensures it is properly quoted, which is required for Git on Windows.

### "Permission Denied (publickey)"

This error means the SSH key you selected is not authorized for the repository.

**Solutions:**
1.  **Verify the Key**: Ensure you have added the public key (e.g., `id_ed25519.pub`) to your GitHub/GitLab account.
2.  **Select the Correct Key**: Run `gitsm fix` and choose the correct key for the repository.

--- 

## 📄 License

This project is licensed under the **[MIT License](https://github.com/sumitLKpatel/gitsm?tab=MIT-1-ov-file)**.

--- 

## 🤝 Contributing

Contributions are welcome! Please feel free to [open an issue](https://github.com/sumitLKpatel/gitsm/issues) or submit a pull request. Whether it's a bug report, feature request, or documentation improvement, all contributions are appreciated.

**Made with ❤️ for developers who juggle multiple SSH keys.**