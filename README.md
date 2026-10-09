# wifviewer

[![CI](https://github.com/JGalego/WIFViewer/actions/workflows/ci.yml/badge.svg)](https://github.com/JGalego/WIFViewer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%E2%89%A51.85-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![Node](https://img.shields.io/badge/node-20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white)](https://github.com/pre-commit/pre-commit)
![Warp](https://img.shields.io/badge/warp-up-2e60c8)
![Weft](https://img.shields.io/badge/weft-down-f5ecd2)
![Sheep](https://img.shields.io/badge/sheep%20harmed-0-success)
![Loom](https://img.shields.io/badge/works%20on-my%20loom-orange)
![Tangles](https://img.shields.io/badge/thread%20tangles-none%20(yet)-lightgrey)
![Tie-up](https://img.shields.io/badge/tie--up-not%20tied%20up%20at%20work-blueviolet)

VS Code extension to view weaving draft files (`.wif`): threading, tie-up, treadling/liftplan and a colored drawdown.

Markdown previews also render image links to `.wif` files as inline drafts:

```md
![2/2 twill](samples/twill.wif)
```

Open `samples/preview.md` and use **Markdown: Open Preview** to try it.

### Gotcha: Markdown Preview Enhanced

WIF images only render in VS Code's built-in **Markdown: Open Preview**. The
**Markdown Preview Enhanced** extension uses a separate rendering engine and
does not load VS Code Markdown plugins, so `.wif` links appear as source text
there.

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
code --install-extension wif-viewer-0.2.0.vsix
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
- `src/draft.js` – SVG paint of a parsed draft
- `src/markdown.js` – Markdown preview plugin (`![…](*.wif)`)
- `src/extension.js` – custom editor provider
- `syntaxes/wif.tmLanguage.json` – syntax highlighting
- `images/wif-file-*.svg` – Explorer / tab icons for `.wif` files
- `media/` – webview script and styles
- `samples/` – example drafts (`node samples/generate.js` rebuilds all but `twill.wif`)

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
git tag v0.2.0 && git push origin v0.2.0
```
