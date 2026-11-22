# Contributing to gitsm

Thanks for helping improve Git SSH Key Manager!

## Before you start

- For bugs, open an issue with your operating system, Node.js version, gitsm version, steps to reproduce, and **redacted** output.
- For significant changes, open an issue to discuss the approach first.
- Never upload private SSH keys, authentication tokens, or unredacted SSH configuration.

## Development

```bash
git clone https://github.com/sumitLKpatel/gitsm.git
cd gitsm
npm ci
npm run build
```

The repository currently has a placeholder `npm test` script, not a real test suite. Please don't claim that tests pass until automated tests exist.

## Pull requests

1. Branch from `main`.
2. Keep changes focused, update documentation if behavior changes, and avoid breaking CLI compatibility.
3. Run `npm run build` locally.
4. Explain the motivation, user-visible behavior, and manual verification steps in your pull request.

For security-sensitive findings, avoid disclosing exploit details or credentials in a public issue; contact the maintainer privately.
