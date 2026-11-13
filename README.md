# Beamer Studio

**A browser-based WYSIWYG editor for LaTeX Beamer presentations.**

Design slides on a visual canvas, tune the theme, colors, typography,
backgrounds and foreground overlays, then export a complete, compilable
**XeLaTeX** document. No backend and no LaTeX installation are needed while
editing — the app runs entirely in the browser and stores work locally.

The preview is intentionally close to Beamer: themes, color themes, chrome,
content blocks and image layer placement are re-implemented in React/CSS using
the same theme resolution the exporter uses. It is an approximation, not a
pixel-perfect renderer — the exported `.tex` file is always the source of truth.

---

## Highlights

- **29 stock Beamer themes** and **19 color themes**, plus point-and-click
  palette overrides for the structure color, title bars, background, body text
  and alert color.
- **True LaTeX authoring** — inline markup such as `\alert{...}`, `\textbf{...}`,
  `\href{...}` and `$E=mc^2$` is rendered with KaTeX on the canvas and exported
  verbatim.
- **33 font families** grouped into TeX fonts, Windows system fonts and web /
  Google fonts, plus a custom family field for anything else fontspec knows.
- **28 languages** through polyglossia, with a dedicated Greek/Cyrillic face and
  automatic `\textgreek{...}` / `\textrussian{...}` markup so XeLaTeX switches
  fonts instead of dropping glyphs.
- **Template image layers** — one **Design → Images** tab with Background and
  Foreground sub-tabs: any number of stacked images per slot, with per-layer
  opacity, size mode, nine anchors, fine X/Y offsets and rotation. Title and
  section pages can override the shared stack.
- **Per-slide image layers** — the same positioned stack editor on any single
  slide, drawn above that slide's content, plus a one-click **+ Quick image**
  action for ordinary in-flow content images.
- **16:9 and 4:3** decks with live thumbnails.
- **Project files and autosave** — download/open a `.beamer.json` project with
  embedded images; edits are autosaved in the browser.
- **Clean XeLaTeX export** — theme, colortheme, fontspec, polyglossia, custom
  colors and TikZ image layers are emitted as a ready-to-compile document.

---

## Quick start

### Requirements

- **Node.js 20 or newer** (and npm).
- A TeX distribution with **XeLaTeX** — MiKTeX or TeX Live — to compile exported
  decks. Editing itself does not require TeX.

### Install and run

```bash
npm install
npm run dev
```

Vite prints a local URL (usually <http://localhost:5173>). Open it in a modern
browser and start editing; changes are autosaved to `localStorage`.

### Scripts

| Command             | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server with hot module replacement.  |
| `npm test`          | Run the Vitest unit suite once.                         |
| `npm run typecheck` | Type-check the project with `tsc --noEmit`.             |
| `npm run build`     | Type-check, then build the production bundle in `dist/`. |
| `npm run preview`   | Serve the built bundle locally.                         |

---

## The workspace

The editor is a single page with four regions:

1. **Toolbar** — presentation title, New / Sample / Open / Save, undo/redo and
   **Export LaTeX**.
2. **Slides rail** — `+ Title`, `+ Section` and `+ Frame` buttons, plus live
   thumbnails.
3. **Canvas** — the selected slide, fitted to the window with zoom controls.
4. **Side panel** — switch between **Design** (theme, colors, layout, images)
   and **Slide** (frame fields, per-slide images and the block tree).

A status bar shows editing hints and shortcuts.

### Slides

- Add **title**, **section** and **frame** slides.
- Select a thumbnail to edit it; thumbnails update as you type.
- Reorder with the arrow buttons, duplicate a slide, or delete it.
- In the Slide tab, choose the slide kind, edit the frame title/subtitle, and
  switch a frame between one column and two columns.

### Editing on the canvas

Double-click any text on the canvas to edit its LaTeX source in place. Inline
markup is parsed and rendered with KaTeX for the preview, while the export keeps
your source untouched. Paragraph blocks also support left/center/right alignment
and a first-line indent, exported as an explicit `\hspace*{...}` because Beamer
sets `\parindent` to zero.

### Content blocks

Frames are built from a tree of blocks. Select a block on the canvas or in the
Slide tab to edit it; nested blocks (inside a block or a column) can be edited in
place.

| Block              | What it produces in the export                              |
| ------------------ | ----------------------------------------------------------- |
| **Paragraph**      | Text with inline LaTeX, alignment and first-line indent.    |
| **List**           | `itemize` or `enumerate`, with nesting and optional `\pause`. |
| **Block**          | Beamer `block`, `alertblock` or `exampleblock`, with optional per-block title/body colors. |
| **Columns**        | Two `columns` environments (`0.48\textwidth` each).         |
| **Image**          | `\includegraphics` at a chosen width, with optional caption. |
| **Math**           | Display math (`\[ ... \]`).                                 |
| **Code**           | `verbatim` listing; the containing frame is marked `fragile`. |
| **Table of contents** | `\tableofcontents`.                                      |

Each block can be moved, deleted, and given children; blocks and lists support
indent/outdent where relevant. **+ Quick image** in the Structure panel opens
the file picker and appends an Image block with the chosen file already loaded.

### Themes and colors

The **Design → Template** tab offers all 29 stock Beamer themes (including
`default`, `boxes` and the 27 named themes). The **Colors** tab offers the 19
stock color themes and a custom palette:

- Structure / accent color
- Title bars
- Background
- Body text
- Alert text

Custom colors are exported with `\definecolor` and `\setbeamercolor`, and are
also applied to the preview immediately. A composition summary in the Layout
tab shows the active outer/inner theme and color bundles.

### Typography and languages

The **Design → Layout** tab controls the document's typography:

- **Font family** — TeX fonts (Latin Modern, TeX Gyre, Libertinus, EB Garamond,
  Fira Sans, Source Sans Pro, DejaVu, Noto), Windows system fonts (Arial,
  Calibri, Segoe UI, Verdana, Tahoma, Trebuchet MS, Times New Roman, Georgia,
  Cambria, Palatino Linotype), web/Google fonts (Inter, Roboto, Open Sans, Lato,
  Montserrat, Source Serif Pro) and a **custom family** field.
- **Base font size** — 8–20 pt, passed to the `beamer` class.
- **Font scale** — an 80–130 % preview scale for fitting dense slides on screen;
  it does not change the exported document.
- **Slide size** — 16:9 widescreen (`aspectratio=169`) or 4:3 classic.
- **Language** — one main polyglossia language plus any number of additional
  languages.
- **Greek / Cyrillic font** — appears when a Greek or Cyrillic language is
  active. *Automatic* follows the main font when it carries the glyphs,
  otherwise a same-style fallback is chosen. The export declares
  `\greekfont` / `\cyrillicfont` and wraps affected runs in
  `\textgreek{...}` / `\textrussian{...}` (and the matching languages), because
  XeLaTeX has no per-character font fallback.
- **Beamer details** — bullet shape, block shape (rounded/rectangle), block
  shadows and navigation symbols.

Titles that contain script text are wrapped in `\texorpdfstring` so PDF
bookmarks and metadata remain valid.

### Template image layers

**Design → Images** groups both template image surfaces under one tab. A
segmented control at the top switches between:

- **Background** — images attached behind every slide, behind all frame content.
- **Foreground** — logos, seals, watermarks and decorative marks drawn above the
  slide content, including the frame chrome (title bars, sidebars, footer).

Both sub-tabs offer the same three slots:

- **All frames** — the shared stack.
- **Title page** — replaces the shared stack on the title slide.
- **Section pages** — replaces the shared stack on section slides.

Each slot holds an ordered **stack** of images drawn back to front, so a backdrop
and a logo can be combined. Title/section stacks *replace* the shared stack
rather than adding to it; leave a slot empty to inherit the shared stack, or use
**Use shared layers** to clear an override. On the shared slot an empty stack
means no template image at all.

Each layer has:

| Setting            | Effect                                                        |
| ------------------ | ------------------------------------------------------------- |
| **Opacity**        | 0–100 %, adjustable in 1 % steps.                              |
| **Size**           | Scale to width, fit inside the page, or stretch to the page.   |
| **Image width**    | Width as a percentage of the page (scale mode only), in 1 % steps. |
| **Anchor**         | Center, edges or corners — nine positions.                     |
| **Horizontal / vertical offset** | Fine placement from the anchor, in percent of the page. Positive values move right/down; 1 % steps. |
| **Rotation**       | −180° to 180° clockwise around the anchor, in 1° steps.        |

Layers can be reordered, removed, and selected independently; the stack order is
preserved in the preview, thumbnails and export. The foreground container
ignores pointer events, so image layers never block editing on the canvas.

### Per-slide image layers

Every selected slide has its own **Slide images** card in the right panel, with
the same stack editor and the same opacity, size, anchor, offset and rotation
controls as template layers. These layers belong to that slide only and are
drawn above its content and above any template foreground stack. They work on
title, section and frame slides alike.

For an ordinary in-flow illustration instead of a positioned overlay, use
**Slide → Structure → + Quick image**: it opens the file picker, inserts an
Image block at the end of the frame and selects it so you can set its width,
caption and position in the block tree.

### Undo, save and autosave

- Undo/redo covers every deck mutation.
- **Save** downloads a `.beamer.json` project file with images embedded as data
  URLs. **Open** validates the file, migrates older shapes and replaces the
  current deck.
- Edits are autosaved to this browser's `localStorage` under
  `beamer-editor.deck.v1` with a short debounce. Autosave is per origin; use the
  project file to move a deck between browsers or machines.
- Uploaded images are resized to at most 1600 px on the long edge. PNGs under
  900 KB stay PNG; everything else becomes JPEG (quality 0.86).

### Keyboard shortcuts

| Shortcut                            | Action                       |
| ----------------------------------- | ---------------------------- |
| `Ctrl/Cmd+Z`                        | Undo                         |
| `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`  | Redo                         |
| `Ctrl/Cmd+S`                        | Download the `.beamer.json` project |
| `Ctrl/Cmd+E`                        | Open the Export LaTeX viewer |
| `Escape`                            | Close the export viewer      |

Undo/redo and the export shortcut are ignored while typing in inputs; save always
works.

---

## Exporting to LaTeX

Click **Export LaTeX** to open a syntax-highlighted viewer showing the complete
document, line count and preamble summary. From there you can:

- **Copy to clipboard**,
- **Download the `.tex` file** (named after the deck title), and
- **Download each referenced image** listed under *Referenced image files*.

### What the exporter generates

The output is a complete XeLaTeX document. A simplified 16:9 example:

```latex
% !TeX program = xelatex
\documentclass[aspectratio=169,11pt]{beamer}
\usetheme{Berlin}
\usecolortheme{dolphin}

\usepackage{fontspec}
\usepackage{polyglossia}
\usepackage{tikz}            % only when image layers are used
\setmainlanguage{english}
\setotherlanguage{russian}
\usefonttheme{professionalfonts}
\defaultfontfeatures{Ligatures=TeX}

\IfFontExistsTF{Arial}{%
  \setsansfont{Arial}%
  \setmainfont{Arial}%
}{%
  \PackageWarning{beamer-editor}{Font "Arial" is not installed; using Latin Modern Sans}%
  \setsansfont{Latin Modern Sans}%
  \setmainfont{Latin Modern Sans}%
}
```

The exporter also:

- Uses `\titlepage` for title slides, and `\section{...}` + `\sectionpage` for
  section slides.
- Emits each content frame as `\begin{frame}{title}{subtitle}`. Marking the
  subtitle group even when empty is deliberate: Beamer would otherwise swallow
  a leading color-override group into the title.
- Adds `fragile` to frames containing code.
- Emits custom colors via `\definecolor` / `\setbeamercolor`, bullet and block
  templates only when they differ from the theme defaults, and disables
  navigation symbols when requested.
- Names images safely (spaces and special characters become `_`, duplicates get
  `-2`, `-3`, …) and references them by filename.

### Compiling

```bash
xelatex presentation.tex
```

The file starts with `% !TeX program = xelatex`. Use **XeLaTeX**, not pdfLaTeX —
the document uses fontspec and polyglossia. The chosen font must be installed on
the machine that compiles it; otherwise the export falls back to Latin Modern
and prints a package warning instead of failing.

Background layers need a single run. **Foreground and per-slide layers are
page-anchored, so run XeLaTeX twice on a fresh compile** — the first run writes
the page anchors to the `.aux` file and the overlays resolve on the second pass.
A first-run PDF may show those images off-page; simply run the command again.

### Images, backgrounds, foregrounds and slide layers

Images are embedded in the project JSON but cannot be embedded in LaTeX source.
Download the referenced files from the export viewer and place them next to the
`.tex` file before compiling. Content images are referenced like this:

```latex
\includegraphics[width=0.70\textwidth]{chart.png}
```

Background layers become positioned TikZ nodes inside a single page-sized
`\usebackgroundtemplate`, emitted once per unique stack and switched as the deck
moves between shared, title and section backgrounds. A simplified stack looks
like this:

```latex
\usebackgroundtemplate{%
  \begin{tikzpicture}
    \useasboundingbox (0,0) rectangle (160.00mm,90.00mm);
    \fill[bxBackgroundFill] (0,0) rectangle (160.00mm,90.00mm);
    \node[anchor=center,inner sep=0pt,opacity=1.00] at (80.00mm,45.00mm)
      {\includegraphics[width=160.00mm]{backdrop.jpg}};
    \node[anchor=south east,inner sep=0pt,opacity=0.85] at (160.00mm,0.00mm)
      {\includegraphics[width=20.00mm]{logo.png}};
  \end{tikzpicture}%
}
```

Explicit page coordinates (`160×90 mm` for 16:9, `128×96 mm` for 4:3) are used
instead of TikZ's `current page`, so one XeLaTeX run is enough — no second pass
to resolve the page node. Layer anchors, size modes, offsets and rotation map to
`anchor=...`, `width`/`height`/`keepaspectratio`, node positions and
`rotate=...`; the vertical offset is flipped because TikZ's Y axis points up,
and the rotation sign is flipped because TikZ counts counter-clockwise while the
editor counts clockwise.

Foreground and per-slide layers are drawn from a `shipout/foreground` hook so
they cover the frame content, including frame titles and navigation. The
per-page stack is renewed immediately before each frame; a slide with its own
layers renews the command with the template stack followed by the slide stack:

```latex
\newcommand{\bxForeground}{}
\AddToHook{shipout/foreground}{%
  \begin{tikzpicture}[remember picture,overlay]
    \bxForeground
  \end{tikzpicture}%
}
% ... before a frame that has foreground layers:
\renewcommand{\bxForeground}{%
  \node[anchor=north east,inner sep=0pt,opacity=0.90,rotate=-20]
    at ([xshift=153.60mm,yshift=-2.70mm]current page.north west)
    {\includegraphics[width=24.00mm]{logo.png}};%
}
```

Because these nodes reference `current page`, a fresh document needs the second
XeLaTeX pass described above. Backgrounds, foregrounds and per-slide layers can
be combined; the three surfaces share the same anchor, size, offset and rotation
math.

### Preview fidelity

The editor canvas (960×540 for 16:9, 800×600 for 4:3) is a CSS reconstruction of
Beamer's layout, chrome and colors. Font metrics, spacing and some theme details
will differ slightly. Always compile the exported source for the final result,
especially before presenting or printing.

---

## How it works

- **One deck model.** A versioned `Deck` object (`src/model/types.ts`) is the
  single source of truth: metadata, aspect ratio, theme settings, document
  settings and slides. All mutations go through a Zustand store that also keeps
  undo/redo snapshots, selects the active slide/block and drives autosave.
- **Shared theme resolution.** `resolveTheme()` derives palette colors, font
  metrics, layout metrics and page dimensions from the theme, aspect ratio and
  base font size. Preview, thumbnails and export all consume the same resolved
  values, which keeps colors and geometry in sync.
- **Fixed page, scaled preview.** The canvas renders at a fixed internal size and
  is scaled with a CSS `transform`; slide thumbnails reuse the same renderer at
  a smaller scale.
- **Image layer mapping.** The preview positions layers with
  `background-position: calc(...)`, `background-size` and a CSS `rotate()`
  around the anchor point; the exporter converts the same anchor fractions,
  offsets, size modes and rotation into TikZ nodes and `\includegraphics`
  options. Both use percent-of-page coordinates, which is why the manual sliders
  behave identically in the preview and the PDF. Foreground stacks and per-slide
  layers ride in a `shipout/foreground` hook so they stay above all frame content.
- **Robust project I/O.** `parseDeck()` validates and normalizes every field,
  clamps numeric ranges (including rotation to ±180°), migrates legacy image
  shapes (a single image becomes a one-layer stack) and drops malformed blocks
  instead of crashing.

---

## Project layout

```
src/
  App.tsx                 app shell, shortcuts, autosave wiring
  main.tsx                React entry point
  editor/
    Toolbar.tsx           new/open/save, undo/redo, export trigger
    SlideRail.tsx         slide list, add/reorder/duplicate/delete, thumbnails
    PreviewPane.tsx       fitted canvas with zoom
    Inspector.tsx         slide fields, per-slide images and the block tree editor
    DesignPanel.tsx       template, colors, layout and images tabs
    ImageStackCard.tsx    shared stack editor for template and slide layers
    ExportDialog.tsx      LaTeX viewer, copy/download, image downloads
    imageFile.ts          client-side image resize/encode
    ColorField.tsx        color input control
  render/
    SlideCanvas.tsx       frame composition, background, foreground and slide layers
    SlideChrome.tsx       title bars, sidebar, footer per theme
    TitlePage.tsx         title slide rendering
    BlockView.tsx         block rendering for all content types
    EditableText.tsx      double-click-to-edit text
    inline.tsx            inline LaTeX/KaTeX rendering
    useFitScale.ts        fit-to-window scaling hook
  themes/
    beamerThemes.ts       29 theme specs (chrome/layout metadata)
    colorthemes.ts        19 color theme functions
    colorMath.ts          palette math (shade/readable contrast)
    resolve.ts            palette + metrics resolution
    fonts.ts              33 font families, fontspec mapping, fallbacks
    languages.ts          28 polyglossia languages and scripts
    backgrounds.ts        image slots, layer defaults, anchor/placement/rotation math
  model/
    types.ts              Deck, Slide, Block and theme types
    store.ts              Zustand store, undo/redo, selection
    defaults.ts           sample deck and defaults
    validate.ts           project validation, clamping and migration
    persistence.ts        localStorage autosave/load
    projectIO.ts          .beamer.json download/open
    blockOps.ts           block tree helpers
    paragraphs.ts         paragraph splitting
    ids.ts                id generation
  export/
    toLatex.ts            XeLaTeX generation, image collection, all image-layer surfaces
    download.ts           blob/text download helpers, slugify
  styles/
    app.css               application, canvas and panel styles
```

### Tech stack

| Layer        | Choice                                   |
| ------------ | ---------------------------------------- |
| UI           | React 19 + TypeScript 5.8 (strict)       |
| Build        | Vite 6                                   |
| State        | Zustand 5                                |
| Math preview | KaTeX 0.16                               |
| Tests        | Vitest 3                                 |
| Styling      | Plain CSS with theme-driven CSS variables |
| Export       | XeLaTeX + fontspec + polyglossia + TikZ  |

---

## Testing

```bash
npm test
npm run typecheck
npm run build
```

The Vitest suite (143 tests in 6 files) covers theme resolution and color math,
image stack resolution and placement math, project validation and legacy
migration, store operations, and LaTeX output (preamble, frames, blocks, images,
background templates, foreground overlays and per-slide layers). Layout and image
layer behavior have additionally been verified by compiling exported decks with
MiKTeX XeLaTeX in both aspect ratios — running twice for page-anchored overlays —
and inspecting the resulting PDF pages.

---

## Notes and limitations

- The preview is an approximation of Beamer, not a pixel-exact renderer.
- Export targets **XeLaTeX** only. The chosen font must be installed when
  compiling; otherwise Latin Modern is used with a warning.
- Images are not embedded in `.tex` output — download them from the export
  viewer and keep them beside the source file.
- Decks with foreground or per-slide layers need **two XeLaTeX runs** on a fresh
  compile; the first resolves the page anchors, the second places the overlays.
- Autosave is local to the current browser/origin. Use **Save** to archive and
  move decks.
- There is no PDF or PowerPoint export; the deliverable is LaTeX source.
- The editor is a single-user, client-side tool — no accounts, server storage or
  real-time collaboration.

## Contributing

Run `npm test`, `npm run typecheck` and `npm run build` before opening a pull
request, and compile an exported deck with XeLaTeX when changing themes,
typography, image layers or the exporter.
