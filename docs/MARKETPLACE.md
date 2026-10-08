# WIF Viewer

View weaving draft files (`.wif`) in VS Code.

- Threading, tie-up, treadling (or liftplan)
- Colored drawdown from warp/weft colors
- Live update when you edit the text
- Hover to inspect any cell; click to highlight a thread
- Zoom slider, fit-to-window and ctrl+wheel zoom
- Export the draft as PNG or SVG
- Problems panel: out-of-range shafts/treadles, bad values, missing colors
- Syntax highlighting for WIF source

Open any `.wif` file. For text and preview side by side, click the preview icon in the editor title bar, or run **WIF: Open Text and Preview Side by Side**; the preview updates as you type. Use **WIF: Open as Text** to see the source.

## Format

Supports WIF 1.1 sections: `WEAVING`, `WARP`, `WEFT`, `COLOR TABLE`, `COLOR PALETTE`, `THREADING`, `TIEUP`, `TREADLING`, `LIFTPLAN`, `WARP COLORS`, `WEFT COLORS`.
