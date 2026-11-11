import { splitParagraphs } from '../model/paragraphs';
import type { Block, BlockColorOverrides, BlockTone, Deck, ImageBlock, Item, Slide } from '../model/types';
import { themeSpec } from '../themes/beamerThemes';
import { readableOn, shade } from '../themes/colorMath';
import { resolveTheme } from '../themes/resolve';

const INDENT = '  ';

function hexTriple(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '0,0,0';
  const value = match[1];
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).join(',');
}

function htmlHex(hex: string): string {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '000000';
  const value = match[1];
  return (value.length === 3 ? value.split('').map((char) => char + char).join('') : value).toUpperCase();
}

function blockColorTargets(tone: BlockTone): { title: string; body: string } {
  if (tone === 'alert') return { title: 'block title alerted', body: 'block body alerted' };
  if (tone === 'example') return { title: 'block title example', body: 'block body example' };
  return { title: 'block title', body: 'block body' };
}

function blockColorSet(
  colors: BlockColorOverrides,
  part: 'title' | 'body',
  target: string,
  define: (suffix: string, value: string) => string,
): string | null {
  const bg = part === 'title' ? colors.titleBg : colors.bodyBg;
  const fg = part === 'title' ? colors.titleFg : colors.bodyFg;
  const spec: string[] = [];
  if (bg) spec.push(`bg=${define(part === 'title' ? 'TitleBg' : 'BodyBg', bg)}`);
  if (fg) spec.push(`fg=${define(part === 'title' ? 'TitleFg' : 'BodyFg', fg)}`);
  return spec.length > 0 ? `\\setbeamercolor{${target}}{${spec.join(',')}}` : null;
}

function pad(level: number): string {
  return INDENT.repeat(level);
}

export function latexImageName(name: string, fallback = 1): string {
  const raw = name.trim() || `image-${fallback}`;
  const cleaned =
    raw
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '') || `image-${fallback}`;
  return /\.(png|jpe?g|pdf|eps|gif|svg)$/i.test(cleaned) ? cleaned : `${cleaned}.png`;
}

function hasCode(blocks: Block[]): boolean {
  return blocks.some((block) => {
    if (block.type === 'code') return true;
    if (block.type === 'block') return hasCode(block.body);
    if (block.type === 'columns') return hasCode(block.left) || hasCode(block.right);
    return false;
  });
}

export interface LatexImage {
  name: string;
  dataUrl: string;
  block: ImageBlock;
}

export function collectImages(deck: Deck): LatexImage[] {
  const images: LatexImage[] = [];
  const used = new Map<string, number>();
  const visit = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === 'image') {
        if (!block.src) continue;
        let name = latexImageName(block.name, images.length + 1);
        const count = (used.get(name) ?? 0) + 1;
        used.set(name, count);
        if (count > 1) {
          const dot = name.lastIndexOf('.');
          name = `${name.slice(0, dot)}-${count}${name.slice(dot)}`;
        }
        images.push({ name, dataUrl: block.src, block });
      } else if (block.type === 'block') {
        visit(block.body);
      } else if (block.type === 'columns') {
        visit(block.left);
        visit(block.right);
      }
    }
  };
  for (const slide of deck.slides) visit(slide.body);
  return images;
}

function renderList(
  items: Item[],
  ordered: boolean,
  lines: string[],
  level: number,
): void {
  const env = ordered ? 'enumerate' : 'itemize';
  lines.push(`${pad(level)}\\begin{${env}}`);
  let depth = 0;
  items.forEach((item, index) => {
    const target = index === 0 ? 0 : Math.min(item.depth, depth + 1);
    while (depth < target) {
      depth += 1;
      lines.push(`${pad(level + depth)}\\begin{${env}}`);
    }
    while (depth > target) {
      lines.push(`${pad(level + depth)}\\end{${env}}`);
      depth -= 1;
    }
    if (item.pause) lines.push(`${pad(level + depth + 1)}\\pause`);
    lines.push(`${pad(level + depth + 1)}\\item ${item.text}`);
  });
  while (depth > 0) {
    lines.push(`${pad(level + depth)}\\end{${env}}`);
    depth -= 1;
  }
  lines.push(`${pad(level)}\\end{${env}}`);
}

/** beamer keeps \parindent at 0pt, so indent gets an explicit horizontal box. */
function paragraphText(text: string, indent?: number): string {
  if (!indent || indent <= 0) return text;
  const prefix = `\\hspace*{${Number(indent.toFixed(2))}em}`;
  return splitParagraphs(text)
    .map((part) => `${prefix}${part.replace(/^[ \t]+/, '')}`)
    .join('\n\n');
}

function renderBlocks(
  blocks: Block[],
  lines: string[],
  level: number,
  imageNames: Map<string, string>,
): void {
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph': {
        const text = paragraphText(block.text, block.indent);
        const env =
          block.align === 'center' ? 'center' : block.align === 'right' ? 'flushright' : null;
        if (env) {
          lines.push(`${pad(level)}\\begin{${env}}`);
          lines.push(`${pad(level + 1)}${text}`);
          lines.push(`${pad(level)}\\end{${env}}`);
        } else {
          lines.push(`${pad(level)}${text}`);
        }
        lines.push('');
        break;
      }
      case 'list':
        renderList(block.items, block.ordered, lines, level);
        lines.push('');
        break;
      case 'block': {
        const env =
          block.tone === 'alert' ? 'alertblock' : block.tone === 'example' ? 'exampleblock' : 'block';
        const colors = block.colors;
        const hasOverride = Boolean(
          colors && (colors.titleBg || colors.titleFg || colors.bodyBg || colors.bodyFg),
        );
        if (!hasOverride) {
          lines.push(`${pad(level)}\\begin{${env}}{${block.title}}`);
          renderBlocks(block.body, lines, level + 1, imageNames);
          lines.push(`${pad(level)}\\end{${env}}`);
          lines.push('');
          break;
        }
        const targets = blockColorTargets(block.tone);
        const nameBase = `bxBlock${block.id.replace(/[^A-Za-z0-9]/g, '')}`;
        const define = (suffix: string, value: string): string => {
          const name = `${nameBase}${suffix}`;
          lines.push(`${pad(level + 1)}\\definecolor{${name}}{HTML}{${htmlHex(value)}}`);
          return name;
        };
        lines.push(`${pad(level)}{%`);
        const titleSpec = blockColorSet(colors ?? {}, 'title', targets.title, define);
        if (titleSpec) lines.push(`${pad(level + 1)}${titleSpec}`);
        const bodySpec = blockColorSet(colors ?? {}, 'body', targets.body, define);
        if (bodySpec) lines.push(`${pad(level + 1)}${bodySpec}`);
        lines.push(`${pad(level + 1)}\\begin{${env}}{${block.title}}`);
        renderBlocks(block.body, lines, level + 2, imageNames);
        lines.push(`${pad(level + 1)}\\end{${env}}`);
        lines.push(`${pad(level)}}`);
        lines.push('');
        break;
      }
      case 'columns':
        lines.push(`${pad(level)}\\begin{columns}[T]`);
        lines.push(`${pad(level + 1)}\\begin{column}{0.48\\textwidth}`);
        renderBlocks(block.left, lines, level + 2, imageNames);
        lines.push(`${pad(level + 1)}\\end{column}`);
        lines.push(`${pad(level + 1)}\\begin{column}{0.48\\textwidth}`);
        renderBlocks(block.right, lines, level + 2, imageNames);
        lines.push(`${pad(level + 1)}\\end{column}`);
        lines.push(`${pad(level)}\\end{columns}`);
        lines.push('');
        break;
      case 'image': {
        const name = imageNames.get(block.id) ?? latexImageName(block.name);
        if (!block.src) {
          lines.push(`${pad(level)}% Image "${block.name}" has no attached file.`);
          break;
        }
        const width = Math.max(10, Math.min(100, block.widthPct)) / 100;
        if (block.caption) {
          lines.push(`${pad(level)}\\begin{figure}`);
          lines.push(`${pad(level + 1)}\\centering`);
          lines.push(
            `${pad(level + 1)}\\includegraphics[width=${width.toFixed(2)}\\textwidth]{${name}}`,
          );
          lines.push(`${pad(level + 1)}\\caption{${block.caption}}`);
          lines.push(`${pad(level)}\\end{figure}`);
        } else {
          lines.push(
            `${pad(level)}\\includegraphics[width=${width.toFixed(2)}\\textwidth]{${name}}`,
          );
        }
        lines.push('');
        break;
      }
      case 'math':
        lines.push(`${pad(level)}\\[`);
        lines.push(`${pad(level + 1)}${block.tex}`);
        lines.push(`${pad(level)}\\]`);
        lines.push('');
        break;
      case 'code':
        lines.push(`${pad(level)}\\begin{verbatim}`);
        for (const row of block.text.split('\n')) lines.push(`${pad(level)}${row}`);
        lines.push(`${pad(level)}\\end{verbatim}`);
        lines.push('');
        break;
      case 'toc':
        lines.push(`${pad(level)}\\tableofcontents`);
        lines.push('');
        break;
    }
  }
}

function renderSlide(
  slide: Slide,
  lines: string[],
  imageNames: Map<string, string>,
): void {
  if (slide.kind === 'title') {
    lines.push('\\begin{frame}[plain]');
    lines.push(`${pad(1)}\\titlepage`);
    lines.push('\\end{frame}');
    lines.push('');
    return;
  }

  if (slide.kind === 'section') {
    lines.push(`\\section{${slide.title}}`);
    lines.push('\\begin{frame}');
    lines.push(`${pad(1)}\\sectionpage`);
    lines.push('\\end{frame}');
    lines.push('');
    return;
  }

  const fragile = hasCode(slide.body);
  const options = fragile ? '[fragile]' : '';
  // Beamer treats a braced group right after the title argument as the frame
  // subtitle, so both groups must always be present; otherwise a leading
  // color-override group would be swallowed into the title.
  lines.push(`\\begin{frame}${options}{${slide.title}}{${slide.subtitle ?? ''}}`);
  renderBlocks(slide.body, lines, 1, imageNames);
  lines.push('\\end{frame}');
  lines.push('');
}

const BULLET_TEMPLATES: Record<string, { item: string; sub: string; subsub: string }> = {
  ball: { item: '\\textbullet', sub: '\\scriptsize\\textbullet', subsub: '\\tiny\\textbullet' },
  triangle: {
    item: '$\\blacktriangleright$',
    sub: '\\scriptsize$\\blacktriangleright$',
    subsub: '\\tiny$\\blacktriangleright$',
  },
  circle: { item: '$\\circ$', sub: '\\scriptsize$\\circ$', subsub: '\\tiny$\\circ$' },
  square: {
    item: '$\\blacksquare$',
    sub: '\\scriptsize$\\blacksquare$',
    subsub: '\\tiny$\\blacksquare$',
  },
};

export function toLatex(deck: Deck): string {
  const { theme } = deck;
  const spec = themeSpec(theme.template);
  const lines: string[] = [];

  if (deck.aspect === '169') {
    lines.push('\\documentclass[aspectratio=169,11pt]{beamer}');
  } else {
    lines.push('\\documentclass[11pt]{beamer}');
  }
  lines.push(`\\usetheme{${theme.template}}`);
  if (!spec.colorThemes.includes(theme.colorTheme)) {
    if (theme.colorTheme === 'structure') {
      // Beamer's structure colortheme has no default color; it needs an RGB option.
      lines.push(`\\usecolortheme[RGB={${hexTriple(resolveTheme(theme, deck.aspect).palette.structure)}}]{structure}`);
    } else {
      lines.push(`\\usecolortheme{${theme.colorTheme}}`);
    }
  }

  if (theme.fontFamily === 'serif') lines.push('\\usefonttheme{serif}');

  if (theme.custom.enabled) {
    const custom = theme.custom;
    if (custom.structure) {
      lines.push(`\\definecolor{bxStructure}{HTML}{${custom.structure.replace('#', '').toUpperCase()}}`);
      lines.push('\\setbeamercolor{structure}{fg=bxStructure}');
    }
    if (custom.primaryBar) {
      const bar = custom.primaryBar;
      lines.push(`\\definecolor{bxPrimaryBar}{HTML}{${bar.replace('#', '').toUpperCase()}}`);
      lines.push(
        `\\setbeamercolor{palette primary}{bg=bxPrimaryBar,fg=${readableOn(bar) === '#ffffff' ? 'white' : 'black'}}`,
      );
      lines.push(
        `\\setbeamercolor{palette secondary}{bg=bxPrimaryBar!82!black,fg=${readableOn(shade(bar, 82)) === '#ffffff' ? 'white' : 'black'}}`,
      );
      lines.push(
        `\\setbeamercolor{palette tertiary}{bg=bxPrimaryBar!64!black,fg=${readableOn(shade(bar, 64)) === '#ffffff' ? 'white' : 'black'}}`,
      );
      lines.push(
        `\\setbeamercolor{frametitle}{bg=bxPrimaryBar,fg=${readableOn(bar) === '#ffffff' ? 'white' : 'black'}}`,
      );
    }
    if (custom.background) {
      lines.push(
        `\\definecolor{bxBackground}{HTML}{${custom.background.replace('#', '').toUpperCase()}}`,
      );
      lines.push('\\setbeamercolor{background canvas}{bg=bxBackground}');
    }
    if (custom.foreground) {
      lines.push(
        `\\definecolor{bxForeground}{HTML}{${custom.foreground.replace('#', '').toUpperCase()}}`,
      );
      lines.push('\\setbeamercolor{normal text}{fg=bxForeground}');
    }
    if (custom.alert) {
      lines.push(`\\definecolor{bxAlert}{HTML}{${custom.alert.replace('#', '').toUpperCase()}}`);
      lines.push('\\setbeamercolor{alerted text}{fg=bxAlert}');
    }
  }

  if (theme.bulletShape !== 'theme') {
    const bullets = BULLET_TEMPLATES[theme.bulletShape];
    lines.push(`\\setbeamertemplate{itemize item}{${bullets.item}}`);
    lines.push(`\\setbeamertemplate{itemize subitem}{${bullets.sub}}`);
    lines.push(`\\setbeamertemplate{itemize subsubitem}{${bullets.subsub}}`);
  }

  if (theme.blockShape !== 'theme' || theme.blockShadow !== spec.shadow) {
    if (theme.blockShape === 'rectangle') {
      lines.push('\\setbeamertemplate{blocks}[default]');
    } else {
      lines.push(
        `\\setbeamertemplate{blocks}[rounded][shadow=${theme.blockShadow ? 'true' : 'false'}]`,
      );
    }
  }

  if (!theme.navigationSymbols) {
    lines.push('\\setbeamertemplate{navigation symbols}{}');
  }

  lines.push('');
  lines.push(`\\title{${deck.meta.title}}`);
  if (deck.meta.subtitle) lines.push(`\\subtitle{${deck.meta.subtitle}}`);
  if (deck.meta.author) lines.push(`\\author{${deck.meta.author}}`);
  if (deck.meta.institute) lines.push(`\\institute{${deck.meta.institute}}`);
  if (deck.meta.date) lines.push(`\\date{${deck.meta.date}}`);
  lines.push('');
  lines.push('\\begin{document}');
  lines.push('');

  const images = collectImages(deck);
  const imageNames = new Map(images.map((image) => [image.block.id, image.name]));
  for (const slide of deck.slides) renderSlide(slide, lines, imageNames);

  lines.push('\\end{document}');
  lines.push('');
  return lines.join('\n');
}
