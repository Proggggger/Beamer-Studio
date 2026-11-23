import { describe, expect, it } from 'vitest';
import { createSampleDeck } from '../model/defaults';
import type { Block, Slide } from '../model/types';
import { toLatex } from '../export/toLatex';
import { importBeamer } from './fromLatex';

function slidesOf(source: string): { slides: Slide[]; warnings: string[] } {
  const { deck, warnings } = importBeamer(source);
  return { slides: deck.slides, warnings };
}

function bodyOf(slide: Slide | undefined): Block[] {
  if (!slide) throw new Error('missing slide');
  return slide.body;
}

describe('importBeamer preamble', () => {
  it('maps document class options, metadata, theme and colors', () => {
    const { deck } = importBeamer(String.raw`\documentclass[aspectratio=169,12pt]{beamer}
\usetheme{Berlin}
\usecolortheme{dolphin}
\title{My talk}
\subtitle{Sub}
\author{Ada \and Bob}
\institute{Lab}
\date{2026}
\setmainlanguage{german}
\setotherlanguage{french}
\setbeamertemplate{navigation symbols}{}
\begin{document}
\begin{frame}{One}x\end{frame}
\end{document}`);
    expect(deck.aspect).toBe('169');
    expect(deck.document.fontSize).toBe(12);
    expect(deck.document.mainLanguage).toBe('german');
    expect(deck.document.otherLanguages).toEqual(['french']);
    expect(deck.theme.template).toBe('Berlin');
    expect(deck.theme.colorTheme).toBe('dolphin');
    expect(deck.theme.navigationSymbols).toBe(false);
    expect(deck.meta).toMatchObject({
      title: 'My talk',
      subtitle: 'Sub',
      author: 'Ada, Bob',
      institute: 'Lab',
      date: '2026',
    });
  });

  it('maps babel languages and custom fonts', () => {
    const { deck, warnings } = importBeamer(String.raw`\documentclass{beamer}
\usepackage[ngerman,french,english]{babel}
\setsansfont{Comic Sans MS}
\begin{document}
\begin{frame}{One}x\end{frame}
\end{document}`);
    expect(deck.document.mainLanguage).toBe('english');
    expect(deck.document.otherLanguages).toEqual(['german', 'french']);
    expect(deck.theme.fontFamily).toBe('custom');
    expect(deck.theme.customFont).toBe('Comic Sans MS');
    expect(warnings.some((warning) => warning.includes('custom family'))).toBe(true);
  });

  it('reads bx custom colors and block templates', () => {
    const { deck } = importBeamer(String.raw`\documentclass{beamer}
\definecolor{bxStructure}{HTML}{123456}
\definecolor{bxAlert}{RGB}{255,0,0}
\setbeamertemplate{blocks}[rounded][shadow=false]
\setbeamertemplate{itemize item}{$\blacksquare$}
\begin{document}
\begin{frame}{One}x\end{frame}
\end{document}`);
    expect(deck.theme.custom.enabled).toBe(true);
    expect(deck.theme.custom.structure).toBe('#123456');
    expect(deck.theme.custom.alert).toBe('#ff0000');
    expect(deck.theme.blockShape).toBe('rounded');
    expect(deck.theme.blockShadow).toBe(false);
    expect(deck.theme.bulletShape).toBe('square');
  });
});

describe('importBeamer document structure', () => {
  it('creates title, section and content slides from frames', () => {
    const source = String.raw`\documentclass{beamer}
\title{Talk}
\begin{document}
\begin{frame}[plain]\titlepage\end{frame}
\section{Intro}
\begin{frame}\sectionpage\end{frame}
\begin{frame}{Content}{Subtitle}
Body text.
\end{frame}
\end{document}`;
    const { slides } = slidesOf(source);
    expect(slides.map((slide) => slide.kind)).toEqual(['title', 'section', 'frame']);
    expect(slides[1].title).toBe('Intro');
    expect(slides[2].title).toBe('Content');
    expect(slides[2].subtitle).toBe('Subtitle');
    expect(bodyOf(slides[2])[0]).toMatchObject({ type: 'paragraph', text: 'Body text.' });
  });

  it('does not duplicate section slides for sectionpage frames with formatting only', () => {
    const source = String.raw`\begin{document}
\section{Part}
\begin{frame}
{\fontfamily{lmss}\selectfont
\sectionpage
}
\end{frame}
\end{document}`;
    const { slides } = slidesOf(source);
    expect(slides.map((slide) => slide.kind)).toEqual(['section']);
  });

  it('parses legacy \frame, \frametitle and \framesubtitle', () => {
    const source = String.raw`\begin{document}
\frame{\frametitle{Legacy}\framesubtitle{Sub}
Item text.
}
\end{document}`;
    const { slides } = slidesOf(source);
    expect(slides[0].title).toBe('Legacy');
    expect(slides[0].subtitle).toBe('Sub');
    expect(bodyOf(slides[0])[0]).toMatchObject({ type: 'paragraph', text: 'Item text.' });
  });

  it('strips comments but keeps escaped percent and verbatim content', () => {
    const source = String.raw`\begin{document}
\begin{frame}{One}
50\% done % this comment disappears
\begin{verbatim}
keep % this line
\end{verbatim}
\end{frame}
\end{document}`;
    const { slides } = slidesOf(source);
    const body = bodyOf(slides[0]);
    expect(body[0]).toMatchObject({ type: 'paragraph' });
    expect((body[0] as { text: string }).text).toBe('50\\% done');
    expect(body[1]).toMatchObject({ type: 'code', text: 'keep % this line' });
  });
});

describe('importBeamer blocks', () => {
  it('parses nested lists with pause markers', () => {
    const source = String.raw`\begin{document}
\begin{frame}{Lists}
\begin{itemize}
\item First
\pause
\item Second
\begin{enumerate}
\item Nested
\end{enumerate}
\item Third
\end{itemize}
\end{frame}
\end{document}`;
    const block = bodyOf(slidesOf(source).slides[0])[0];
    if (block.type !== 'list') throw new Error('expected list');
    expect(block.ordered).toBe(false);
    expect(block.items.map((item) => [item.text, item.depth, item.pause ?? false])).toEqual([
      ['First', 0, false],
      ['Second', 0, true],
      ['Nested', 1, false],
      ['Third', 0, false],
    ]);
  });

  it('parses description labels as bold prefixes', () => {
    const source = String.raw`\begin{document}
\begin{frame}{D}
\begin{description}
\item[Alpha] first
\item[Beta] second
\end{description}
\end{frame}
\end{document}`;
    const block = bodyOf(slidesOf(source).slides[0])[0];
    if (block.type !== 'list') throw new Error('expected list');
    expect(block.items.map((item) => item.text)).toEqual([
      '\\textbf{Alpha} first',
      '\\textbf{Beta} second',
    ]);
  });

  it('parses blocks, alert blocks and theorem environments', () => {
    const source = String.raw`\begin{document}
\begin{frame}{B}
\begin{block}{Normal}
Body
\end{block}
\begin{alertblock}<2->{Careful}
Watch out
\end{alertblock}
\begin{exampleblock}{Sample}
Try it
\end{exampleblock}
\begin{theorem}[Pythagoras]
$a^2+b^2=c^2$
\end{theorem}
\end{frame}
\end{document}`;
    const body = bodyOf(slidesOf(source).slides[0]);
    expect(body[0]).toMatchObject({ type: 'block', tone: 'normal', title: 'Normal' });
    expect(body[1]).toMatchObject({ type: 'block', tone: 'alert', title: 'Careful' });
    expect(body[2]).toMatchObject({ type: 'block', tone: 'example', title: 'Sample' });
    expect(body[3]).toMatchObject({
      type: 'block',
      tone: 'normal',
      title: 'Theorem: Pythagoras',
    });
  });

  it('parses columns and strips the column width argument', () => {
    const source = String.raw`\begin{document}
\begin{frame}{C}
\begin{columns}[T]
\begin{column}{0.48\textwidth}
Left text
\end{column}
\begin{column}{0.48\textwidth}
Right text
\end{column}
\end{columns}
\end{frame}
\end{document}`;
    const block = bodyOf(slidesOf(source).slides[0])[0];
    if (block.type !== 'columns') throw new Error('expected columns');
    expect(block.left).toEqual([expect.objectContaining({ type: 'paragraph', text: 'Left text' })]);
    expect(block.right).toEqual([
      expect.objectContaining({ type: 'paragraph', text: 'Right text' }),
    ]);
  });

  it('parses paragraphs with alignment and indentation', () => {
    const source = String.raw`\begin{document}
\begin{frame}{P}
\begin{center}
Centered
\end{center}
\begin{flushright}
Right
\end{flushright}
\hspace*{2em}Indented
\end{frame}
\end{document}`;
    const body = bodyOf(slidesOf(source).slides[0]);
    expect(body[0]).toMatchObject({ type: 'paragraph', align: 'center' });
    expect(body[1]).toMatchObject({ type: 'paragraph', align: 'right' });
    expect(body[2]).toMatchObject({ type: 'paragraph', indent: 2 });
  });

  it('parses math environments and inline math', () => {
    const source = String.raw`\begin{document}
\begin{frame}{M}
\[ 
e^{i\pi}+1=0
\]
\begin{align*}
x &= 1
\end{align*}
Inline $\alpha^2$ stays.
\end{frame}
\end{document}`;
    const body = bodyOf(slidesOf(source).slides[0]);
    expect(body[0]).toMatchObject({ type: 'math', tex: 'e^{i\\pi}+1=0' });
    expect((body[1] as { tex: string }).tex).toContain('\\begin{aligned}');
    expect((body[2] as { text: string }).text).toContain('$\\alpha^2$');
  });

  it('parses code listings with language and line numbers', () => {
    const source = String.raw`\begin{document}
\begin{frame}[fragile]{Code}
\begin{lstlisting}[language=Python,numbers=left,caption={Sample}]
def f():
    return 1
\end{lstlisting}
\end{frame}
\end{document}`;
    const block = bodyOf(slidesOf(source).slides[0])[0];
    expect(block).toMatchObject({
      type: 'code',
      lang: 'python',
      text: 'def f():\n    return 1',
      caption: 'Sample',
      lineNumbers: true,
    });
  });

  it('imports images as placeholders with a warning', () => {
    const source = String.raw`\begin{document}
\begin{frame}{Img}
\includegraphics[width=0.5\textwidth]{figures/chart.png}
\end{frame}
\end{document}`;
    const { slides, warnings } = slidesOf(source);
    expect(bodyOf(slides[0])[0]).toMatchObject({
      type: 'image',
      name: 'chart.png',
      widthPct: 50,
      src: '',
    });
    expect(warnings.some((warning) => warning.includes('placeholder'))).toBe(true);
  });

  it('parses table floats with booktabs captions and alignment', () => {
    const source = String.raw`\begin{document}
\begin{frame}{Tables}
\begin{table}
\centering
\begin{tabular}{lcr}
\toprule
Name & Count & Cost \\
\midrule
A & 1 & 2.5 \\
B & 2 & 3.0 \\
\bottomrule
\end{tabular}
\caption{Sample table}
\end{table}
\end{frame}
\end{document}`;
    const block = bodyOf(slidesOf(source).slides[0])[0];
    expect(block).toMatchObject({
      type: 'table',
      rows: [
        ['Name', 'Count', 'Cost'],
        ['A', '1', '2.5'],
        ['B', '2', '3.0'],
      ],
      align: ['left', 'center', 'right'],
      header: true,
      caption: 'Sample table',
    });
    expect(Boolean((block as { bordered?: boolean }).bordered)).toBe(false);
  });

  it('imports a bordered tabular with multicolumn cells', () => {
    const source = String.raw`\begin{document}
\begin{frame}{T}
\begin{tabular}{|l|l|}
\hline
A & B \\
\hline
\multicolumn{2}{|c|}{Wide} \\
\hline
\end{tabular}
\end{frame}
\end{document}`;
    const block = bodyOf(slidesOf(source).slides[0])[0];
    expect(block).toMatchObject({
      type: 'table',
      rows: [
        ['A', 'B'],
        ['Wide', ''],
      ],
      bordered: true,
    });
  });

  it('unwraps resizebox around tikzpicture blocks', () => {
    const source = String.raw`\begin{document}
\begin{frame}{TikZ}
\begin{center}
\centering
\resizebox{0.6\textwidth}{!}{%
\begin{tikzpicture}[x=1mm,y=1mm]
\useasboundingbox (0,0) rectangle (40mm,30mm);
\draw[thick] (5,5) -- (35,25);
\node at (20,15) {Hi};
\end{tikzpicture}%
}
\end{center}
\end{frame}
\end{document}`;
    const body = bodyOf(slidesOf(source).slides[0]);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ type: 'tikz', name: 'Imported TikZ' });
    const drawing = (body[0] as { drawing: { shapes: unknown[] } }).drawing;
    expect(drawing.shapes.length).toBeGreaterThan(0);
  });

  it('drops color override scaffolding around styled blocks', () => {
    const source = String.raw`\begin{document}
\begin{frame}{Styled}
{%
\definecolor{bxBlockA}{HTML}{112233}
\setbeamercolor{block title}{bg=bxBlockA}
\begin{block}{Title}
Body
\end{block}
}
\end{frame}
\end{document}`;
    const body = bodyOf(slidesOf(source).slides[0]);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ type: 'block', title: 'Title' });
  });

  it('imports table of contents and unknown environments as plain blocks', () => {
    const source = String.raw`\begin{document}
\begin{frame}{Misc}
\tableofcontents
\begin{mystery}
Inside
\end{mystery}
\end{frame}
\end{document}`;
    const { slides, warnings } = slidesOf(source);
    const body = bodyOf(slides[0]);
    expect(body[0]).toMatchObject({ type: 'toc' });
    expect(body[1]).toMatchObject({ type: 'paragraph', text: 'Inside' });
    expect(warnings.some((warning) => warning.includes('mystery'))).toBe(true);
  });
});

describe('importBeamer round trip', () => {
  it('re-imports the sample deck exported by toLatex', () => {
    const original = createSampleDeck();
    const { deck, warnings } = importBeamer(toLatex(original));

    expect(deck.meta.title).toBe(original.meta.title);
    expect(deck.meta.subtitle).toBe(original.meta.subtitle);
    expect(deck.meta.author).toBe(original.meta.author);
    expect(deck.aspect).toBe(original.aspect);
    expect(deck.theme.template).toBe(original.theme.template);
    expect(deck.theme.colorTheme).toBe(original.theme.colorTheme);
    expect(deck.document.fontSize).toBe(original.document.fontSize);
    expect(deck.slides.map((slide) => slide.kind)).toEqual(
      original.slides.map((slide) => slide.kind),
    );
    expect(deck.slides.map((slide) => slide.title)).toEqual(
      original.slides.map((slide) => slide.title),
    );

    const originalList = original.slides[1].body[0];
    const importedList = deck.slides[1].body[0];
    if (originalList.type !== 'list' || importedList.type !== 'list') {
      throw new Error('expected lists');
    }
    expect(importedList.items.map((item) => [item.text, item.depth])).toEqual(
      originalList.items.map((item) => [item.text, item.depth]),
    );

    const originalRich = original.slides[3].body;
    const importedRich = deck.slides[3].body;
    expect(importedRich.map((block) => block.type)).toEqual(
      originalRich.map((block) => block.type),
    );
    const math = importedRich.find((block) => block.type === 'math');
    expect(math).toMatchObject({ tex: 'e^{i\\pi} + 1 = 0' });
    const paragraph = importedRich.find((block) => block.type === 'paragraph');
    expect(paragraph).toMatchObject({ align: 'center' });
    expect((paragraph as { text: string }).text).toContain('$\\alpha^2 + \\beta^2$');
    expect(
      warnings.filter(
        (warning) =>
          warning.includes('not modeled') || warning.includes('could not be parsed'),
      ),
    ).toEqual([]);
  });

  it('round-trips tables, code and TikZ blocks', () => {
    const deck = createSampleDeck();
    deck.slides.push({
      id: 'extra',
      kind: 'frame',
      title: 'Extras',
      layout: 'normal',
      images: [],
      body: [
        {
          id: 'table',
          type: 'table',
          rows: [
            ['A', 'B & C'],
            ['1', '50%'],
          ],
          align: ['left', 'center'],
          header: true,
          caption: 'Numbers',
        },
        {
          id: 'code',
          type: 'code',
          lang: 'python',
          text: 'print("hi")',
          lineNumbers: true,
        },
        {
          id: 'tikz',
          type: 'tikz',
          name: 'Drawing',
          widthPct: 60,
          drawing: {
            width: 60,
            height: 40,
            shapes: [
              {
                id: 's1',
                kind: 'rect',
                x: 4,
                y: 4,
                x2: 36,
                y2: 24,
                stroke: '#000000',
                fill: 'none',
                strokeWidth: 0.8,
                text: 'Box',
              },
            ],
          },
        },
      ],
    });
    const { deck: imported, warnings } = importBeamer(toLatex(deck));
    expect(imported.slides).toHaveLength(deck.slides.length);
    const extras = imported.slides[imported.slides.length - 1].body;
    const types = extras.map((block) => block.type);
    expect(types).toEqual(['table', 'code', 'tikz']);
    expect(extras[0]).toMatchObject({
      rows: [
        ['A', 'B \\& C'],
        ['1', '50\\%'],
      ],
      caption: 'Numbers',
    });
    expect(extras[1]).toMatchObject({ lang: 'python', text: 'print("hi")' });
    const tikz = extras[2] as { drawing: { shapes: Array<{ text?: string }> } };
    expect(tikz.drawing.shapes.some((shape) => shape.text === 'Box')).toBe(true);
    expect(warnings.filter((warning) => warning.includes('not modeled'))).toEqual([]);
  });
});

describe('importBeamer errors', () => {
  it('rejects empty input', () => {
    expect(() => importBeamer('   \n  ')).toThrow(/empty/i);
  });

  it('rejects sources without frames', () => {
    expect(() =>
      importBeamer(String.raw`\documentclass{article}
\begin{document}
Just text.
\end{document}`),
    ).toThrow(/No Beamer frames/i);
  });
});
