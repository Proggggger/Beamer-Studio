import { walkBlocks } from '../model/blockOps';
import { listingsDialect } from '../model/code';
import { splitParagraphs } from '../model/paragraphs';
import type {
  BackgroundImageSettings,
  BackgroundPosition,
  Block,
  BlockColorOverrides,
  BlockTone,
  Deck,
  FontChoice,
  Item,
  Slide,
} from '../model/types';
import { themeSpec } from '../themes/beamerThemes';
import {
  BACKGROUND_ANCHOR_FRACTIONS,
  resolveSlideLayers,
} from '../themes/backgrounds';
import { readableOn, shade } from '../themes/colorMath';
import { num, tikzBody } from '../tikz/drawing';
import { resolveFont, scriptFallbackChain } from '../themes/fonts';
import { languageOption, languageScripts } from '../themes/languages';
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

function fontChoiceKey(choice: FontChoice): string {
  return `${choice.family}\u0000${choice.custom ?? ''}`;
}

interface FontOverride {
  key: string;
  /** LaTeX control sequence declared in the preamble, e.g. bxfontA. */
  name: string;
  choice: FontChoice;
}

/** TeX control words cannot contain digits, so the counter uses letters. */
function fontMacroName(index: number): string {
  let letters = '';
  let value = index;
  do {
    letters = String.fromCharCode(65 + (value % 26)) + letters;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return `bxfont${letters}`;
}

/** One declaration per distinct slide/block font; the text is grouped locally. */
function collectFontOverrides(deck: Deck): FontOverride[] {
  const overrides = new Map<string, FontOverride>();
  const add = (choice: FontChoice | undefined) => {
    if (!choice) return;
    if (choice.family === 'custom' && !choice.custom?.trim()) return;
    const key = fontChoiceKey(choice);
    if (overrides.has(key)) return;
    overrides.set(key, { key, name: fontMacroName(overrides.size), choice });
  };
  for (const slide of deck.slides) {
    add(slide.font);
    walkBlocks(slide.body, (block) => add(block.font));
  }
  return [...overrides.values()];
}

function hasTikzBlocks(blocks: Block[]): boolean {
  return blocks.some((block) => {
    if (block.type === 'tikz') return tikzBody(block.drawing).trim().length > 0;
    if (block.type === 'block') return hasTikzBlocks(block.body);
    if (block.type === 'columns') return hasTikzBlocks(block.left) || hasTikzBlocks(block.right);
    return false;
  });
}

interface ScriptWrap {
  greek?: string;
  cyrillic?: string;
}

/** XeLaTeX has no per-character fallback, so script runs must switch language. */
function scriptWrapFor(settings: Deck['document']): ScriptWrap {
  const wrap: ScriptWrap = {};
  for (const id of settings.otherLanguages) {
    const option = languageOption(id);
    if (option.script === 'greek' && !wrap.greek) wrap.greek = option.tex;
    if (option.script === 'cyrillic' && !wrap.cyrillic) wrap.cyrillic = option.tex;
  }
  return wrap;
}

const GREEK_CHAR = /\p{Script=Greek}/u;
const CYRILLIC_CHAR = /\p{Script=Cyrillic}/u;
const SCRIPT_GLUE = new Set([
  ' ', '\t', '.', ',', ';', ':', '!', '?', '(', ')', '-', '–', '—', '«', '»',
  '„', '“', '”', '‘', '’', '…', '"', "'", '/',
]);

function wrapScriptRuns(text: string, wrap: ScriptWrap, pdfSafe = false): string {
  if (!wrap.greek && !wrap.cyrillic) return text;
  let result = '';
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '$') {
      const end = text.indexOf('$', index + 1);
      const stop = end === -1 ? text.length : end + 1;
      result += text.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === '\\') {
      let end = index + 1;
      while (end < text.length && /[A-Za-z@]/.test(text[end])) end += 1;
      if (end === index + 1 && end < text.length) end += 1;
      result += text.slice(index, end);
      index = end;
      continue;
    }
    const script: keyof ScriptWrap | null = GREEK_CHAR.test(char)
      ? 'greek'
      : CYRILLIC_CHAR.test(char)
        ? 'cyrillic'
        : null;
    const wrapper = script ? wrap[script] : undefined;
    if (!script || !wrapper) {
      result += char;
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end < text.length) {
      const next = text[end];
      const nextScript: keyof ScriptWrap | null = GREEK_CHAR.test(next)
        ? 'greek'
        : CYRILLIC_CHAR.test(next)
          ? 'cyrillic'
          : null;
      if (nextScript) {
        if (nextScript !== script) break;
      } else if (!/[0-9]/.test(next) && !SCRIPT_GLUE.has(next)) {
        break;
      }
      end += 1;
    }
    const run = text.slice(index, end);
    result += pdfSafe
      ? `\\texorpdfstring{\\text${wrapper}{${run}}}{${run}}`
      : `\\text${wrapper}{${run}}`;
    index = end;
  }
  return result;
}

const BACKGROUND_NODE_ANCHORS: Record<BackgroundPosition, string> = {
  center: 'center',
  top: 'north',
  bottom: 'south',
  left: 'west',
  right: 'east',
  'top-left': 'north west',
  'top-right': 'north east',
  'bottom-left': 'south west',
  'bottom-right': 'south east',
};

/** Beamer's fixed paper sizes in millimetres, matching aspectratio=169 vs default. */
function paperMillimetres(aspect: Deck['aspect']): { w: number; h: number } {
  return aspect === '169' ? { w: 160, h: 90 } : { w: 128, h: 96 };
}

function mm(value: number): string {
  return `${value.toFixed(2)}mm`;
}

function imageSizeOptions(
  layer: BackgroundImageSettings,
  paper: { w: number; h: number },
): string {
  if (layer.mode === 'stretch') return 'width=\\paperwidth,height=\\paperheight';
  if (layer.mode === 'fit') {
    return 'width=\\paperwidth,height=\\paperheight,keepaspectratio';
  }
  return `width=${mm((paper.w * layer.scale) / 100)}`;
}

function nodeRotation(layer: BackgroundImageSettings): string {
  return layer.rotation !== 0 ? `,rotate=${-layer.rotation}` : '';
}

interface TikzLayerSizing {
  width: number;
  height: number;
  /** Unit-vector lengths for the nested picture, replacing a resizebox. */
  scaleX: number;
  scaleY: number;
  body: string;
}

/** Mirrors the preview box maths so vector layers land on the same pixels. */
function tikzLayerSizing(
  layer: BackgroundImageSettings,
  paper: { w: number; h: number },
): TikzLayerSizing | null {
  const drawing = layer.drawing;
  if (!drawing || drawing.width <= 0 || drawing.height <= 0) return null;
  const body = tikzBody(drawing);
  if (!body.trim()) return null;
  const aspect = drawing.height / drawing.width;
  if (layer.mode === 'stretch') {
    return {
      width: paper.w,
      height: paper.h,
      scaleX: paper.w / drawing.width,
      scaleY: paper.h / drawing.height,
      body,
    };
  }
  if (layer.mode === 'fit') {
    const factor = Math.min(paper.w / drawing.width, paper.h / drawing.height);
    return {
      width: drawing.width * factor,
      height: drawing.height * factor,
      scaleX: factor,
      scaleY: factor,
      body,
    };
  }
  const width = (paper.w * layer.scale) / 100;
  const factor = width / drawing.width;
  return {
    width,
    height: width * aspect,
    scaleX: factor,
    scaleY: factor,
    body,
  };
}

/**
 * Beamer's background and shipout templates are plain boxes, so `\resizebox`
 * around the nested picture fails there; scaling the unit vectors instead gives
 * the same size without a scaling box.
 */
function tikzNodeLines(
  layer: BackgroundImageSettings,
  at: string,
  paper: { w: number; h: number },
  indent: string,
): string[] | null {
  const sizing = tikzLayerSizing(layer, paper);
  const drawing = layer.drawing;
  if (!sizing || !drawing) return null;
  const anchor = BACKGROUND_NODE_ANCHORS[layer.position];
  const lines = [
    `${indent}\\node[anchor=${anchor},inner sep=0pt,opacity=${(layer.opacity / 100).toFixed(
      2,
    )}${nodeRotation(layer)}] at ${at} {%`,
    `${indent}  \\begin{tikzpicture}[x=${mm(sizing.scaleX)},y=${mm(sizing.scaleY)}]`,
    `${indent}    \\useasboundingbox (0,0) rectangle (${num(drawing.width)},${num(
      drawing.height,
    )});`,
  ];
  for (const row of sizing.body.split('\n')) lines.push(`${indent}    ${row}`);
  lines.push(`${indent}  \\end{tikzpicture}%`, `${indent}};%`);
  return lines;
}

/**
 * Replaces beamer's canvas with a solid fill and the layer stack on top.
 * Uses explicit page coordinates instead of tikz's current page, which would
 * need two LaTeX runs to resolve.
 */
function backgroundCanvasCommands(
  layers: BackgroundImageSettings[],
  names: Map<string, string>,
  slot: string,
  paper: { w: number; h: number },
): string[] {
  const pageBox = `(0,0) rectangle (${mm(paper.w)},${mm(paper.h)})`;
  const commands = [
    '\\usebackgroundtemplate{%',
    '  \\begin{tikzpicture}',
    `    \\useasboundingbox ${pageBox};`,
    `    \\fill[bxBackgroundFill] ${pageBox};`,
  ];
  layers.forEach((layer, index) => {
    const anchor = BACKGROUND_ANCHOR_FRACTIONS[layer.position];
    const x = paper.w * (anchor.x + layer.offsetX / 100);
    // Positive vertical offsets move down on screen, so they subtract from tikz's y.
    const y = paper.h * (1 - anchor.y - layer.offsetY / 100);
    if (layer.kind === 'tikz') {
      const vector = tikzNodeLines(layer, `(${mm(x)},${mm(y)})`, paper, '    ');
      if (vector) commands.push(...vector);
      return;
    }
    const name = names.get(`bg:${slot}:${index}`);
    if (!name) return;
    const size = imageSizeOptions(layer, paper);
    commands.push(
      `    \\node[anchor=${BACKGROUND_NODE_ANCHORS[layer.position]},inner sep=0pt,opacity=${(layer.opacity / 100).toFixed(2)}${nodeRotation(layer)}] at (${mm(x)},${mm(y)}) {\\includegraphics[${size}]{${name}}};`,
    );
  });
  commands.push('  \\end{tikzpicture}%', '}');
  return commands;
}

function backgroundFillCommands(paper: { w: number; h: number }): string[] {
  const pageBox = `(0,0) rectangle (${mm(paper.w)},${mm(paper.h)})`;
  return [
    '\\usebackgroundtemplate{%',
    '  \\begin{tikzpicture}',
    `    \\useasboundingbox ${pageBox};`,
    `    \\fill[bxBackgroundFill] ${pageBox};`,
    '  \\end{tikzpicture}%',
    '}',
  ];
}

/**
 * Foreground layers hang off `current page` anchors in a shipout hook, so a
 * fresh compile needs a second XeLaTeX run to resolve them.
 */
interface ForegroundEntry {
  layer: BackgroundImageSettings;
  /** Image-collection key: `fg:<slot>:<index>` or `fs:<slideId>:<index>`. */
  key: string;
}

function foregroundNodeCommands(
  entries: ForegroundEntry[],
  names: Map<string, string>,
  paper: { w: number; h: number },
): string[] {
  const commands = ['\\renewcommand{\\bxForeground}{%'];
  entries.forEach(({ layer, key }) => {
    const anchor = BACKGROUND_ANCHOR_FRACTIONS[layer.position];
    const x = paper.w * (anchor.x + layer.offsetX / 100);
    const y = paper.h * (anchor.y + layer.offsetY / 100);
    const shift = `[xshift=${mm(x)},yshift=${mm(y === 0 ? 0 : -y)}]current page.north west`;
    if (layer.kind === 'tikz') {
      const vector = tikzNodeLines(layer, `(${shift})`, paper, '  ');
      if (vector) commands.push(...vector);
      return;
    }
    const name = names.get(key);
    if (!name) return;
    const size = imageSizeOptions(layer, paper);
    commands.push(
      `  \\node[anchor=${BACKGROUND_NODE_ANCHORS[layer.position]},inner sep=0pt,opacity=${(layer.opacity / 100).toFixed(2)}${nodeRotation(layer)}] at (${shift}) {\\includegraphics[${size}]{${name}}};%`,
    );
  });
  commands.push('}');
  return commands;
}

export interface LatexImage {
  /**
   * 'block:<id>' for image blocks, 'bg:<slot>:<index>' for background layers,
   * 'fg:<slot>:<index>' for template foregrounds and 'fs:<slideId>:<index>'
   * for per-slide layers.
   */
  key: string;
  name: string;
  dataUrl: string;
}

export function collectImages(deck: Deck): LatexImage[] {
  const images: LatexImage[] = [];
  const used = new Map<string, number>();
  const add = (key: string, name: string, dataUrl: string) => {
    let unique = latexImageName(name, images.length + 1);
    const count = (used.get(unique) ?? 0) + 1;
    used.set(unique, count);
    if (count > 1) {
      const dot = unique.lastIndexOf('.');
      unique = `${unique.slice(0, dot)}-${count}${unique.slice(dot)}`;
    }
    images.push({ key, name: unique, dataUrl });
  };
  const visit = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === 'image') {
        if (!block.src) continue;
        add(`block:${block.id}`, block.name, block.src);
      } else if (block.type === 'block') {
        visit(block.body);
      } else if (block.type === 'columns') {
        visit(block.left);
        visit(block.right);
      }
    }
  };
  for (const slide of deck.slides) visit(slide.body);
  const backgrounds = deck.theme.backgrounds;
  for (const slot of ['all', 'title', 'section'] as const) {
    backgrounds[slot].forEach((layer, index) => {
      if (layer.src) add(`bg:${slot}:${index}`, layer.name || 'background', layer.src);
    });
  }
  const foregrounds = deck.theme.foregrounds;
  for (const slot of ['all', 'title', 'section'] as const) {
    foregrounds[slot].forEach((layer, index) => {
      if (layer.src) add(`fg:${slot}:${index}`, layer.name || 'foreground', layer.src);
    });
  }
  for (const slide of deck.slides) {
    slide.images.forEach((layer, index) => {
      if (layer.src) add(`fs:${slide.id}:${index}`, layer.name || 'slide image', layer.src);
    });
  }
  return images;
}

type WrapText = (text: string) => string;

function renderList(
  items: Item[],
  ordered: boolean,
  lines: string[],
  level: number,
  wrapText: WrapText,
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
    lines.push(`${pad(level + depth + 1)}\\item ${wrapText(item.text)}`);
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
  wrapText: WrapText,
  wrapFont: (choice: FontChoice | undefined) => string | null,
): void {
  for (const block of blocks) {
    const fontMacro = wrapFont(block.font);
    if (fontMacro) lines.push(`${pad(level)}{${fontMacro}`);
    switch (block.type) {
      case 'paragraph': {
        const text = paragraphText(wrapText(block.text), block.indent);
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
        renderList(block.items, block.ordered, lines, level, wrapText);
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
          lines.push(`${pad(level)}\\begin{${env}}{${wrapText(block.title)}}`);
          renderBlocks(block.body, lines, level + 1, imageNames, wrapText, wrapFont);
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
        lines.push(`${pad(level + 1)}\\begin{${env}}{${wrapText(block.title)}}`);
        renderBlocks(block.body, lines, level + 2, imageNames, wrapText, wrapFont);
        lines.push(`${pad(level + 1)}\\end{${env}}`);
        lines.push(`${pad(level)}}`);
        lines.push('');
        break;
      }
      case 'columns':
        lines.push(`${pad(level)}\\begin{columns}[T]`);
        lines.push(`${pad(level + 1)}\\begin{column}{0.48\\textwidth}`);
        renderBlocks(block.left, lines, level + 2, imageNames, wrapText, wrapFont);
        lines.push(`${pad(level + 1)}\\end{column}`);
        lines.push(`${pad(level + 1)}\\begin{column}{0.48\\textwidth}`);
        renderBlocks(block.right, lines, level + 2, imageNames, wrapText, wrapFont);
        lines.push(`${pad(level + 1)}\\end{column}`);
        lines.push(`${pad(level)}\\end{columns}`);
        lines.push('');
        break;
      case 'image': {
        const name =
          imageNames.get(`block:${block.id}`) ?? latexImageName(block.name);
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
          lines.push(`${pad(level + 1)}\\caption{${wrapText(block.caption)}}`);
          lines.push(`${pad(level)}\\end{figure}`);
        } else {
          lines.push(
            `${pad(level)}\\includegraphics[width=${width.toFixed(2)}\\textwidth]{${name}}`,
          );
        }
        lines.push('');
        break;
      }
      case 'tikz': {
        const body = tikzBody(block.drawing);
        if (!body.trim()) {
          lines.push(`${pad(level)}% TikZ drawing "${block.name}" has no shapes.`);
          break;
        }
        const width = Math.max(10, Math.min(100, block.widthPct)) / 100;
        const outer = block.caption ? 'figure' : 'center';
        lines.push(`${pad(level)}\\begin{${outer}}`);
        lines.push(`${pad(level + 1)}\\centering`);
        lines.push(`${pad(level + 1)}\\resizebox{${width.toFixed(2)}\\textwidth}{!}{%`);
        lines.push(`${pad(level + 2)}\\begin{tikzpicture}[x=1mm,y=1mm]`);
        lines.push(
          `${pad(level + 3)}\\useasboundingbox (0,0) rectangle (${mm(
            block.drawing.width,
          )},${mm(block.drawing.height)});`,
        );
        for (const row of body.split('\n')) lines.push(`${pad(level + 3)}${row}`);
        lines.push(`${pad(level + 2)}\\end{tikzpicture}%`);
        lines.push(`${pad(level + 1)}}`);
        if (block.caption) lines.push(`${pad(level + 1)}\\caption{${wrapText(block.caption)}}`);
        lines.push(`${pad(level)}\\end{${outer}}`);
        lines.push('');
        break;
      }
      case 'math':
        lines.push(`${pad(level)}\\[`);
        lines.push(`${pad(level + 1)}${block.tex}`);
        lines.push(`${pad(level)}\\]`);
        lines.push('');
        break;
      case 'code': {
        const options = ['breaklines=true'];
        const dialect = listingsDialect(block.lang);
        if (dialect) options.push(`language=${dialect}`);
        if (block.lineNumbers) {
          options.push('numbers=left', 'numberstyle=\\tiny', 'numbersep=6pt');
        }
        if (block.caption) {
          // Listings resets to the main font for captions, so carry the block
          // font override inside the caption group to keep it visible.
          const text = wrapText(block.caption);
          options.push(`caption={${fontMacro ? `{${fontMacro} ${text}}` : text}}`);
        }
        lines.push(`${pad(level)}\\begin{lstlisting}[${options.join(',')}]`);
        // Indenting code rows or the end tag adds visible spaces and even an
        // extra numbered line, so listing content stays flush left.
        for (const row of block.text.split('\n')) lines.push(row);
        lines.push('\\end{lstlisting}');
        lines.push('');
        break;
      }
      case 'toc':
        lines.push(`${pad(level)}\\tableofcontents`);
        lines.push('');
        break;
    }
    if (fontMacro) lines.push(`${pad(level)}}`);
  }
}

function renderSlide(
  slide: Slide,
  lines: string[],
  imageNames: Map<string, string>,
  wrapText: WrapText,
  wrapTitle: WrapText,
  wrapFont: (choice: FontChoice | undefined) => string | null,
): void {
  if (slide.kind === 'title') {
    lines.push('\\begin{frame}[plain]');
    lines.push(`${pad(1)}\\titlepage`);
    lines.push('\\end{frame}');
    lines.push('');
    return;
  }

  const slideFont = wrapFont(slide.font);
  if (slide.kind === 'section') {
    lines.push(`\\section{${wrapTitle(slide.title)}}`);
    lines.push('\\begin{frame}');
    if (slideFont) lines.push(`${pad(1)}{${slideFont}`);
    lines.push(`${pad(1)}\\sectionpage`);
    if (slideFont) lines.push(`${pad(1)}}`);
    lines.push('\\end{frame}');
    lines.push('');
    return;
  }

  const fragile = hasCode(slide.body);
  const options = fragile ? '[fragile]' : '';
  // Beamer treats a braced group right after the title argument as the frame
  // subtitle, so both groups must always be present; otherwise a leading
  // color-override group would be swallowed into the title.
  lines.push(
    `\\begin{frame}${options}{${wrapTitle(slide.title)}}{${wrapTitle(slide.subtitle ?? '')}}`,
  );
  if (slideFont) lines.push(`${pad(1)}{${slideFont}`);
  renderBlocks(slide.body, lines, 1, imageNames, wrapText, wrapFont);
  if (slideFont) lines.push(`${pad(1)}}`);
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
  const { theme, document: settings } = deck;
  const spec = themeSpec(theme.template);
  const lines: string[] = [];
  const resolved = resolveTheme(theme, deck.aspect, settings.fontSize);
  const hasBackgrounds = (['all', 'title', 'section'] as const).some(
    (slot) => theme.backgrounds[slot].length > 0,
  );
  const hasForegrounds =
    (['all', 'title', 'section'] as const).some(
      (slot) => theme.foregrounds[slot].length > 0,
    ) || deck.slides.some((slide) => slide.images.length > 0);
  const hasCodeBlocks = deck.slides.some((slide) => hasCode(slide.body));
  const fontOverrides = collectFontOverrides(deck);

  lines.push('% !TeX program = xelatex');
  if (deck.aspect === '169') {
    lines.push(`\\documentclass[aspectratio=169,${settings.fontSize}pt]{beamer}`);
  } else {
    lines.push(`\\documentclass[${settings.fontSize}pt]{beamer}`);
  }
  lines.push(`\\usetheme{${theme.template}}`);
  if (!spec.colorThemes.includes(theme.colorTheme)) {
    if (theme.colorTheme === 'structure') {
      // Beamer's structure colortheme has no default color; it needs an RGB option.
      lines.push(`\\usecolortheme[RGB={${hexTriple(resolved.palette.structure)}}]{structure}`);
    } else {
      lines.push(`\\usecolortheme{${theme.colorTheme}}`);
    }
  }

  const font = resolveFont(theme.fontFamily, theme.customFont);
  const languageIds = [settings.mainLanguage, ...settings.otherLanguages];
  const scripts = languageScripts(languageIds);

  lines.push('\\usepackage{fontspec}');
  lines.push('\\usepackage{polyglossia}');
  const hasTikz = deck.slides.some((slide) => hasTikzBlocks(slide.body));
  if (hasBackgrounds || hasForegrounds || hasTikz) lines.push('\\usepackage{tikz}');
  if (hasCodeBlocks) {
    lines.push('\\usepackage{listings}');
    lines.push('\\lstset{%');
    lines.push('  basicstyle=\\ttfamily\\footnotesize,');
    lines.push('  breaklines=true,');
    lines.push('  columns=fullflexible,');
    lines.push('  keepspaces=true,');
    lines.push('  showstringspaces=false,');
    lines.push('  tabsize=2,');
    lines.push('}');
  }
  lines.push(`\\setmainlanguage{${languageOption(settings.mainLanguage).tex}}`);
  for (const id of settings.otherLanguages) {
    lines.push(`\\setotherlanguage{${languageOption(id).tex}}`);
  }
  lines.push('\\usefonttheme{professionalfonts}');
  lines.push('\\defaultfontfeatures{Ligatures=TeX}');

  const latinFallback = font.kind === 'serif' ? 'Latin Modern Roman' : 'Latin Modern Sans';
  lines.push(`\\IfFontExistsTF{${font.tex}}{%`);
  lines.push(`  \\setsansfont{${font.tex}}%`);
  lines.push(`  \\setmainfont{${font.tex}}%`);
  lines.push('}{%');
  lines.push(
    `  \\PackageWarning{beamer-editor}{Font "${font.tex}" is not installed; using ${latinFallback}}%`,
  );
  lines.push(`  \\setsansfont{${latinFallback}}%`);
  lines.push(`  \\setmainfont{${latinFallback}}%`);
  lines.push('}');
  const mono = font.monoTex ?? 'Latin Modern Mono';
  lines.push(`\\IfFontExistsTF{${mono}}{\\setmonofont{${mono}}}{}`);

  for (const override of fontOverrides) {
    const choiceFont = resolveFont(override.choice.family, override.choice.custom ?? '');
    lines.push(`\\IfFontExistsTF{${choiceFont.tex}}{%`);
    lines.push(`  \\newfontfamily\\${override.name}{${choiceFont.tex}}%`);
    lines.push('}{%');
    lines.push(
      `  \\PackageWarning{beamer-editor}{Font "${choiceFont.tex}" is not installed; using ${latinFallback}}%`,
    );
    lines.push(`  \\newfontfamily\\${override.name}{${latinFallback}}%`);
    lines.push('}');
  }

  if (scripts.has('greek') || scripts.has('cyrillic')) {
    // Script fonts need explicit declarations under fontspec. Prefer the face
    // the user chose (the main font when it has the glyphs), then any installed
    // face known to carry Greek/Cyrillic coverage.
    lines.push('\\newcommand{\\bxscriptfonts}[1]{%');
    lines.push('  \\newfontfamily\\greekfont{#1}%');
    lines.push('  \\newfontfamily\\greekfontsf{#1}%');
    lines.push('  \\newfontfamily\\cyrillicfont{#1}%');
    lines.push('  \\newfontfamily\\cyrillicfontsf{#1}%');
    lines.push('}');
    const scriptChoice =
      settings.scriptFont === 'auto' ? null : resolveFont(settings.scriptFont, '');
    const scriptKind = scriptChoice ? scriptChoice.kind : font.kind;
    const chain: string[] = [];
    if (scriptChoice) {
      chain.push(scriptChoice.tex);
    } else if ((font.scripts ?? []).some((script) => scripts.has(script))) {
      chain.push(font.tex);
    }
    for (const candidate of scriptFallbackChain(scriptKind)) {
      if (!chain.includes(candidate)) chain.push(candidate);
    }
    lines.push(`\\IfFontExistsTF{${chain[0]}}{\\bxscriptfonts{${chain[0]}}}{%`);
    for (let index = 1; index < chain.length; index += 1) {
      const indent = '  '.repeat(index);
      lines.push(`${indent}\\IfFontExistsTF{${chain[index]}}{\\bxscriptfonts{${chain[index]}}}{%`);
    }
    lines.push(
      `${'  '.repeat(chain.length)}\\PackageWarning{beamer-editor}{No installed font provides the Greek or Cyrillic glyphs}%`,
    );
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      lines.push(`${'  '.repeat(index)}}%`);
    }
  }

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

  if (hasBackgrounds) {
    lines.push(
      `\\definecolor{bxBackgroundFill}{HTML}{${resolved.palette.bg.replace('#', '').toUpperCase()}}`,
    );
  }

  if (hasForegrounds) {
    lines.push('% Foreground overlays are page-anchored: run XeLaTeX twice.');
    lines.push('\\newcommand{\\bxForeground}{}');
    lines.push('\\AddToHook{shipout/foreground}{%');
    lines.push('  \\begin{tikzpicture}[remember picture,overlay]');
    lines.push('    \\bxForeground');
    lines.push('  \\end{tikzpicture}%');
    lines.push('}');
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

  const scriptWrap = scriptWrapFor(settings);
  const wrapText: WrapText = (value) => wrapScriptRuns(value, scriptWrap);
  // Titles also feed PDF bookmarks/metadata, where language commands are illegal.
  const wrapTitle: WrapText = (value) => wrapScriptRuns(value, scriptWrap, true);
  const fontMacros = new Map(fontOverrides.map((entry) => [entry.key, entry.name]));
  const wrapFont = (choice: FontChoice | undefined): string | null => {
    if (!choice) return null;
    const name = fontMacros.get(fontChoiceKey(choice));
    return name ? `\\${name}` : null;
  };

  lines.push('');
  lines.push(`\\title{${wrapTitle(deck.meta.title)}}`);
  if (deck.meta.subtitle) lines.push(`\\subtitle{${wrapTitle(deck.meta.subtitle)}}`);
  if (deck.meta.author) lines.push(`\\author{${wrapTitle(deck.meta.author)}}`);
  if (deck.meta.institute) lines.push(`\\institute{${wrapTitle(deck.meta.institute)}}`);
  if (deck.meta.date) lines.push(`\\date{${wrapTitle(deck.meta.date)}}`);
  lines.push('');
  lines.push('\\begin{document}');
  lines.push('');

  const images = collectImages(deck);
  const imageNames = new Map(images.map((image) => [image.key, image.name]));
  const paper = paperMillimetres(deck.aspect);
  let appliedBackground = 'none';
  let appliedForeground = 'none';
  for (const slide of deck.slides) {
    if (hasForegrounds) {
      const template = resolveSlideLayers(theme.foregrounds, slide.kind);
      const entries: ForegroundEntry[] = [
        ...(template
          ? template.layers.map((layer, index) => ({
              layer,
              key: `fg:${template.slot}:${index}`,
            }))
          : []),
        ...slide.images.map((layer, index) => ({ layer, key: `fs:${slide.id}:${index}` })),
      ];
      const key = `${template ? `fg:${template.slot}` : 'none'}|${
        slide.images.length > 0 ? `fs:${slide.id}` : ''
      }`;
      if (key !== appliedForeground) {
        lines.push(
          ...(entries.length > 0
            ? foregroundNodeCommands(entries, imageNames, paper)
            : ['\\renewcommand{\\bxForeground}{}']),
        );
        lines.push('');
        appliedForeground = key;
      }
    }
    if (hasBackgrounds) {
      const background = resolveSlideLayers(theme.backgrounds, slide.kind);
      const key = background ? `bg:${background.slot}` : 'fill';
      if (key !== appliedBackground) {
        lines.push(
          ...(background
            ? backgroundCanvasCommands(background.layers, imageNames, background.slot, paper)
            : backgroundFillCommands(paper)),
        );
        lines.push('');
        appliedBackground = key;
      }
    }
    renderSlide(slide, lines, imageNames, wrapText, wrapTitle, wrapFont);
  }

  lines.push('\\end{document}');
  lines.push('');
  return lines.join('\n');
}
