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
  The same picker can override the font for one slide's content or for a single
  block, so a quote, a verse or a code listing can carry its own face.
- **Syntax-listing code blocks** — 27 recognised languages, an optional caption
  and optional line numbers, exported through the `listings` package inside
  `fragile` frames.
- **Visual table block** — an editable cell grid with per-column alignment,
  header detection, booktabs or full-grid borders, an optional caption and
  spreadsheet-style paste from a tab-separated block.
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
- **TikZ drawings** — a shape editor with lines, arrows, rectangles (including
  rounded corners), ellipses, freeform paths and text, plus a live TikZ code
  pane. Shapes can carry labels, each paint has its own opacity, and new arrows
  and paths magnetise to corners, edges and centres of existing shapes. Every
  shape keeps draggable geometry handles (line/arrow endpoints, rectangle and
  ellipse corners, path vertices), and connectors sitting on an anchor stay
  glued to it when the host shape moves. Drawings
  work as content blocks inside frames and as positioned background, foreground
  or per-slide layers; the code is exported verbatim as real `tikzpicture`
  source.
- **16:9 and 4:3** decks with live thumbnails.
- **Project files and autosave** — download/open a `.beamer.json` project with
  embedded images; edits are autosaved in the browser.
- **Clean XeLaTeX export** — theme, colortheme, fontspec, polyglossia, custom
  colors, TikZ drawings and TikZ image layers are emitted as a ready-to-compile
  document.
- **LaTeX import** — paste or open a Beamer `.tex` file and get an editable
  deck back: preamble metadata, themes, languages, frames, sections, lists,
  blocks, columns, tables, code, math and TikZ are mapped onto editor blocks,
  with a live warning list for anything approximated.

---
## Screenshots

<img width="1900" height="1025" alt="image" src="https://github.com/user-attachments/assets/eabff2f2-b320-4845-b193-0cdb60b99878" />
<img width="1894" height="1018" alt="image" src="https://github.com/user-attachments/assets/9cf0dbbd-e893-4941-89ad-2986c51d80e2" />
<img width="1894" height="1022" alt="image" src="https://github.com/user-attachments/assets/bc5b88a5-55c9-494a-9eac-60fbcff413d4" />



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
| **Code**           | `listings` block with an optional dialect, caption and line numbers; the containing frame is marked `fragile`. |
| **Table**          | A `tabular` with per-column alignment, an optional header row, booktabs rules or a full grid, and an optional caption. |
| **TikZ drawing**   | A centered `tikzpicture` scaled to a chosen text width, with optional caption. |
| **Table of contents** | `\tableofcontents`.                                      |

Each block can be moved, deleted, and given children; blocks and lists support
indent/outdent where relevant. **+ Quick image** in the Structure panel opens
the file picker and appends an Image block with the chosen file already loaded.
**+ Quick code** appends a Python listing and selects it, ready to edit.
**+ Quick table** appends a 3×3 table with a header row and selects it.

#### Code listings

Code blocks are backed by LaTeX's `listings` package (loaded automatically when
the deck contains code). The inspector offers:

- **Language** — from 27 entries. A curated set has a matching `listings`
  dialect, so the export enables syntax highlighting: Python, C, C++, Java,
  HTML, XML, SQL, Bash, LaTeX (`TeX`), MATLAB, R, Perl, Ruby, Pascal, Haskell,
  Lisp, Fortran, Verilog and VHDL. JavaScript, TypeScript, C#, CSS, JSON, YAML,
  PowerShell and plain text are exported as unhighlighted monospaced listings
  (the label says *plain*) because `listings` ships no safe built-in dialect for
  them.
- **Highlighting** — dialect listings colour keywords (bold blue), comments
  (italic green) and strings (dark red). The exporter defines these as
  `bxcodekeyword`, `bxcodecomment` and `bxcodestring` with `\definecolor`, so
  they survive any theme.
- **Line numbers** — prints `numbers=left` with a small numeric margin; the
  canvas preview shows the same numbered gutter.
- **Caption** — an optional listing caption printed below the code.

Indentation pasted as tabs is expanded to four-column tab stops before export
and in the canvas preview. Without that, `listings` prints each raw tab as
`^^I` in the PDF.

The preview shows a language badge, the numbered gutter when enabled, and the
caption. Frames containing code are exported as `\begin{frame}[fragile]`, which
is required by `listings`.

#### Tables

Tables are edited directly in the inspector as a grid of inputs; the canvas
preview and the export stay in sync with every keystroke. The editor offers:

- **Rows and columns** — add or delete either from the grid header/row gutter.
  Every row is kept rectangular, with a ceiling of 40 rows and 12 columns.
- **Column alignment** — an L/C/R selector above each column maps to `l`, `c`
  or `r` in the `tabular` preamble.
- **Header row** — the first row is rendered in bold and exported inside
  `\textbf{...}`. Turn it off for data-only tables.
- **Borders** — booktabs rules (`\toprule`, `\midrule`, `\bottomrule`) by
  default, or a full `\hline` grid with vertical bars. `booktabs` is loaded
  automatically when the deck contains any table.
- **Caption** — wraps the tabular in a `table` float with `\centering` and
  `\caption{...}`; without a caption the table is centered directly in the
  frame.
- **Spreadsheet paste** — paste tab-separated cells into any cell and the table
  grows around the anchor, preserving existing content up to the size limits.
  Single-cell pastes are left to the browser.
- **Inline LaTeX** — cell text accepts the usual inline markup and math. Bare
  `&` and `%` are escaped to `\&` and `\%` on export so they cannot break the
  `tabular`; already-escaped pairs are left alone.

#### Font overrides

A font can be set at two narrower scopes than the document theme:

- **Content font** on a frame or section slide (Slide tab) changes that slide's
  body or section page only; title pages always use the theme face.
- **Block font** in a selected block's inspector changes just that block,
  including nested blocks and any one of columns, paragraphs, lists, blocks,
  images, math, code, TikZ and TOC.

Both pickers reuse the same 33-family catalog and custom family field as the
theme, and offer **Inherit from theme** to clear an override. Block-scoped
overrides apply to everything the block renders, including code listings and
their captions.

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

### TikZ drawings

Diagrams, schemas and plots can be drawn directly in the editor. A drawing is
plain geometry in millimetres; the app renders it as SVG on the canvas and as
TikZ in the export, so what you lay out is what gets compiled.

There are two ways to place a drawing:

- **Content block in a frame** — in **Slide → Structure**, choose **+ Add block**
  and pick **TikZ drawing**. The block behaves like an image: set its name,
  width (10–100 % of `\textwidth`) and optional caption in the inspector. Use
  this for in-flow charts and diagrams.
- **Positioned layer** — **Add TikZ** in the template **Design → Images**
  background/foreground sub-tabs or in the **Slide images** card. A TikZ layer
  takes the same opacity, size mode, nine anchors, X/Y offsets and rotation as
  an image layer, and can be mixed into the same stack.

Both open the same modal editor:

| Area | What it does |
| ---- | ------------ |
| **Canvas** | Click-drag with **Line**, **Arrow**, **Rect** or **Ellipse**; **Text** places a label at the click point; **Path** records click-by-click points (press `Enter` to finish). Everything snaps to 0.5 mm. While **Magnet** is on, line, arrow and path points snap to the nearest corner, edge midpoint or centre of an existing shape (shown as dots on the canvas, with an orange ring on the active anchor); magnet anchors win over the grid and the toggle turns the behaviour off. Selecting a shape in **Select** mode shows draggable handles — both ends of a line or arrow, every vertex of a path, and the four corners of a rectangle or ellipse — so existing geometry can be reshaped without redrawing; handles use the same magnet and grid snapping. Every shape also carries a wider invisible click zone, so thin strokes and unfilled outlines are easy to grab. Lines, arrows and path points whose ends sit exactly on another shape's anchor stay glued when that shape is moved or resized. |
| **Properties** | Text content, font size, stroke and fill colors, separate outline/fill opacity, line width, dashed, closed path, rectangle corner radius, rotation, X/Y/W/H, layer order, duplicate and delete. Lines and arrows can be switched between the two kinds. Rectangle, ellipse and closed-path shapes can also carry a centered label with its own size, colour and opacity. |
| **TikZ code** | Live source for the drawing. Edit it by hand and press **Apply code** to parse it back onto the canvas, or **Regenerate** to replace the text with code generated from the shapes. The status line reports how many shapes were parsed and how many commands are unsupported. |

The canvas is the source of truth until you apply hand-written code: a drawing
that comes from **Apply code** keeps the exact typed source in the export
(`drawing.code` is authoritative) even though only the supported subset is
previewed. Any canvas edit clears that flag and regenerates standard code.
`Done` saves, `Cancel` discards, and double-clicking a TikZ block or layer
reopens the editor.

Coordinates on the canvas are millimetres with **y pointing down** (screen
convention); the generator flips y so the exported picture has y pointing up, as
TikZ expects. A new content drawing starts at 80×50 mm; a new layer drawing
starts at 160×90 mm so that 100 % scale covers a 16:9 page.

Labels, transparency and rounding all survive the round trip. A labelled
rectangle is exported as its `filldraw`/`draw` command followed by a centred
`\node`; generated labels carry a `name=bxlabel…` marker so **Apply code** folds
them back into their host shape instead of leaving a loose text shape. Paint
opacity becomes `draw opacity`, `fill opacity` and `text opacity`, and a rounded
rectangle becomes `rounded corners=…mm`.

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
| `Escape`                            | Close the export or import viewer |

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
\usepackage{tikz}            % image layers and/or TikZ drawings
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
- Adds `fragile` to frames containing code, loads `listings` and emits a default
  `\lstset` (monospaced, wrapped, flexible columns, coloured keywords, comments
  and strings, grey line numbers). Tabs in code are expanded to four-column
  stops, because `listings` otherwise prints them literally as `^^I`. Each
  listing carries its dialect and options:
  `\begin{lstlisting}[breaklines=true,language=Python,numbers=left,numberstyle=\tiny,numbersep=6pt,caption={Example}]`.
- Emits tables as `tabular` environments, with booktabs rules by default (loading
  `booktabs`) or an `\hline` grid when borders are requested. Header cells are
  wrapped in `\textbf{...}`, captions lift the tabular into a `table` float, and
  bare `&`/`%` in cells are escaped so the row structure stays intact.
- Declares slide and block font overrides once per distinct family as
  letter-named macros — `\bxfontA`, `\bxfontB`, … `\bxfontAA` — because TeX
  control words cannot contain digits. Each declaration is guarded by
  `\IfFontExistsTF` and falls back to the main font with a package warning, and
  the slide or block body is wrapped in a local `{ \bxfontA … }` group.
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
and prints a package warning instead of failing. Slide and block font overrides
behave the same way: a missing family falls back to the main fallback face and
emits a `PackageWarning{beamer-editor}` naming the font, so compilation still
completes.

Background layers need a single run. **Foreground and per-slide layers are
page-anchored, so run XeLaTeX twice on a fresh compile** — the first run writes
the page anchors to the `.aux` file and the overlays resolve on the second pass.
A first-run PDF may show those images off-page; simply run the command again.

### Images, backgrounds, foregrounds, slide layers and TikZ drawings

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

TikZ drawings do not produce files. A content block is emitted as a centered
picture scaled to its width; the drawing's own size becomes the bounding box:

```latex
\begin{center}
  \centering
  \resizebox{0.60\textwidth}{!}{%
    \begin{tikzpicture}[x=1mm,y=1mm]
      \useasboundingbox (0,0) rectangle (80,50);
      \filldraw[draw=bxtz0,draw opacity=0.5,fill=bxtz1,fill opacity=0.35,
                rounded corners=2mm] (10,40) rectangle (40,20);
      \node[anchor=center,inner sep=0pt,name=bxlabel0,text=bxtz2,
            text opacity=0.9] at (25,30) {Flow};
    \end{tikzpicture}%
  }
  \caption{Signal flow}
\end{center}
```

A vector layer becomes one node in the same background or foreground stack as
the image layers. Its geometry is scaled through the nested picture's unit
vectors (`x=…mm,y=…mm`) rather than `\resizebox`, because a `\resizebox` around a
nested `tikzpicture` inside `\usebackgroundtemplate` fails to compile; the
bounding box is a raw-number rectangle in drawing coordinates:

```latex
\node[anchor=center,inner sep=0pt,opacity=1.00] at (80.00mm,45.00mm) {%
  \begin{tikzpicture}[x=0.80mm,y=0.80mm]
    \useasboundingbox (0,0) rectangle (100,50);
    ...
  \end{tikzpicture}%
};
```

Foreground vector layers are positioned `at ([xshift=...,yshift=...]current
page.north west)`, so they follow the same two-run rule as foreground images.
The parser behind **Apply code** understands `\draw`, `\fill`, `\filldraw`,
`\path` and `\node` with `--`, `rectangle`, `circle`, `ellipse`,
`plot coordinates`, named colors, `draw=`, `fill=`, `thick`/`thin`,
`dashed`, `rounded corners`, `draw`/`fill`/`text opacity`, `rotate=` and font
sizes. Anything else is kept verbatim in the export but is not previewed, and
the editor reports how many commands it skipped.

### Preview fidelity

The editor canvas (960×540 for 16:9, 800×600 for 4:3) is a CSS reconstruction of
Beamer's layout, chrome and colors. Font metrics, spacing and some theme details
will differ slightly. Always compile the exported source for the final result,
especially before presenting or printing.

---

## Importing from LaTeX

**Import .tex** in the toolbar opens a dialog that accepts a pasted document or
a `.tex` file from disk. Parsing happens live, so the detected slide count and
every approximation appear before you commit; **Import into editor** then
replaces the deck and clears undo history, exactly like **Open**.

The parser reads both the preamble and the `document` body:

- **Preamble** — `\documentclass` aspect ratio and font size, `\usetheme`,
  `\usecolortheme`, title/subtitle/author/institute/date, polyglossia and babel
  languages, the catalogued `\setsansfont`/`\setmainfont` family, `bx*` custom
  colors, bullet/block templates and hidden navigation symbols.
- **Structure** — `\titlepage`/`\maketitle`, `\section` with `\sectionpage`, and
  `\begin{frame}` or legacy `\frame`, including title arguments,
  `\frametitle`, `\framesubtitle`, overlay specifications and `[fragile]`.
- **Content** — paragraphs (center/flushright and `\hspace*{..em}` indent),
  nested itemize/enumerate/description lists with `\pause`, normal, alert and
  example blocks, theorem-like environments, columns, figures, tables
  (booktabs or `\hline` grids, captions, `\multicolumn` cells), display math
  through `\[...\]` and equation/align/gather environments,
  listings/minted/verbatim code and TikZ pictures — including the
  `\resizebox` wrapper the editor itself emits.
- **Inline markup** is preserved verbatim for the KaTeX renderer, while
  comments, `\label`s and layout-only commands are removed.

Anything the model cannot represent is listed as a warning and, where possible,
imported as plain content instead of failing the import. Images become empty
placeholders that keep the file name and width; reattach the real files from
the image inspector. Importing a deck previously exported by the editor is
supported, which makes the round trip a quick way to seed a new deck.

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
- **Scoped font overrides.** A slide or block may carry a `FontChoice`. The
  preview wraps the affected DOM in a font-family scope (`display: contents`, so
  layout is untouched); the exporter deduplicates families, emits one guarded
  `\newfontfamily` macro per distinct choice and wraps the same content in a
  local group. Preview and PDF therefore switch fonts at identical boundaries.
- **TikZ drawing pipeline.** One shape model in millimetres feeds three
  consumers: an SVG renderer for the live canvas and thumbnails, a deterministic
  code generator, and a subset parser that maps hand-written TikZ back onto the
  canvas. `drawing.code` is authoritative when present, so typed code reaches the
  export verbatim; canvas edits clear it and regenerate. The same drawing can be
  a content block (a `\resizebox`-wrapped picture in frame flow) or a positioned
  layer node (scaled unit vectors inside the background/foreground stack).
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
    ImportDialog.tsx      paste/open a .tex file, live warnings, deck replacement
    TikzEditor.tsx        drawing canvas, shape properties and TikZ code pane
    tikzEditorStore.ts    modal open/close state and save callback
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
    table.ts              table grid, alignment, row/column and paste helpers
    code.ts               code-language catalog, aliases and listings dialects
    paragraphs.ts         paragraph splitting
    ids.ts                id generation
  export/
    toLatex.ts            XeLaTeX generation, image collection, all image-layer surfaces
    download.ts           blob/text download helpers, slugify
  import/
    fromLatex.ts          Beamer source parser: preamble, frames, blocks, tables, code, TikZ
  tikz/
    drawing.ts            shape defaults, TikZ code generation, drawing summaries
    parse.ts              subset parser for hand-written TikZ
    colors.ts             color normalization and TikZ color names
    TikzSvg.tsx           SVG renderer used by the canvas and thumbnails
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
| Export       | XeLaTeX + fontspec + polyglossia + TikZ + listings + booktabs |

---

## Testing

```bash
npm test
npm run typecheck
npm run build
```

The Vitest suite (224 tests in 9 files) covers theme resolution and color math,
image stack resolution and placement math, project validation and legacy
migration, store operations, table editing/paste helpers, TikZ
generation/parsing/anchors, LaTeX output (preamble, frames, blocks, code
listings, tables, scoped font declarations and groups, images, background
templates, foreground overlays, per-slide layers and TikZ drawings), and the
LaTeX importer (preamble mapping, comments/verbatim, frames and sections, lists
and blocks, columns, tables, code, math, images, TikZ and a full
export → import round trip). Imported decks — both a hand-written source and
the round-tripped sample — were exported and compiled with MiKTeX XeLaTeX.
Layout, image layers, tables and TikZ output have also been verified by
compiling exported decks with MiKTeX XeLaTeX in both aspect ratios — running
twice for page-anchored overlays — and inspecting the resulting PDF pages, with
TikZ content and vector layers checked in the browser as well.

---

## Notes and limitations

- The preview is an approximation of Beamer, not a pixel-exact renderer.
- Export targets **XeLaTeX** only. The chosen font — including slide and block
  overrides — must be installed when compiling; otherwise Latin Modern is used
  with a warning.
- Code highlighting relies on `listings` built-in dialects. Languages without a
  safe dialect (JavaScript, TypeScript, C#, CSS, JSON, YAML, PowerShell) export
  as plain monospaced text, as labelled in the language list.
- The TikZ canvas previews only the supported subset. Hand-written commands
  outside it are kept in the exported source but do not appear on the canvas.
- Magnet anchors come from a shape's unrotated bounds, so a rotated shape's
  snap points stay at its pre-rotation corners and centres.
- Sticky connections are inferred from exact anchor coincidence: connectors
  follow a shape while they sit on one of its anchors, and detach as soon as
  they are dragged off (or the host is edited through hand-written code).
- Images are not embedded in `.tex` output — download them from the export
  viewer and keep them beside the source file.
- LaTeX import is intentionally approximate: images arrive as placeholders,
  unknown environments are flattened to plain blocks, per-block colour and
  font overrides, template image layers and custom macros are not
  reconstructed, and complex overlay logic is reduced to item-level `\pause`.
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
