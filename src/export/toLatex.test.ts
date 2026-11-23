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
    slides: [
      { id: 'frame-1', kind: 'frame', title: 'Hello', layout: 'normal', body: [], images: [] },
    ],
    ...patch,
  };
}

function frame(body: Block[], extra: Partial<Slide> = {}): Slide {
  return {
    id: 'frame-1',
    kind: 'frame',
    title: 'Frame',
    layout: 'normal',
    body,
    images: [],
    ...extra,
  };
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
          scriptFont: 'auto',
        },
      }),
    );
    expect(tex).toContain('\\setmainlanguage{russian}');
    expect(tex).toContain('\\setotherlanguage{english}');
    expect(tex).toContain('\\setotherlanguage{greek}');
    expect(tex).toContain('\\newfontfamily\\greekfont');
    expect(tex).toContain('\\newfontfamily\\cyrillicfontsf');
  });

  it('uses the main font for script text when it covers the script', () => {
    const tex = toLatex(
      deck({
        theme: { ...DEFAULT_THEME, fontFamily: 'arial' },
        document: { ...DEFAULT_DOCUMENT, otherLanguages: ['russian'], scriptFont: 'auto' },
      }),
    );
    expect(tex).toContain('\\IfFontExistsTF{Arial}{\\bxscriptfonts{Arial}}{%');
    expect(tex.indexOf('\\bxscriptfonts{Arial}')).toBeLessThan(
      tex.indexOf('\\bxscriptfonts{Noto Sans}'),
    );
  });

  it('honors an explicit script font over the main font', () => {
    const tex = toLatex(
      deck({
        theme: { ...DEFAULT_THEME, fontFamily: 'latin-modern-roman' },
        document: { ...DEFAULT_DOCUMENT, otherLanguages: ['russian'], scriptFont: 'segoe-ui' },
      }),
    );
    expect(tex).toContain('\\IfFontExistsTF{Segoe UI}{\\bxscriptfonts{Segoe UI}}{%');
    expect(tex).not.toContain('\\bxscriptfonts{Latin Modern Roman}');
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

describe('script run wrapping', () => {
  const mixed = deck({
    document: { ...DEFAULT_DOCUMENT, otherLanguages: ['russian', 'greek'] },
    slides: [
      frame(
        [
          { id: 'p', type: 'paragraph', text: 'Hello Привет, world! Ελληνικά text' },
          {
            id: 'l',
            type: 'list',
            ordered: false,
            items: [{ id: 'i', text: 'Привет мир', depth: 0 }],
          },
        ],
        { title: 'Frame Привет' },
      ),
    ],
  });

  it('switches language around Greek and Cyrillic runs only', () => {
    const tex = toLatex(mixed);
    expect(tex).toContain('Hello \\textrussian{Привет, }world! \\textgreek{Ελληνικά }text');
    expect(tex).toContain('\\item \\textrussian{Привет мир}');
  });

  it('keeps math and control sequences untouched', () => {
    const tex = toLatex(
      deck({
        document: { ...DEFAULT_DOCUMENT, otherLanguages: ['russian'] },
        slides: [
          frame([
            {
              id: 'p',
              type: 'paragraph',
              text: 'Cost $Привет + 1$ and \\textbf{Привет} stays.',
            },
          ]),
        ],
      }),
    );
    expect(tex).toContain('$Привет + 1$');
    expect(tex).toContain('\\textbf{\\textrussian{Привет}} stays.');
  });

  it('does nothing when no script language is declared', () => {
    const tex = toLatex(
      deck({
        document: { ...DEFAULT_DOCUMENT, otherLanguages: ['german'] },
        slides: [frame([{ id: 'p', type: 'paragraph', text: 'Hello Привет Ελληνικά' }])],
      }),
    );
    expect(tex).not.toContain('\\textrussian');
    expect(tex).not.toContain('\\textgreek');
  });

  it('protects bookmark fields with texorpdfstring', () => {
    const tex = toLatex(
      deck({
        meta: { ...DEFAULT_META, title: 'Отчёт' },
        document: { ...DEFAULT_DOCUMENT, otherLanguages: ['russian'] },
        slides: [frame([], { title: 'Привет' })],
      }),
    );
    expect(tex).toContain('\\title{\\texorpdfstring{\\textrussian{Отчёт}}{Отчёт}}');
    expect(tex).toContain('\\begin{frame}{\\texorpdfstring{\\textrussian{Привет}}{Привет}}{}');
  });

  it('does not wrap block titles as bookmark strings', () => {
    const tex = toLatex(
      deck({
        document: { ...DEFAULT_DOCUMENT, otherLanguages: ['russian'] },
        slides: [
          frame([
            {
              id: 'b',
              type: 'block',
              tone: 'normal',
              title: 'Привет',
              body: [{ id: 'p', type: 'paragraph', text: 'Body' }],
            },
          ]),
        ],
      }),
    );
    expect(tex).toContain('\\begin{block}{\\textrussian{Привет}}');
    expect(tex).not.toContain('\\begin{block}{\\texorpdfstring');
  });
});

describe('toLatex slides', () => {
  it('renders title and section slides', () => {
    const tex = toLatex(
      deck({
        slides: [
          { id: 't', kind: 'title', title: '', layout: 'normal', body: [], images: [] },
          { id: 's', kind: 'section', title: 'Part One', layout: 'normal', body: [], images: [] },
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

  it('marks frames containing code as fragile and exports a listing', () => {
    const body: Block[] = [
      {
        id: 'c',
        type: 'code',
        lang: 'python',
        text: 'const a = 1;',
        caption: 'Example',
        lineNumbers: true,
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body, { title: 'Code' })] }));
    expect(tex).toContain('\\usepackage{listings}');
    expect(tex).toContain('\\begin{frame}[fragile]{Code}{}');
    expect(tex).toContain(
      '\\begin{lstlisting}[breaklines=true,language=Python,numbers=left,numbersep=6pt,caption={Example}]',
    );
    expect(tex).toContain('const a = 1;');
    expect(tex).toContain('\\end{lstlisting}');
    expect(tex).not.toContain('\\begin{verbatim}');
  });

  it('colours keywords, comments, strings and line numbers in listings', () => {
    const body: Block[] = [{ id: 'c', type: 'code', lang: 'python', text: 'return 1' }];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\definecolor{bxcodekeyword}{RGB}{38,84,142}');
    expect(tex).toContain('\\definecolor{bxcodecomment}{RGB}{90,118,92}');
    expect(tex).toContain('\\definecolor{bxcodestring}{RGB}{158,56,62}');
    expect(tex).toContain('keywordstyle=\\color{bxcodekeyword}\\bfseries');
    expect(tex).toContain('commentstyle=\\color{bxcodecomment}\\itshape');
    expect(tex).toContain('stringstyle=\\color{bxcodestring}');
    expect(tex).toContain('numberstyle=\\tiny\\color{black!45}');
  });

  it('expands tabs to spaces instead of emitting ^^I', () => {
    const body: Block[] = [
      {
        id: 'c',
        type: 'code',
        lang: 'python',
        text: 'def f(x):\n\tif x:\n\t\treturn "a"\n',
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('def f(x):\n    if x:\n        return "a"');
    expect(tex).not.toContain('\t');
    expect(tex).not.toContain('^^I');
  });

  it('omits the listings language for catalogs without a dialect', () => {
    const body: Block[] = [{ id: 'c', type: 'code', lang: 'typescript', text: 'let x = 1;' }];
    const tex = toLatex(deck({ slides: [frame(body)] }));
    expect(tex).toContain('\\begin{lstlisting}[breaklines=true]');
    expect(tex).not.toContain('language=');
  });

  it('declares per-slide and per-block fonts and wraps their content', () => {
    const body: Block[] = [
      {
        id: 'p',
        type: 'paragraph',
        text: 'Body text',
        font: { family: 'tex-gyre-pagella' },
      },
    ];
    const tex = toLatex(deck({ slides: [frame(body, { font: { family: 'tex-gyre-heros' } })] }));
    expect(tex).toContain('\\IfFontExistsTF{TeX Gyre Heros}{%');
    expect(tex).toContain('\\newfontfamily\\bxfontA{TeX Gyre Heros}%');
    expect(tex).toContain('\\IfFontExistsTF{TeX Gyre Pagella}{%');
    expect(tex).toContain('\\newfontfamily\\bxfontB{TeX Gyre Pagella}%');
    expect(tex).toContain('  {\\bxfontA\n  {\\bxfontB\n  Body text');
  });

  it('reuses one declaration for identical font overrides', () => {
    const font = { family: 'tex-gyre-heros' as const };
    const body: Block[] = [
      { id: 'p1', type: 'paragraph', text: 'One', font },
      { id: 'p2', type: 'paragraph', text: 'Two', font },
    ];
    const tex = toLatex(deck({ slides: [frame(body, { font })] }));
    expect(tex.match(/\\IfFontExistsTF\{TeX Gyre Heros\}/g)).toHaveLength(1);
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

describe('slide backgrounds', () => {
  const src = 'data:image/png;base64,AAAA';
  const layer = {
    id: 'bg-1',
    src,
    name: 'backdrop.png',
    opacity: 40,
    mode: 'scale' as const,
    scale: 50,
    position: 'top-right' as const,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  };
  const empty = { all: [], title: [], section: [] };
  const title: Slide = {
    id: 't',
    kind: 'title',
    title: '',
    layout: 'normal',
    body: [],
    images: [],
  };

  function backgroundsDeck(backgrounds: Deck['theme']['backgrounds'], slides: Slide[] = [title, frame([], { title: 'Body' })]) {
    return deck({ theme: { ...DEFAULT_THEME, backgrounds }, slides });
  }

  it('emits a reusable canvas template with fill, anchor, opacity and size', () => {
    const tex = toLatex(backgroundsDeck({ ...empty, all: [layer] }));
    expect(tex).toMatch(/\\definecolor\{bxBackgroundFill\}\{HTML\}\{[0-9A-F]{6}\}/);
    expect(tex).toContain('\\usepackage{tikz}');
    expect(tex).toContain('\\usebackgroundtemplate{%');
    expect(tex).toContain('\\fill[bxBackgroundFill] (0,0) rectangle (160.00mm,90.00mm);');
    expect(tex).toContain(
      '\\node[anchor=north east,inner sep=0pt,opacity=0.40] at (160.00mm,90.00mm) {\\includegraphics[width=80.00mm]{backdrop.png}};',
    );
    expect(tex.match(/\\usebackgroundtemplate/g)).toHaveLength(1);
  });

  it('stacks layers in order and applies the manual offsets', () => {
    const logo = {
      ...layer,
      id: 'bg-2',
      name: 'logo.png',
      opacity: 100,
      scale: 20,
      position: 'bottom-right' as const,
      offsetX: -5,
      offsetY: 5,
    };
    const tex = toLatex(backgroundsDeck({ ...empty, all: [layer, logo] }));
    expect(tex).toContain(
      '\\node[anchor=north east,inner sep=0pt,opacity=0.40] at (160.00mm,90.00mm) {\\includegraphics[width=80.00mm]{backdrop.png}};',
    );
    expect(tex).toContain(
      '\\node[anchor=south east,inner sep=0pt,opacity=1.00] at (152.00mm,-4.50mm) {\\includegraphics[width=32.00mm]{logo.png}};',
    );
    expect(tex.indexOf('backdrop.png')).toBeLessThan(tex.indexOf('logo.png'));
    expect(tex.match(/\\usebackgroundtemplate/g)).toHaveLength(1);
  });

  it('rotates background layers around their anchor', () => {
    const tex = toLatex(backgroundsDeck({ ...empty, all: [{ ...layer, rotation: 15 }] }));
    expect(tex).toContain(
      '\\node[anchor=north east,inner sep=0pt,opacity=0.40,rotate=-15] at (160.00mm,90.00mm) {\\includegraphics[width=80.00mm]{backdrop.png}};',
    );
  });

  it('supports fit and stretch sizing', () => {
    const fit = toLatex(backgroundsDeck({ ...empty, all: [{ ...layer, mode: 'fit' }] }));
    expect(fit).toContain('\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio]{backdrop.png}');
    const stretch = toLatex(backgroundsDeck({ ...empty, all: [{ ...layer, mode: 'stretch' }] }));
    expect(stretch).toContain('\\includegraphics[width=\\paperwidth,height=\\paperheight]{backdrop.png}');
  });

  it('uses the title override and restores the shared stack', () => {
    const tex = toLatex(
      backgroundsDeck({
        ...empty,
        all: [layer],
        title: [{ ...layer, id: 'bg-t', name: 'title-bg.png' }],
      }),
    );
    expect(tex).toContain('{title-bg.png}');
    expect(tex).toContain('{backdrop.png}');
    expect(tex.indexOf('{title-bg.png}')).toBeLessThan(tex.indexOf('{backdrop.png}'));
  });

  it('fills the canvas when only title pages have an image', () => {
    const tex = toLatex(backgroundsDeck({ ...empty, title: [layer] }));
    expect(tex).toContain('{backdrop.png}');
    expect(tex).toContain('\\fill[bxBackgroundFill]');
  });

  it('renders no background machinery when no image is set', () => {
    const tex = toLatex(deck());
    expect(tex).not.toContain('\\usebackgroundtemplate');
    expect(tex).not.toContain('bxBackgroundFill');
  });

  it('collects background layers with stable keys', () => {
    const images = collectImages(
      backgroundsDeck({
        ...empty,
        all: [layer, { ...layer, id: 'bg-2', name: 'logo.png' }],
        title: [{ ...layer, id: 'bg-t', name: 'title-bg.png' }],
      }),
    );
    expect(images.map((entry) => [entry.key, entry.name])).toEqual([
      ['bg:all:0', 'backdrop.png'],
      ['bg:all:1', 'logo.png'],
      ['bg:title:0', 'title-bg.png'],
    ]);
  });
});

describe('slide foregrounds', () => {
  const src = 'data:image/png;base64,AAAA';
  const layer = {
    id: 'fg-1',
    src,
    name: 'seal.png',
    opacity: 40,
    mode: 'scale' as const,
    scale: 50,
    position: 'top-right' as const,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  };
  const empty = { all: [], title: [], section: [] };

  function foregroundsDeck(
    foregrounds: Deck['theme']['foregrounds'],
    slides: Slide[] = [frame([], { title: 'Body' })],
  ) {
    return deck({ theme: { ...DEFAULT_THEME, foregrounds }, slides });
  }

  it('emits a page-anchored shipout hook and the node stack', () => {
    const tex = toLatex(foregroundsDeck({ ...empty, all: [layer] }));
    expect(tex).toContain('\\usepackage{tikz}');
    expect(tex).toContain('\\newcommand{\\bxForeground}{}');
    expect(tex).toContain('\\AddToHook{shipout/foreground}{%');
    expect(tex).toContain('\\begin{tikzpicture}[remember picture,overlay]');
    expect(tex).toContain('\\renewcommand{\\bxForeground}{%');
    expect(tex).toContain(
      '\\node[anchor=north east,inner sep=0pt,opacity=0.40] at ([xshift=160.00mm,yshift=0.00mm]current page.north west) {\\includegraphics[width=80.00mm]{seal.png}};%',
    );
  });

  it('applies manual offsets and rotates clockwise in tikz terms', () => {
    const tex = toLatex(
      foregroundsDeck({
        ...empty,
        all: [{ ...layer, position: 'bottom-left', offsetX: -5, offsetY: 10, rotation: 30 }],
      }),
    );
    expect(tex).toContain(
      '\\node[anchor=south west,inner sep=0pt,opacity=0.40,rotate=-30] at ([xshift=-8.00mm,yshift=-99.00mm]current page.north west) {\\includegraphics[width=80.00mm]{seal.png}};%',
    );
  });

  it('supports fit and stretch sizing above the content', () => {
    const fit = toLatex(foregroundsDeck({ ...empty, all: [{ ...layer, mode: 'fit' }] }));
    expect(fit).toContain('\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio]{seal.png}');
    const stretch = toLatex(foregroundsDeck({ ...empty, all: [{ ...layer, mode: 'stretch' }] }));
    expect(stretch).toContain('\\includegraphics[width=\\paperwidth,height=\\paperheight]{seal.png}');
  });

  it('switches overlays per slide and clears them when a page has none', () => {
    const tex = toLatex(
      foregroundsDeck(
        { ...empty, title: [{ ...layer, name: 'cover.png' }] },
        [
          { id: 't', kind: 'title', title: '', layout: 'normal', body: [], images: [] },
          frame([], { title: 'Body' }),
        ],
      ),
    );
    expect(tex).toContain('{cover.png}');
    expect(tex).not.toContain('{seal.png}');
    const cleared = tex.lastIndexOf('\\renewcommand{\\bxForeground}{}');
    expect(cleared).toBeGreaterThan(tex.indexOf('{cover.png}'));
  });

  it('renders no foreground machinery when no image is set', () => {
    const tex = toLatex(deck());
    expect(tex).not.toContain('\\AddToHook{shipout/foreground}');
    expect(tex).not.toContain('\\bxForeground');
  });

  it('collects foreground layers with stable keys', () => {
    const images = collectImages(
      foregroundsDeck({
        ...empty,
        all: [layer, { ...layer, id: 'fg-2', name: 'badge.png' }],
        section: [{ ...layer, id: 'fg-s', name: 'part.png' }],
      }),
    );
    expect(images.map((entry) => [entry.key, entry.name])).toEqual([
      ['fg:all:0', 'seal.png'],
      ['fg:all:1', 'badge.png'],
      ['fg:section:0', 'part.png'],
    ]);
  });
});

describe('per-slide image layers', () => {
  const src = 'data:image/png;base64,DDDD';
  const layer = {
    id: 'fs-1',
    src,
    name: 'stamp.png',
    opacity: 60,
    mode: 'scale' as const,
    scale: 25,
    position: 'bottom-right' as const,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  };

  it('emits an overlay for the owning slide only', () => {
    const tex = toLatex(
      deck({
        slides: [
          frame([], { id: 'one', title: 'One', images: [layer] }),
          frame([], { id: 'two', title: 'Two' }),
        ],
      }),
    );
    expect(tex).toContain('\\AddToHook{shipout/foreground}');
    expect(tex).toContain(
      '\\node[anchor=south east,inner sep=0pt,opacity=0.60] at ([xshift=160.00mm,yshift=-90.00mm]current page.north west) {\\includegraphics[width=40.00mm]{stamp.png}};%',
    );
    const cleared = tex.lastIndexOf('\\renewcommand{\\bxForeground}{}');
    expect(cleared).toBeGreaterThan(tex.indexOf('{stamp.png}'));
  });

  it('draws slide layers above the shared foreground stack', () => {
    const tex = toLatex(
      deck({
        theme: {
          ...DEFAULT_THEME,
          foregrounds: {
            all: [{ ...layer, id: 'fg-x', name: 'seal.png' }],
            title: [],
            section: [],
          },
        },
        slides: [frame([], { images: [layer] })],
      }),
    );
    expect(tex.indexOf('{seal.png}')).toBeLessThan(tex.indexOf('{stamp.png}'));
    expect(tex.match(/\\renewcommand\{\\bxForeground\}/g)).toHaveLength(1);
  });

  it('collects slide layers with fs keys', () => {
    const images = collectImages(
      deck({
        slides: [
          frame([], {
            id: 's1',
            images: [layer, { ...layer, id: 'fs-2', name: 'badge.png' }],
          }),
        ],
      }),
    );
    expect(images.map((entry) => [entry.key, entry.name])).toEqual([
      ['fs:s1:0', 'stamp.png'],
      ['fs:s1:1', 'badge.png'],
    ]);
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

describe('tikz drawings', () => {
  const drawing = {
    width: 80,
    height: 50,
    shapes: [
      { id: 'r1', kind: 'rect' as const, x: 10, y: 10, x2: 40, y2: 30 },
      {
        id: 't1',
        kind: 'text' as const,
        x: 40,
        y: 44,
        text: 'A & B',
        fontSize: 4,
      },
    ],
  };

  it('exports a TikZ content block as a centered resized picture', () => {
    const tex = toLatex(
      deck({
        slides: [
          frame([
            {
              id: 'tz1',
              type: 'tikz',
              name: 'Chart',
              widthPct: 60,
              drawing,
            },
          ]),
        ],
      }),
    );
    expect(tex).toContain('\\usepackage{tikz}');
    expect(tex).toContain('\\begin{center}');
    expect(tex).toContain('\\resizebox{0.60\\textwidth}{!}{%');
    expect(tex).toContain('\\begin{tikzpicture}[x=1mm,y=1mm]');
    expect(tex).toContain('\\useasboundingbox (0,0) rectangle (80.00mm,50.00mm);');
    expect(tex).toContain('rectangle (40,20);');
    expect(tex).toContain('{A \\& B};');
    expect(tex).not.toContain('\\includegraphics');
  });

  it('skips empty drawings and only loads tikz when something is drawn', () => {
    const empty = toLatex(deck());
    expect(empty).not.toContain('\\usepackage{tikz}');
    const blank = toLatex(
      deck({
        slides: [
          frame([
            {
              id: 'tz1',
              type: 'tikz',
              name: 'Blank',
              widthPct: 70,
              drawing: { width: 80, height: 50, shapes: [] },
            },
          ]),
        ],
      }),
    );
    expect(blank).not.toContain('\\usepackage{tikz}');
    expect(blank).toContain('% TikZ drawing "Blank" has no shapes.');
  });

  it('wraps vector layers in a positioned resizebox node', () => {
    const layer = {
      id: 'bg-tz',
      kind: 'tikz' as const,
      src: '',
      name: 'Vector',
      opacity: 100,
      mode: 'scale' as const,
      scale: 50,
      position: 'center' as const,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      drawing: { width: 100, height: 50, shapes: drawing.shapes },
    };
    const tex = toLatex(
      deck({
        theme: { ...DEFAULT_THEME, backgrounds: { all: [layer], title: [], section: [] } },
        slides: [frame([])],
      }),
    );
    expect(tex).toContain(
      '\\node[anchor=center,inner sep=0pt,opacity=1.00] at (80.00mm,45.00mm) {%',
    );
    expect(tex).toContain('\\begin{tikzpicture}[x=0.80mm,y=0.80mm]');
    expect(tex).toContain('\\useasboundingbox (0,0) rectangle (100,50);');
    expect(tex).not.toContain('\\resizebox');
    expect(collectImages(deck({
      theme: { ...DEFAULT_THEME, backgrounds: { all: [layer], title: [], section: [] } },
    }))).toEqual([]);
  });
});
