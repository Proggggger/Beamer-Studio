# Beamer Studio

A browser-based WYSIWYG editor for LaTeX Beamer presentations. Edit slides on an
approximate canvas, tune the theme and colors, and export compilable `.tex`
source — either as a download or as copyable code.

## Requirements

- Node.js 20 or newer
- A TeX installation such as MiKTeX or TeX Live to compile exported decks

## Development

```bash
npm install
npm run dev
```

Vite prints a local URL (usually <http://localhost:5173>). The app runs entirely
in the browser; edits are autosaved to `localStorage`.

```bash
npm test        # unit tests (Vitest)
npm run typecheck
npm run build   # typecheck + production bundle in dist/
npm run preview # serve the production bundle
```

## Editing

- **Slides rail** — add title, section and content frames, reorder, duplicate or
  delete slides. Thumbnails update live.
- **Canvas** — double-click any text to edit its LaTeX source in place. Inline
  markup such as `\alert{...}`, `\textbf{...}` and `$E=mc^2$` is rendered with
  KaTeX on the canvas and exported verbatim.
- **Inspector** — edit frame titles/subtitles, list items, paragraph content,
  block tone, columns, images, code listings, math and table-of-contents blocks.
- **Design panel** — pick from 29 Beamer themes and 19 color themes, override
  the palette (structure color, title bars, background, foreground, alert),
  switch 16:9 / 4:3, change fonts and font scale, and choose bullet/block shapes
  and navigation symbols.
- **Fonts and languages** — pick a font family from the Layout panel (Latin
  Modern, TeX Gyre, Libertinus, Fira, Source Sans, DejaVu, Noto), set the beamer
  base size and choose a main language plus any additional polyglossia
  languages.
- **Undo / redo** — `Ctrl+Z` / `Ctrl+Shift+Z`.
- **Save / Open** — Save downloads a `.beamer.json` project (including embedded
  images); Open restores one. `Ctrl+S` saves, `Ctrl+E` opens the export viewer.

## Exporting LaTeX

The **Export LaTeX** button opens a syntax-highlighted viewer with copy and
download actions. The generated source is a complete Beamer document using the
selected theme, colortheme, aspect ratio, font (via fontspec), languages (via
polyglossia) and custom color definitions. It starts with
`% !TeX program = xelatex` and must be compiled with XeLaTeX.

Images are embedded in the project file but cannot be embedded in LaTeX source.
Exported decks reference them by filename, for example:

```latex
\includegraphics[width=0.70\textwidth]{chart.png}
```

Place the original image files next to the `.tex` file before compiling. The
chosen font must be installed; otherwise the export falls back to Latin Modern
and prints a package warning:

```bash
xelatex presentation.tex
```

The preview is an approximation of Beamer's layout, not a pixel-exact copy.
Always compile the exported source for the final result.

## Project layout

```
src/
  editor/    toolbar, slide rail, inspector, design panel
  export/    LaTeX generation, download helpers
  model/     deck types, store, defaults, persistence, project I/O
  render/    slide canvas, chrome (title bars/sidebar/footer), blocks, inline text
  themes/    theme specs, colortheme math, palette resolution
  styles/    application CSS
```
