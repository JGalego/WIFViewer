# WIF Viewer

View weaving draft files (`.wif`) in VS Code.

- Threading, tie-up, treadling (or liftplan)
- Colored drawdown from warp/weft colors
- Live update when you edit the text
- Hover to inspect any cell; click to highlight a thread
- Zoom slider, fit-to-window and ctrl+wheel zoom
- Export the draft as PNG or SVG
- Problems panel: out-of-range shafts/treadles, bad values, missing colors
- Syntax highlighting for WIF source (sections, keys, numbers, booleans)
- Distinctive Explorer / tab icon for `.wif` files
- Markdown preview: `![caption](draft.wif)` renders the draft inline

Open any `.wif` file. For text and preview side by side, click the preview icon in the editor title bar, or run **WIF: Open Text and Preview Side by Side**; the preview updates as you type. Use **WIF: Open as Text** to see the source.

## Gotcha: Markdown Preview Enhanced

WIF images only render in VS Code's built-in **Markdown: Open Preview**. The
**Markdown Preview Enhanced** extension uses a separate rendering engine and
does not load VS Code Markdown plugins, so `.wif` links appear as source text
there.

## Format

Supports WIF 1.1 sections: `WEAVING`, `WARP`, `WEFT`, `COLOR TABLE`, `COLOR PALETTE`, `THREADING`, `TIEUP`, `TREADLING`, `LIFTPLAN`, `WARP COLORS`, `WEFT COLORS`.
