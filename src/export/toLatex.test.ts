import { describe, expect, it } from 'vitest';
import { createSampleDeck, DEFAULT_DOCUMENT, DEFAULT_META, DEFAULT_THEME } from '../model/defaults';
import type { Block, Deck, Slide } from '../model/types';
import { collectImages, latexImageName, toLatex } from './toLatex';

function deck(patch: Partial<Deck> = {}): Deck {
  return {
    version: 1,
    meta: { ...DEFAULT_META },
    aspect: '169',
    theme: { ...DEFAULT_THEME, custom: { ...DEFAULT_THEME.custom } },
    document: { ...DEFAULT_DOCUMENT, otherLanguages: [] },
    slides: [{ id: 'frame-1', kind: 'frame', title: 'Hello', layout: 'normal', body: [] }],
    ...patch,
  };
}

function frame(body: Block[], extra: Partial<Slide> = {}): Slide {
  return { id: 'frame-1', kind: 'frame', title: 'Frame', layout: 'normal', body, ...extra };
}

describe('latexImageName', () => {
  it('sanitizes names and enforces an image extension', () => {
    expect(latexImageName('my chart', 1)).toBe('my_chart.png');
    expect(latexImageName('plot.png')).toBe('plot.png');
    expect(latexImageName('figure 2.JPG')).toBe('figure_2.JPG');
    expect(latexImageName('   ', 3)).toBe('image-3.png');
  });
});

describe('toLatex preamble', () => {
  it('gives the structure colortheme the RGB option beamer requires', () => {
    const tex = toLatex(deck({ theme: { ...DEFAULT_THEME, template: 'Warsaw', colorTheme: 'structure' } }));
    expect(tex).toMatch(/\\usecolortheme\[RGB=\{\d+,\d+,\d+\}\]\{structure\}/);
  });

  it('emits the 16:9 document class and theme', () => {
    const tex = toLatex(deck());
    expect(tex.startsWith('% !TeX program = xelatex')).toBe(true);
    expect(tex).toContain('\\documentclass[aspectratio=169,11pt]{beamer}');
    expect(tex).toContain('\\usetheme{Madrid}');
    expect(tex).not.toContain('\\usecolortheme{whale}');
    expect(tex).toContain(`\\title{${DEFAULT_META.title}}`);
    expect(tex).toContain(`\\subtitle{${DEFAULT_META.subtitle}}`);
    expect(tex).toContain(`\\author{${DEFAULT_META.author}}`);
    expect(tex).toContain(`\\institute{${DEFAULT_META.institute}}`);
    expect(tex).toContain(`\\date{${DEFAULT_META.date}}`);
    expect(tex.trimEnd().endsWith('\\end{document}')).toBe(true);
  });

  it('sets up fontspec and the default language for XeLaTeX', () => {
    const tex = toLatex(deck());
    expect(tex).toContain('\\usepackage{fontspec}');
    expect(tex).toContain('\\usepackage{polyglossia}');
    expect(tex).toContain('\\setmainlanguage{english}');
    expect(tex).toContain('\\usefonttheme{professionalfonts}');
    expect(tex).toContain('\\defaultfontfeatures{Ligatures=TeX}');
    expect(tex).toContain('\\IfFontExistsTF{Latin Modern Sans}{%');
    expect(tex).toContain('\\setsansfont{Latin Modern Sans}%');
    expect(tex).toContain('\\setmainfont{Latin Modern Sans}%');
    expect(tex).toContain('\\IfFontExistsTF{Latin Modern Mono}{\\setmonofont{Latin Modern Mono}}{}');
    expect(tex).not.toContain('\\usefonttheme{serif}');
  });

  it('adds additional languages and script fonts for Greek and Cyrillic', () => {
    const tex = toLatex(
      deck({
        document: {
          mainLanguage: 'russian',
          otherLanguages: ['english', 'greek'],
          fontSize: 11,
        },
      }),
    );
    expect(tex).toContain('\\setmainlanguage{russian}');
    expect(tex).toContain('\\setotherlanguage{english}');
    expect(tex).toContain('\\setotherlanguage{greek}');
    expect(tex).toContain('\\newfontfamily\\greekfont');
    expect(tex).toContain('\\newfontfamily\\cyrillicfontsf');
  });

  it('uses the chosen font with a Latin Modern fallback and the class font size', () => {
    const tex = toLatex(
      deck({
        theme: { ...DEFAULT_THEME, fontFamily: 'tex-gyre-pagella' },
        document: { ...DEFAULT_DOCUMENT, otherLanguages: [], fontSize: 14 },
      }),
    );
    expect(tex).toContain('\\documentclass[aspectratio=169,14pt]{beamer}');
    expect(tex).toContain('\\IfFontExistsTF{TeX Gyre Pagella}{%');
    expect(tex).toContain('\\setsansfont{TeX Gyre Pagella}%');
    expect(tex).toContain('\\setsansfont{Latin Modern Roman}%');
    expect(tex).not.toContain('\\bxscriptfonts');
  });

  it('exports a custom font family with the same guarded fallback', () => {
    const tex = toLatex(
      deck({ theme: { ...DEFAULT_THEME, fontFamily: 'custom', customFont: 'Bahnschrift SemiBold' } }),
    );
    expect(tex).toContain('\\IfFontExistsTF{Bahnschrift SemiBold}{%');
    expect(tex).toContain('\\setsansfont{Bahnschrift SemiBold}%');
  });

  it('strips unsafe characters from a custom font name', () => {
    const tex = toLatex(
      deck({ theme: { ...DEFAULT_THEME, fontFamily: 'custom', customFont: 'Evil}\\lets{x}{' } }),
    );
    expect(tex).toContain('\\IfFontExistsTF{Evil lets x}{%');
    expect(tex).not.toContain('Evil}\\');
  });

  it('falls back to Latin Modern when a custom family is blank', () => {
    const tex = toLatex(
      deck({ theme: { ...DEFAULT_THEME, fontFamily: 'custom', customFont: '   ' } }),
    );
    expect(tex).toContain('\\IfFontExistsTF{Latin Modern Sans}{%');
  });

  it('omits the aspect ratio for 4:3 decks', () => {
    const tex = toLatex(deck({ aspect: '43' }));
    expect(tex).toContain('\\documentclass[11pt]{beamer}');
    expect(tex).not.toContain('aspectratio=169');
  });

  it('adds an extra color theme and switches the font family', () => {
    const tex = toLatex(
      deck({ theme: { ...DEFAULT_THEME, colorTheme: 'rose', fontFamily: 'latin-modern-roman' } }),
    );
    expect(tex).toContain('\\usecolortheme{rose}');
    expect(tex).toContain('\\IfFontExistsTF{Latin Modern Roman}{%');
  });

  it('emits custom color definitions when enabled', () => {
    const tex = toLatex(
      deck({
        theme: {
          ...DEFAULT_THEME,
          custom: {
            enabled: true,
            structure: '#123456',
            primaryBar: '#204060',
            background: '#fefefe',
            foreground: '#101010',
            alert: '#cc0001',
          },
        },
      }),
    );
    expect(tex).toContain('\\definecolor{bxStructure}{HTML}{123456}');
    expect(tex).toContain('\\setbeamercolor{structure}{fg=bxStructure}');
    expect(tex).toContain('\\definecolor{bxPrimaryBar}{HTML}{204060}');
    expect(tex).toContain('\\setbeamercolor{palette primary}');
    expect(tex).toContain('\\setbeamercolor{palette secondary}{bg=bxPrimaryBar!82!black');
    expect(tex).toContain('\\setbeamercolor{background canvas}{bg=bxBackground}');
    expect(tex).toContain('\\setbeamercolor{normal text}{fg=bxForeground}');
    expect(tex).toContain('\\setbeamercolor{alerted text}{fg=bxAlert}');
  });

  it('emits bullet, block and navigation overrides', () => {
    const tex = toLatex(
      deck({
        theme: {
          ...DEFAULT_THEME,
          template: 'default',
          colorTheme: 'default',
          bulletShape: 'square',
          blockShape: 'rectangle',
          blockShadow: false,
          navigationSymbols: false,
        },
      }),
    );
    expect(tex).toContain('\\setbeamertemplate{itemize item}{$\\blacksquare$}');
    expect(tex).toContain('\\setbeamertemplate{blocks}[default]');
    expect(tex).toContain('\\setbeamertemplate{navigation symbols}{}');
  });
});

describe('toLatex slides', () => {
  it('renders title and section slides', () => {
    const tex = toLatex(
      deck({
        slides: [
          { id: 't', kind: 'title', title: '', layout: 'normal', body: [] },
          { id: 's', kind: 'section', title: 'Part One', layout: 'normal', body: [] },
        ],
      }),
    );
    expect(tex).toContain('\\begin{frame}[plain]\n  \\titlepage\n\\end{frame}');
    expect(tex).toContain('\\section{Part One}');
    expect(tex).toContain('\\sectionpage');
  });

  it('always emits both title and subtitle groups on a frame', () => {
    const withSub = toLatex(deck({ slides: [frame([], { title: 'Main', subtitle: 'Sub' })] }));
    expect(withSub).toContain('\\begin{frame}{Main}{Sub}');
    const withoutSub = toLatex(deck({ slides: [frame([], { title: 'Main' })] }));
    expect(withoutSub).toContain('\\begin{frame}{Main}{}');
    const untitled = toLatex(deck({ slides: [frame([], { title: '' })] }));
    expect(untitled).toContain('\\begin{frame}{}{}');
  });

  it('marks frames containing code as fragile', () => {
    const body: Block[] = [{ id: 'c', type: 'code', lang: 'ts', text: 'const a = 1;' }];
    const tex = toLatex(deck({ slides: [frame(body, { title: 'Code' })] }));
    expect(tex).toContain('\\begin{frame}[fragile]{Code}{}');
    expect(tex).toContain('\\begin{verbatim}');
    expect(tex).toContain('const a = 1;');
    expect(tex).toContain('\\end{verbatim}');
  });

  it('nests itemize environments for item depths and emits \\pause', () => {
    const body: Block[] = [
      {
        id: 'l',
        type: 'list',
        ordered: false,
        items: [
          { id: 'i1', text: 'Top', depth: 0 },
          { id: 'i2', text: 'Middle', depth: 1 },
          { id: 'i3', text: 'Bottom', depth: 2, pause: true },
          { id: 'i4', text: 'Back to top', depth: 0 },
        ],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex.match(/\\begin\{itemize\}/g)).toHaveLength(3);
    expect(tex.match(/\\end\{itemize\}/g)).toHaveLength(3);
    expect(tex).toContain('\\pause');
    expect(tex).toContain('\\item Bottom');
  });

  it('uses enumerate for ordered lists', () => {
    const body: Block[] = [
      { id: 'l', type: 'list', ordered: true, items: [{ id: 'i1', text: 'One', depth: 0 }] },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\begin{enumerate}');
    expect(tex).toContain('\\end{enumerate}');
  });

  it('renders block tones with the matching environments', () => {
    const body: Block[] = [
      {
        id: 'b1',
        type: 'block',
        tone: 'alert',
        title: 'Careful',
        body: [{ id: 'p1', type: 'paragraph', text: 'Text' }],
      },
      {
        id: 'b2',
        type: 'block',
        tone: 'example',
        title: 'Sample',
        body: [{ id: 'p2', type: 'paragraph', text: 'Text' }],
      },
      {
        id: 'b3',
        type: 'block',
        tone: 'normal',
        title: 'Plain',
        body: [],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\begin{alertblock}{Careful}');
    expect(tex).toContain('\\begin{exampleblock}{Sample}');
    expect(tex).toContain('\\begin{block}{Plain}');
  });

  it('wraps a block with color overrides in a local group', () => {
    const body: Block[] = [
      {
        id: 'b1',
        type: 'block',
        tone: 'alert',
        title: 'Careful',
        colors: { titleBg: '#f00', titleFg: '#ffffff', bodyBg: '#ffeeee' },
        body: [{ id: 'p1', type: 'paragraph', text: 'Text' }],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('{%');
    expect(tex).toContain('\\definecolor{bxBlockb1TitleBg}{HTML}{FF0000}');
    expect(tex).toContain('\\definecolor{bxBlockb1TitleFg}{HTML}{FFFFFF}');
    expect(tex).toContain('\\setbeamercolor{block title alerted}{bg=bxBlockb1TitleBg,fg=bxBlockb1TitleFg}');
    expect(tex).toContain('\\definecolor{bxBlockb1BodyBg}{HTML}{FFEEEE}');
    expect(tex).toContain('\\setbeamercolor{block body alerted}{bg=bxBlockb1BodyBg}');
    expect(tex).not.toContain('BodyFg');
    expect(tex).toContain('\\begin{alertblock}{Careful}');
    expect(tex).toMatch(/\\begin\{alertblock\}\{Careful\}\s+Text\s+\\end\{alertblock\}\s+\}/);
  });

  it('keeps a leading override group out of the frame subtitle', () => {
    const body: Block[] = [
      {
        id: 'b1',
        type: 'block',
        tone: 'normal',
        title: 'Plain',
        colors: { titleBg: '#f00' },
        body: [],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body, { title: 'Frame' })] }));
    const frameLine = tex.split('\n').find((line) => line.startsWith('\\begin{frame}'));
    expect(frameLine).toBe('\\begin{frame}{Frame}{}');
    expect(tex).toContain('\\begin{frame}{Frame}{}\n  {%\n');
  });

  it('keeps normal and example blocks ungrouped when they have no overrides', () => {
    const body: Block[] = [
      { id: 'b1', type: 'block', tone: 'normal', title: 'Plain', body: [] },
      { id: 'b2', type: 'block', tone: 'example', title: 'Sample', body: [], colors: {} },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).not.toContain('\\begin{frame}{Frame}{}\n  {%\n');
    expect(tex).not.toContain('\\definecolor{bxBlock');
  });

  it('uses the example color names for an example block with overrides', () => {
    const body: Block[] = [
      {
        id: 'b2',
        type: 'block',
        tone: 'example',
        title: 'Sample',
        colors: { bodyFg: '#123456' },
        body: [],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\setbeamercolor{block body example}{fg=bxBlockb2BodyFg}');
    expect(tex).not.toContain('block title example}{');
  });

  it('wraps centered paragraphs in center so the export matches the preview', () => {
    const body: Block[] = [
      { id: 'p1', type: 'paragraph', text: 'Centered', align: 'center' },
      { id: 'p2', type: 'paragraph', text: 'Plain' },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toMatch(/\\begin\{center\}\s+Centered\s+\\end\{center\}/);
    expect(tex).not.toMatch(/\\begin\{center\}\s+Plain/);
  });

  it('wraps right-aligned paragraphs in flushright', () => {
    const body: Block[] = [
      { id: 'p1', type: 'paragraph', text: 'Right side', align: 'right' },
      { id: 'p2', type: 'paragraph', text: 'Plain' },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toMatch(/\\begin\{flushright\}\s+Right side\s+\\end\{flushright\}/);
    expect(tex).not.toMatch(/\\begin\{flushright\}\s+Plain/);
  });

  it('adds an explicit hspace for first-line indents, one per TeX paragraph', () => {
    const body: Block[] = [
      { id: 'p1', type: 'paragraph', text: 'One\n\nTwo', indent: 1.5 },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\hspace*{1.5em}One\n\n\\hspace*{1.5em}Two');
  });

  it('keeps blank lines between paragraph parts in the export', () => {
    const body: Block[] = [{ id: 'p1', type: 'paragraph', text: 'First\n\nSecond' }];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('First\n\nSecond');
  });

  it('renders columns with two 0.48 widths', () => {
    const body: Block[] = [
      {
        id: 'cols',
        type: 'columns',
        left: [{ id: 'p1', type: 'paragraph', text: 'Left side' }],
        right: [{ id: 'p2', type: 'paragraph', text: 'Right side' }],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\begin{columns}[T]');
    expect(tex.match(/\\begin\{column\}\{0\.48\\textwidth\}/g)).toHaveLength(2);
    expect(tex).toContain('Left side');
    expect(tex).toContain('Right side');
  });

  it('exports several blocks on each side of a two-column frame', () => {
    const body: Block[] = [
      {
        id: 'cols',
        type: 'columns',
        left: [
          { id: 'p1', type: 'paragraph', text: 'Left A' },
          { id: 'p2', type: 'paragraph', text: 'Left B' },
        ],
        right: [{ id: 'p3', type: 'paragraph', text: 'Right A' }],
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body, { layout: 'two-column' })] }));
    expect(tex.match(/\\begin\{columns\}/g)).toHaveLength(1);
    expect(tex.match(/\\begin\{column\}\{0\.48\\textwidth\}/g)).toHaveLength(2);
    expect(tex).toContain('Left A');
    expect(tex).toContain('Left B');
    expect(tex).toContain('Right A');
  });

  it('renders math blocks and table of contents', () => {
    const body: Block[] = [
      { id: 'm', type: 'math', tex: 'e^{i\\pi} + 1 = 0' },
      { id: 'toc', type: 'toc' },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\[');
    expect(tex).toContain('e^{i\\pi} + 1 = 0');
    expect(tex).toContain('\\]');
    expect(tex).toContain('\\tableofcontents');
  });
});

describe('images in export', () => {
  it('deduplicates file names and scales widths', () => {
    const body: Block[] = [
      {
        id: 'img-1',
        type: 'image',
        src: 'data:image/png;base64,AAAA',
        name: 'chart',
        widthPct: 50,
        caption: 'Sales',
      },
      {
        id: 'img-2',
        type: 'image',
        src: 'data:image/png;base64,BBBB',
        name: 'chart',
        widthPct: 100,
      },
    ];
    const d = deck({ slides: [frame(body)] });
    const images = collectImages(d);
    expect(images.map((image) => image.name)).toEqual(['chart.png', 'chart-2.png']);

    const tex = toLatex(d);
    expect(tex).toContain('\\includegraphics[width=0.50\\textwidth]{chart.png}');
    expect(tex).toContain('\\caption{Sales}');
    expect(tex).toContain('\\includegraphics[width=1.00\\textwidth]{chart-2.png}');
  });

  it('notes images without data instead of emitting includegraphics', () => {
    const body: Block[] = [
      { id: 'img', type: 'image', src: '', name: 'missing', widthPct: 60 },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('% Image "missing" has no attached file.');
    expect(tex).not.toContain('\\includegraphics');
  });
});

describe('sample deck export', () => {
  it('produces a complete document', () => {
    const tex = toLatex(createSampleDeck());
    expect(tex).toContain('\\begin{document}');
    expect(tex).toContain('\\end{document}');
    expect(tex).toContain('\\section{Customization}');
    expect(tex).toContain('\\begin{columns}[T]');
    expect(tex).toContain('\\begin{alertblock}{Clean export}');
  });
});
