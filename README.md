# wifviewer

VS Code extension to view weaving draft files (`.wif`): threading, tie-up, treadling/liftplan and a colored drawdown.

The Marketplace page text lives in [`docs/MARKETPLACE.md`](docs/MARKETPLACE.md). This file is for developers.

## Develop

```sh
npm install
npm test          # parser unit tests
```

Press **F5** in VS Code to launch an Extension Development Host, then open `samples/twill.wif`.

## Install locally

Build a `.vsix` and install it:

```sh
npm run package                        # creates wif-viewer-<version>.vsix
code --install-extension wif-viewer-0.1.0.vsix
```

Or in VS Code: Extensions view → `…` menu → **Install from VSIX…**.

`package.json` needs a valid `publisher` to package (any ID works locally).

Uninstall: `code --uninstall-extension <publisher>.wif-viewer`.

## Publish

```sh
npx vsce login <publisher>   # needs an Azure DevOps PAT (Marketplace → Manage)
npm run publish
```

## Layout

- `src/wif.js` – WIF parser and drawdown logic
- `src/extension.js` – custom editor provider
- `media/` – webview script and styles
- `samples/` – example drafts

## Pre-commit

Hooks (whitespace, JSON/YAML checks, `npm test`) are set in `.pre-commit-config.yaml`:

```sh
pip install pre-commit
pre-commit install
```

## CI / Release

- `.github/workflows/ci.yml` runs tests and a package smoke test on pushes to `main` and on PRs.
- `.github/workflows/release.yml` runs on tags `v*`: tests, packages, publishes to the Marketplace and attaches the `.vsix` to a GitHub release.

One-time setup: add the Marketplace PAT as repo secret `VSCE_PAT` (Settings → Secrets and variables → Actions).

To release: bump `version` in `package.json`, update `CHANGELOG.md`, then

```sh
git tag v0.1.1 && git push origin v0.1.1
```
