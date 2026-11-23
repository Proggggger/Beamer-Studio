import { COLOR_THEME_NAMES, THEME_SPECS } from '../themes/beamerThemes';
import { FONT_OPTIONS, sanitizeFontName } from '../themes/fonts';
import { LANGUAGE_OPTIONS } from '../themes/languages';
import { validCodeLang } from '../model/code';
import { DEFAULT_DOCUMENT, DEFAULT_THEME } from '../model/defaults';
import { uid } from '../model/ids';
import { parseDeck } from '../model/validate';
import { parseIntoDrawing } from '../tikz/parse';
import type {
  Block,
  Deck,
  DeckMeta,
  DocumentSettings,
  FontId,
  FontSizePt,
  Item,
  LanguageId,
  Slide,
  TableAlign,
  ThemeName,
  ThemeSettings,
} from '../model/types';

export interface ImportResult {
  deck: Deck;
  warnings: string[];
}

interface TextGroup {
  value: string;
  end: number;
}

interface EnvAt {
  name: string;
  options: string | null;
  /** Index just after `\begin{name}[options]`. */
  contentStart: number;
  body: string;
  /** Index just after `\end{name}`. */
  end: number;
  closed: boolean;
}

const VERBATIM_ENVS = new Set(['lstlisting', 'verbatim', 'Verbatim', 'minted', 'alltt']);
const LIST_ENVS = new Set(['itemize', 'enumerate', 'description']);
const MATH_ENVS: Record<string, 'plain' | 'aligned' | 'gathered'> = {
  equation: 'plain',
  'equation*': 'plain',
  displaymath: 'plain',
  math: 'plain',
  align: 'aligned',
  'align*': 'aligned',
  aligned: 'aligned',
  split: 'aligned',
  gather: 'gathered',
  'gather*': 'gathered',
  gathered: 'gathered',
  multline: 'aligned',
  'multline*': 'aligned',
  eqnarray: 'aligned',
  'eqnarray*': 'aligned',
};
const THEOREM_ENVS: Record<string, string> = {
  theorem: 'Theorem',
  lemma: 'Lemma',
  corollary: 'Corollary',
  proposition: 'Proposition',
  definition: 'Definition',
  example: 'Example',
  remark: 'Remark',
  proof: 'Proof',
  claim: 'Claim',
  fact: 'Fact',
  observation: 'Observation',
  conjecture: 'Conjecture',
  algorithm: 'Algorithm',
  abstract: 'Abstract',
};

/** Commands that only affect layout and are dropped from paragraph text. */
const DROP_COMMANDS = new Set([
  'pause',
  'onslide',
  'medskip',
  'bigskip',
  'smallskip',
  'noindent',
  'indent',
  'centering',
  'raggedright',
  'raggedleft',
  'par',
  'selectfont',
  'small',
  'footnotesize',
  'scriptsize',
  'tiny',
  'normalsize',
  'large',
  'Large',
  'LARGE',
  'huge',
  'Huge',
  'bfseries',
  'mdseries',
  'itshape',
  'slshape',
  'scshape',
  'upshape',
  'rmfamily',
  'sffamily',
  'ttfamily',
  'vfill',
  'hfill*',
]);

const FONT_SIZE_OPTIONS: FontSizePt[] = [8, 9, 10, 11, 12, 14, 17, 20];

function skipSpaces(text: string, start: number): number {
  let index = start;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return index;
}

function readGroupAt(text: string, start: number): TextGroup | null {
  if (text[start] !== '{') return null;
  let depth = 1;
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { value: text.slice(start + 1, index), end: index + 1 };
    }
    index += 1;
  }
  return null;
}

function readOptionAt(text: string, start: number): TextGroup | null {
  if (text[start] !== '[') return null;
  let braces = 0;
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '{') braces += 1;
    else if (char === '}') braces = Math.max(0, braces - 1);
    else if (char === ']' && braces === 0) {
      return { value: text.slice(start + 1, index), end: index + 1 };
    }
    index += 1;
  }
  return null;
}

function readCommandName(
  text: string,
  start: number,
): { name: string; end: number } | null {
  if (text[start] !== '\\') return null;
  let index = start + 1;
  if (index >= text.length) return null;
  if (!/[a-zA-Z]/.test(text[index])) return { name: text[index], end: index + 1 };
  while (index < text.length && /[a-zA-Z]/.test(text[index])) index += 1;
  return { name: text.slice(start + 1, index), end: index };
}

/** Skips any `<...>` overlay specification immediately after a command. */
function skipOverlay(text: string, start: number): number {
  if (text[start] !== '<') return start;
  const close = text.indexOf('>', start + 1);
  if (close < 0) return start;
  return close + 1;
}

function stripComments(source: string): string {
  let out = '';
  let verbatim: string | null = null;
  let index = 0;
  while (index < source.length) {
    if (verbatim) {
      const close = `\\end{${verbatim}}`;
      if (source.startsWith(close, index)) {
        out += close;
        index += close.length;
        verbatim = null;
        continue;
      }
      out += source[index];
      index += 1;
      continue;
    }
    if (source.startsWith('\\begin{', index)) {
      const nameStart = index + '\\begin{'.length;
      const close = source.indexOf('}', nameStart);
      if (close > 0) {
        const name = source.slice(nameStart, close);
        if (VERBATIM_ENVS.has(name)) verbatim = name;
      }
    }
    const char = source[index];
    if (char === '%') {
      let backslashes = 0;
      for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) {
        backslashes += 1;
      }
      if (backslashes % 2 === 0) {
        const newline = source.indexOf('\n', index);
        if (newline < 0) break;
        out += '\n';
        index = newline + 1;
        continue;
      }
    }
    out += char;
    index += 1;
  }
  return out;
}

function readEnvironmentAt(text: string, start: number): EnvAt | null {
  if (!text.startsWith('\\begin', start)) return null;
  let index = skipSpaces(text, start + '\\begin'.length);
  const nameGroup = readGroupAt(text, index);
  if (!nameGroup) return null;
  const name = nameGroup.value.trim();
  index = skipSpaces(text, nameGroup.end);
  let options: string | null = null;
  for (let guard = 0; guard < 4; guard += 1) {
    index = skipSpaces(text, index);
    if (text[index] === '[') {
      const option = readOptionAt(text, index);
      if (!option) break;
      options = options ?? option.value;
      index = option.end;
      continue;
    }
    if (text[index] === '<') {
      index = skipOverlay(text, index);
      continue;
    }
    break;
  }
  const contentStart = skipSpaces(text, index);
  const beginMarker = `\\begin{${name}}`;
  const endMarker = `\\end{${name}}`;
  let depth = 1;
  let cursor = contentStart;
  while (cursor < text.length) {
    const nextEnd = text.indexOf(endMarker, cursor);
    if (nextEnd < 0) {
      return {
        name,
        options,
        contentStart,
        body: text.slice(contentStart),
        end: text.length,
        closed: false,
      };
    }
    const nextBegin = text.indexOf(beginMarker, cursor);
    if (nextBegin >= 0 && nextBegin < nextEnd) {
      depth += 1;
      cursor = nextBegin + beginMarker.length;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return {
        name,
        options,
        contentStart,
        body: text.slice(contentStart, nextEnd),
        end: nextEnd + endMarker.length,
        closed: true,
      };
    }
    cursor = nextEnd + endMarker.length;
  }
  return null;
}

/** First `\cmd[optional]{argument}` value in the source. */
function firstCommandArgument(source: string, name: string): string | null {
  const pattern = new RegExp(`\\\\${name}(?![A-Za-z])`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    let index = skipSpaces(source, match.index + match[0].length);
    if (source[index] === '[') {
      const option = readOptionAt(source, index);
      if (!option) continue;
      index = skipSpaces(source, option.end);
    }
    const group = readGroupAt(source, index);
    if (group) return group.value;
  }
  return null;
}

function allCommandArguments(source: string, name: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(`\\\\${name}(?![A-Za-z])`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    let index = skipSpaces(source, match.index + match[0].length);
    if (source[index] === '[') {
      const option = readOptionAt(source, index);
      if (!option) continue;
      index = skipSpaces(source, option.end);
    }
    const group = readGroupAt(source, index);
    if (group) values.push(group.value);
  }
  return values;
}

function languageFromTex(raw: string): LanguageId | null {
  const needle = raw.trim().toLowerCase();
  const aliases: Record<string, LanguageId> = {
    american: 'english',
    british: 'english',
    usenglish: 'english',
    ukenglish: 'english',
    ngerman: 'german',
    austrian: 'german',
    naustrian: 'german',
    brazil: 'portuguese',
    brazilian: 'portuguese',
    norwegian: 'norsk',
    nynorsk: 'norsk',
    hungarian: 'magyar',
    russianb: 'russian',
  };
  if (aliases[needle]) return aliases[needle];
  const option = LANGUAGE_OPTIONS.find(
    (entry) =>
      entry.id === needle ||
      entry.tex.toLowerCase() === needle ||
      entry.label.toLowerCase() === needle,
  );
  return option?.id ?? null;
}

function fontFromName(raw: string): FontId | null {
  const needle = sanitizeFontName(raw).toLowerCase().replace(/\s+/g, ' ');
  if (!needle) return null;
  const option = FONT_OPTIONS.find(
    (entry) =>
      entry.tex.toLowerCase().replace(/\s+/g, ' ') === needle ||
      entry.label.toLowerCase().replace(/\s+/g, ' ') === needle,
  );
  return option?.id ?? null;
}

function parseRgbColor(value: string): string | null {
  const html = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (html) {
    const short = html[1].toLowerCase();
    const full =
      short.length === 3
        ? short
            .split('')
            .map((char) => char + char)
            .join('')
        : short;
    return `#${full}`;
  }
  const parts = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
  if (parts.length === 3) {
    return `#${parts
      .map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0'))
      .join('')}`;
  }
  return null;
}

function cleanMeta(value: string | null): string {
  if (!value) return '';
  return sanitizeInline(value.replace(/\s*\\and(?![A-Za-z])\s*/g, ', '))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface PreambleInfo {
  meta: DeckMeta;
  aspect: '169' | '43';
  theme: ThemeSettings;
  document: DocumentSettings;
  warnings: string[];
}

function parsePreamble(source: string): PreambleInfo {
  const warnings: string[] = [];
  const warn = (message: string) => {
    if (!warnings.includes(message)) warnings.push(message);
  };

  const documentMatch = /\\documentclass\s*(?:\[([^\]]*)\])?\s*\{([^}]*)\}/.exec(source);
  if (documentMatch && documentMatch[2].trim() !== 'beamer') {
    warn(`Document class “${documentMatch[2].trim()}” is not beamer; frames were still parsed.`);
  }
  const classOptions = (documentMatch?.[1] ?? '').split(',').map((option) => option.trim());
  let aspect: '169' | '43' = '43';
  let fontSize: FontSizePt = 11;
  for (const option of classOptions) {
    const ratio = /^aspectratio\s*=\s*(\w+)$/.exec(option);
    if (ratio) {
      aspect = ratio[1] === '43' ? '43' : ratio[1] === '169' || ratio[1] === '1610' ? '169' : aspect;
    }
    const size = /^(\d+)pt$/.exec(option);
    if (size) {
      const parsed = Number(size[1]);
      if (FONT_SIZE_OPTIONS.includes(parsed as FontSizePt)) fontSize = parsed as FontSizePt;
    }
  }

  const meta: DeckMeta = {
    title: cleanMeta(firstCommandArgument(source, 'title')) || 'Imported presentation',
    subtitle: cleanMeta(firstCommandArgument(source, 'subtitle')),
    author: cleanMeta(firstCommandArgument(source, 'author')),
    institute: cleanMeta(firstCommandArgument(source, 'institute')),
    date: cleanMeta(firstCommandArgument(source, 'date')),
  };

  const theme: ThemeSettings = {
    ...DEFAULT_THEME,
    custom: { enabled: false },
    backgrounds: { all: [], title: [], section: [] },
    foregrounds: { all: [], title: [], section: [] },
  };

  const templateName = firstCommandArgument(source, 'usetheme');
  if (templateName) {
    const known = (Object.keys(THEME_SPECS) as ThemeName[]).find(
      (name) => name.toLowerCase() === templateName.trim().toLowerCase(),
    );
    if (known) theme.template = known;
    else warn(`Theme “${templateName.trim()}” is not built in; using ${theme.template}.`);
  }

  const colorThemes = allCommandArguments(source, 'usecolortheme');
  const colorName = colorThemes[colorThemes.length - 1];
  if (colorName) {
    const known = COLOR_THEME_NAMES.find(
      (name) => name.toLowerCase() === colorName.trim().toLowerCase(),
    );
    if (known) theme.colorTheme = known;
    else warn(`Color theme “${colorName.trim()}” is not built in; using the template default.`);
  } else {
    const spec = THEME_SPECS[theme.template];
    theme.colorTheme = spec?.colorThemes[0] ?? DEFAULT_THEME.colorTheme;
  }

  const fontCandidates = [
    ...source.matchAll(/\\(?:setsansfont|setmainfont)\s*\{([^{}]*)\}/g),
  ].map((match) => match[1].trim());
  if (fontCandidates.length > 0) {
    const known = fontFromName(fontCandidates[0]);
    if (known) {
      theme.fontFamily = known;
    } else if (sanitizeFontName(fontCandidates[0])) {
      theme.fontFamily = 'custom';
      theme.customFont = sanitizeFontName(fontCandidates[0]);
      warn(`Font “${theme.customFont}” is not in the catalog; imported as a custom family.`);
    }
  }

  const colorDefs = new Map<string, string>();
  for (const match of source.matchAll(
    /\\definecolor\{([A-Za-z0-9]+)\}\{(?:HTML|rgb|RGB)\}\{([^}]*)\}/g,
  )) {
    const color = parseRgbColor(match[2]);
    if (color) colorDefs.set(match[1], color);
  }
  const custom = { ...theme.custom };
  if (colorDefs.has('bxStructure')) custom.structure = colorDefs.get('bxStructure');
  if (colorDefs.has('bxPrimaryBar')) custom.primaryBar = colorDefs.get('bxPrimaryBar');
  if (colorDefs.has('bxBackground')) custom.background = colorDefs.get('bxBackground');
  if (colorDefs.has('bxForeground')) custom.foreground = colorDefs.get('bxForeground');
  if (colorDefs.has('bxAlert')) custom.alert = colorDefs.get('bxAlert');
  custom.enabled = Object.keys(custom).some((key) => key !== 'enabled');
  theme.custom = custom;

  if (/\\setbeamertemplate\{navigation symbols\}\{\s*\}/.test(source)) {
    theme.navigationSymbols = false;
  }

  const blocksTemplate = /\\setbeamertemplate\{blocks\}(?:\[([^\]]*)\])?(?:\[([^\]]*)\])?/.exec(
    source,
  );
  if (blocksTemplate) {
    const shape = (blocksTemplate[1] ?? '').trim();
    if (shape === 'default') theme.blockShape = 'rectangle';
    else if (shape === 'rounded') theme.blockShape = 'rounded';
    const shadow = /shadow\s*=\s*(true|false)/.exec(blocksTemplate[2] ?? '');
    if (shadow) theme.blockShadow = shadow[1] === 'true';
  }

  const itemTemplate = /\\setbeamertemplate\{itemize item\}\{([^}]*)\}/.exec(source);
  if (itemTemplate) {
    const value = itemTemplate[1];
    if (value.includes('blacktriangleright')) theme.bulletShape = 'triangle';
    else if (value.includes('blacksquare')) theme.bulletShape = 'square';
    else if (value.includes('circ')) theme.bulletShape = 'circle';
    else if (value.includes('textbullet')) theme.bulletShape = 'ball';
  }

  let mainLanguage: LanguageId = 'english';
  const otherLanguages: LanguageId[] = [];
  const babel = /\\usepackage\s*(?:\[([^\]]*)\])?\s*\{babel\}/.exec(source);
  if (babel?.[1]) {
    const ids = babel[1]
      .split(',')
      .map((entry) => languageFromTex(entry))
      .filter((id): id is LanguageId => id !== null);
    if (ids.length > 0) {
      mainLanguage = ids[ids.length - 1];
      for (const id of ids.slice(0, -1)) {
        if (id !== mainLanguage && !otherLanguages.includes(id)) otherLanguages.push(id);
      }
    }
  }
  const mainLanguageArg =
    allCommandArguments(source, 'setmainlanguage').concat(
      allCommandArguments(source, 'setdefaultlanguage'),
    );
  const explicitMain = mainLanguageArg[mainLanguageArg.length - 1];
  if (explicitMain) {
    const id = languageFromTex(explicitMain);
    if (id) mainLanguage = id;
  }
  for (const raw of allCommandArguments(source, 'setotherlanguage')) {
    const id = languageFromTex(raw);
    if (id && id !== mainLanguage && !otherLanguages.includes(id)) otherLanguages.push(id);
  }

  return {
    meta,
    aspect,
    theme,
    document: { ...DEFAULT_DOCUMENT, mainLanguage, otherLanguages, fontSize },
    warnings,
  };
}

/** Keeps the group content of commands such as \only<2>{text}. */
function unwrapCommand(
  source: string,
  name: string,
  groups: number,
  pick: number,
): string {
  let out = '';
  let index = 0;
  while (index < source.length) {
    if (source[index] === '\\') {
      const command = readCommandName(source, index);
      if (command && command.name === name && !/[a-zA-Z]/.test(source[command.end] ?? '')) {
        let cursor = skipSpaces(source, command.end);
        cursor = skipOverlay(source, cursor);
        const parsed: string[] = [];
        let end = cursor;
        for (let count = 0; count < groups; count += 1) {
          const group = readGroupAt(source, skipSpaces(source, end));
          if (!group) break;
          parsed.push(group.value);
          end = group.end;
        }
        if (parsed.length === groups) {
          out += parsed[pick] ?? '';
          index = end;
          continue;
        }
      }
    }
    out += source[index];
    index += 1;
  }
  return out;
}

interface InlineContext {
  /** Set when a leading \hspace*{...} should become a paragraph indent. */
  indent?: number;
}

function sanitizeInline(source: string, context: InlineContext = {}): string {
  let out = '';
  let index = 0;
  while (index < source.length) {
    if (source[index] !== '\\') {
      out += source[index];
      index += 1;
      continue;
    }
    const command = readCommandName(source, index);
    if (!command) {
      out += source[index];
      index += 1;
      continue;
    }
    const name = command.name;
    let cursor = skipSpaces(source, command.end);
    cursor = skipOverlay(source, cursor);
    const end = cursor;

    if (name === '(') {
      const close = source.indexOf('\\)', end);
      if (close >= 0) {
        out += `$${sanitizeInline(source.slice(end, close), context)}$`;
        index = close + 2;
        continue;
      }
    }
    if (name === 'verb') {
      const delimiter = source[end];
      if (delimiter && delimiter !== ' ') {
        const close = source.indexOf(delimiter, end + 1);
        if (close > 0) {
          const content = source.slice(end + 1, close).replace(/([{}%#&_$])/g, '\\$1');
          out += `\\texttt{${content}}`;
          index = close + 1;
          continue;
        }
      }
    }
    if (name === 'textcolor' || name === 'colorbox') {
      const first = readGroupAt(source, end);
      if (first) {
        const second = readGroupAt(source, skipSpaces(source, first.end));
        if (second) {
          out += sanitizeInline(second.value, context);
          index = second.end;
          continue;
        }
      }
    }
    if (name === 'only' || name === 'uncover' || name === 'visible') {
      const group = readGroupAt(source, end);
      if (group) {
        out += sanitizeInline(group.value, context);
        index = group.end;
        continue;
      }
      index = end;
      continue;
    }
    if (name === 'alt') {
      const first = readGroupAt(source, end);
      if (first) {
        const second = readGroupAt(source, skipSpaces(source, first.end));
        out += sanitizeInline(first.value, context);
        index = second ? second.end : first.end;
        continue;
      }
    }
    if (name === 'invisible') {
      const group = readGroupAt(source, end);
      index = group ? group.end : end;
      continue;
    }
    if (
      name === 'label' ||
      name === 'note' ||
      name === 'thanks' ||
      name === 'inst' ||
      name === 'footnotemark' ||
      name === 'usebeamertemplate' ||
      name === 'setlength' ||
      name === 'addtolength' ||
      name === 'newlength' ||
      name === 'vspace' ||
      name === 'vskip'
    ) {
      let groupStart = skipSpaces(source, command.end);
      if (source[groupStart] === '*') groupStart = skipSpaces(source, groupStart + 1);
      if (source[groupStart] === '<') groupStart = skipSpaces(source, skipOverlay(source, groupStart));
      const group = readGroupAt(source, groupStart);
      if (group) {
        index = group.end;
        continue;
      }
      index = command.end;
      continue;
    }
    if (name === 'hspace') {
      let groupStart = skipSpaces(source, command.end);
      if (source[groupStart] === '*') groupStart = skipSpaces(source, groupStart + 1);
      const group = readGroupAt(source, groupStart);
      if (group) {
        const em = /^\s*([\d.]+)\s*em\s*$/.exec(group.value);
        if (em && context.indent === undefined) {
          const value = Number(em[1]);
          if (Number.isFinite(value) && value > 0) context.indent = Math.min(8, value);
        }
        index = group.end;
        continue;
      }
    }
    if (name === 'newline') {
      out += '\\\\';
      index = end;
      continue;
    }
    if (name === '\\' || name === 'cr') {
      out += '\\\\';
      index = command.end;
      continue;
    }
    if (
      name === 'fontfamily' ||
      name === 'fontseries' ||
      name === 'fontshape' ||
      name === 'fontsize' ||
      name === 'usefont'
    ) {
      let skipTo = skipSpaces(source, command.end);
      for (let count = 0; count < 4; count += 1) {
        const group = readGroupAt(source, skipTo);
        if (!group) break;
        skipTo = skipSpaces(source, group.end);
      }
      index = skipTo;
      continue;
    }
    const colorCommandGroups: Record<string, number> = {
      definecolor: 3,
      colorlet: 2,
      setbeamercolor: 2,
      setbeamerfont: 2,
      setbeamertemplate: 2,
    };
    if (colorCommandGroups[name]) {
      let skipTo = skipSpaces(source, command.end);
      for (let count = 0; count < colorCommandGroups[name]; count += 1) {
        if (source[skipTo] === '[') {
          const option = readOptionAt(source, skipTo);
          if (option) skipTo = skipSpaces(source, option.end);
        }
        const group = readGroupAt(source, skipTo);
        if (!group) break;
        skipTo = skipSpaces(source, group.end);
      }
      index = skipTo;
      continue;
    }
    if (DROP_COMMANDS.has(name)) {
      index = end;
      continue;
    }
    if (name === 'item') {
      index = end;
      continue;
    }
    if (name === 'includegraphics') {
      let groupStart = skipSpaces(source, command.end);
      if (source[groupStart] === '[') {
        const option = readOptionAt(source, groupStart);
        if (option) groupStart = skipSpaces(source, option.end);
      }
      const group = readGroupAt(source, groupStart);
      index = group ? group.end : command.end;
      continue;
    }
    if (name === 'begin' || name === 'end') {
      const group = readGroupAt(source, skipSpaces(source, command.end));
      if (group) {
        index = group.end;
        continue;
      }
    }
    if (name === 'caption') {
      const group = readGroupAt(source, end);
      index = group ? group.end : command.end;
      continue;
    }

    out += `\\${name}`;
    index = command.end;
    // A control word swallows the spaces after it; a control symbol (\%, \&) does not.
    if (cursor > command.end && /^[A-Za-z]/.test(name)) index = cursor;
  }
  return out;
}

function normalizeParagraphText(raw: string): string {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines
    .join(' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function paragraphsFromRaw(
  raw: string,
  align?: 'left' | 'center' | 'right',
): Block[] {
  const blocks: Block[] = [];
  for (const part of raw.split(/\n[ \t]*\n+/)) {
    const context: InlineContext = {};
    let text = part;
    const leadingIndent = /^\s*\\indent(?![A-Za-z])/.test(text);
    if (leadingIndent) {
      context.indent = 1;
      text = text.replace(/^\s*\\indent(?![A-Za-z])/, '');
    }
    text = sanitizeInline(text, context);
    text = normalizeParagraphText(text);
    if (!text.replace(/[{}]/g, '').trim()) continue;
    const paragraph: Block = {
      id: uid('block'),
      type: 'paragraph',
      text,
      ...(align ? { align } : {}),
      ...(context.indent ? { indent: context.indent } : {}),
    };
    blocks.push(paragraph);
  }
  return blocks;
}

function withAlignment(
  blocks: Block[],
  align: 'left' | 'center' | 'right',
): Block[] {
  return blocks.map((block) =>
    block.type === 'paragraph' ? { ...block, align } : block,
  );
}

function splitListItems(
  body: string,
): Array<{ text: string; pause: boolean; label: string | null }> {
  const chunks: Array<{ text: string; pause: boolean; label: string | null }> = [];
  let current: string | null = null;
  let currentPause = false;
  let currentLabel: string | null = null;
  let pendingPause = false;
  let index = 0;
  const push = () => {
    if (current !== null) chunks.push({ text: current, pause: currentPause, label: currentLabel });
    current = null;
    currentPause = false;
    currentLabel = null;
  };
  while (index < body.length) {
    if (body.startsWith('\\begin', index)) {
      const env = readEnvironmentAt(body, index);
      if (env) {
        if (current !== null) current += body.slice(index, env.end);
        index = env.end;
        continue;
      }
    }
    if (body[index] === '\\') {
      const command = readCommandName(body, index);
      if (command?.name === 'pause') {
        // Beamer emits \pause between the previous and the next item.
        pendingPause = true;
        index = command.end;
        continue;
      }
      if (command?.name === 'item') {
        push();
        let cursor = skipSpaces(body, command.end);
        let pause = pendingPause;
        pendingPause = false;
        if (body[cursor] === '<') {
          const close = body.indexOf('>', cursor + 1);
          if (close > 0) {
            const spec = body.slice(cursor + 1, close).trim();
            pause = pause || (spec !== '1' && spec !== '');
            cursor = skipSpaces(body, close + 1);
          }
        }
        if (body[cursor] === '[') {
          const label = readOptionAt(body, cursor);
          if (label) {
            currentLabel = label.value;
            cursor = skipSpaces(body, label.end);
          }
        }
        current = '';
        currentPause = pause;
        index = cursor;
        continue;
      }
    }
    if (current !== null) current += body[index];
    index += 1;
  }
  push();
  return chunks;
}

function firstNestedList(body: string): { start: number; end: number; env: EnvAt } | null {
  let index = 0;
  while (index < body.length) {
    if (body.startsWith('\\begin', index)) {
      const env = readEnvironmentAt(body, index);
      if (env) {
        if (LIST_ENVS.has(env.name)) return { start: index, end: env.end, env };
        index = env.end;
        continue;
      }
    }
    index += 1;
  }
  return null;
}

function pushListItems(
  items: Item[],
  body: string,
  depth: 0 | 1 | 2,
  pauseCarry = false,
): void {
  const chunks = splitListItems(body);
  for (const chunk of chunks) {
    const nested = firstNestedList(chunk.text);
    const before = nested ? chunk.text.slice(0, nested.start) : chunk.text;
    const text = normalizeParagraphText(sanitizeInline(before));
    if (text) {
      items.push({
        id: uid('item'),
        text,
        depth,
        ...(chunk.pause || pauseCarry ? { pause: true } : {}),
      });
    }
    if (nested) {
      const nextDepth = depth < 2 ? ((depth + 1) as 0 | 1 | 2) : depth;
      pushListItems(items, nested.env.body, nextDepth);
    }
  }
}

function parseListEnvironment(env: EnvAt): Block {
  const items: Item[] = [];
  pushListItems(items, env.body, 0);
  if (items.length === 0) {
    items.push({ id: uid('item'), text: 'Empty list', depth: 0 });
  }
  return {
    id: uid('block'),
    type: 'list',
    ordered: env.name === 'enumerate',
    items,
  };
}

function parseDescriptionEnvironment(env: EnvAt): Block {
  const items: Item[] = [];
  for (const chunk of splitListItems(env.body)) {
    const label = chunk.label?.trim();
    const body = normalizeParagraphText(sanitizeInline(chunk.text));
    items.push({
      id: uid('item'),
      text: label ? `\\textbf{${label}} ${body}`.trim() : body,
      depth: 0,
      ...(chunk.pause ? { pause: true } : {}),
    });
  }
  return {
    id: uid('block'),
    type: 'list',
    ordered: false,
    items,
  };
}

function stripLeadingGroup(source: string): string {
  const index = skipSpaces(source, 0);
  if (source[index] !== '{') return source;
  const group = readGroupAt(source, index);
  if (!group) return source;
  // Only a width/option argument such as {0.48\textwidth} is stripped.
  if (!/[\\\d]/.test(group.value)) return source;
  return source.slice(group.end);
}

function parseColumnsEnvironment(
  env: EnvAt,
  warn: (message: string) => void,
): Block {
  const columns: string[] = [];
  let index = 0;
  while (index < env.body.length) {
    if (env.body.startsWith('\\begin', index)) {
      const child = readEnvironmentAt(env.body, index);
      if (child && child.name === 'column') {
        columns.push(stripLeadingGroup(child.body));
        index = child.end;
        continue;
      }
      if (child) {
        index = child.end;
        continue;
      }
    }
    index += 1;
  }
  if (columns.length === 0) {
    // Legacy \column{width} markers.
    const parts = env.body.split(/(?=\\column\b)/);
    for (const part of parts) {
      const match = /^\\column(?![A-Za-z])\s*(?:\[[^\]]*\])?\s*(?:\{[^}]*\})?/.exec(part);
      if (match) columns.push(part.slice(match[0].length));
    }
  }
  if (columns.length === 0) columns.push(env.body);
  if (columns.length > 2) {
    warn('A columns environment had more than two columns; extra columns were merged into the right side.');
  }
  const left = parseBlocks(columns[0] ?? '');
  const right = parseBlocks(columns.slice(1).join('\n'));
  return { id: uid('block'), type: 'columns', left, right };
}

function stripRules(content: string): {
  content: string;
  bordered: boolean;
  hasMidrule: boolean;
} {
  let bordered = /\\hline/.test(content);
  const hasMidrule = /\\midrule/.test(content);
  const cleaned = content
    .replace(/\\(?:toprule|midrule|bottomrule|hline)\s*(?:\[[^\]]*\])?/g, '')
    .replace(/\\cline\s*\{[^}]*\}/g, '')
    .replace(/\\cmidrule\s*(?:\([^)]*\))?\s*\{[^}]*\}/g, '')
    .replace(/\\addlinespace\s*(?:\[[^\]]*\])?/g, '')
    .replace(/\\specialrule\s*\{[^}]*\}\s*\{[^}]*\}\s*\{[^}]*\}/g, '')
    .replace(/\\centering|\\small|\\footnotesize/g, '');
  if (!bordered && /\|/.test(content)) bordered = true;
  return { content: cleaned, bordered, hasMidrule };
}

function splitTableRow(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  let depth = 0;
  let index = 0;
  while (index < row.length) {
    const char = row[index];
    if (char === '\\') {
      if (row.startsWith('\\begin', index)) {
        const env = readEnvironmentAt(row, index);
        if (env) {
          current += row.slice(index, env.end);
          index = env.end;
          continue;
        }
      }
      current += char + (row[index + 1] ?? '');
      index += 2;
      continue;
    }
    if (char === '{') {
      depth += 1;
      current += char;
      index += 1;
      continue;
    }
    if (char === '}') {
      depth = Math.max(0, depth - 1);
      current += char;
      index += 1;
      continue;
    }
    if (char === '&' && depth === 0) {
      cells.push(current);
      current = '';
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }
  cells.push(current);
  return cells;
}

function splitTableRows(content: string): string[] {
  const rows: string[] = [];
  let current = '';
  let depth = 0;
  let index = 0;
  while (index < content.length) {
    const char = content[index];
    if (char === '\\') {
      if (content.startsWith('\\begin', index)) {
        const env = readEnvironmentAt(content, index);
        if (env) {
          current += content.slice(index, env.end);
          index = env.end;
          continue;
        }
      }
      if (content[index + 1] === '\\' && depth === 0) {
        rows.push(current);
        current = '';
        let cursor = index + 2;
        if (content[cursor] === '*') cursor += 1;
        if (content[cursor] === '[') {
          const option = readOptionAt(content, cursor);
          if (option) cursor = option.end;
        }
        index = cursor;
        continue;
      }
      const command = readCommandName(content, index);
      if (depth === 0 && (command?.name === 'cr' || command?.name === 'tabularnewline')) {
        rows.push(current);
        current = '';
        index = command.end;
        continue;
      }
      current += char + (content[index + 1] ?? '');
      index += 2;
      continue;
    }
    if (char === '{') {
      depth += 1;
      current += char;
      index += 1;
      continue;
    }
    if (char === '}') {
      depth = Math.max(0, depth - 1);
      current += char;
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }
  if (current.trim()) rows.push(current);
  return rows;
}

function parseTableSpec(spec: string): TableAlign[] {
  const aligns: TableAlign[] = [];
  let index = 0;
  while (index < spec.length) {
    const char = spec[index];
    if (char === '{') {
      const group = readGroupAt(spec, index);
      index = group ? group.end : index + 1;
      continue;
    }
    if (char === '*') {
      const countGroup = readGroupAt(spec, skipSpaces(spec, index + 1));
      if (countGroup) {
        const count = Math.max(0, Math.min(12, Number(countGroup.value) || 0));
        const inner = readGroupAt(spec, skipSpaces(spec, countGroup.end));
        if (inner) {
          const innerAligns = parseTableSpec(inner.value);
          for (let repeat = 0; repeat < count; repeat += 1) aligns.push(...innerAligns);
          index = inner.end;
          continue;
        }
      }
    }
    if (char === 'l') aligns.push('left');
    else if (char === 'c') aligns.push('center');
    else if (char === 'r') aligns.push('right');
    else if (char === 'X' || char === 'p' || char === 'm' || char === 'b') aligns.push('left');
    else if (char === 'S') aligns.push('center');
    index += 1;
  }
  return aligns.length > 0 ? aligns.slice(0, 12) : ['left'];
}

function unwrapCellCommands(raw: string): string {
  let text = raw;
  for (let pass = 0; pass < 4; pass += 1) {
    const before = text;
    text = unwrapCommand(text, 'multicolumn', 3, 2);
    text = unwrapCommand(text, 'multirow', 3, 2);
    text = unwrapCommand(text, 'makecell', 1, 0);
    text = unwrapCommand(text, 'parbox', 2, 1);
    if (text === before) break;
  }
  return text;
}

function cleanCell(raw: string): string {
  const sanitized = sanitizeInline(unwrapCellCommands(raw));
  return normalizeParagraphText(sanitized);
}

function stripOuterTextbf(cell: string): { text: string; bold: boolean } {
  const trimmed = cell.trim();
  if (!trimmed.startsWith('\\textbf')) return { text: cell, bold: false };
  const command = readCommandName(trimmed, 0);
  if (!command || command.name !== 'textbf') return { text: cell, bold: false };
  const group = readGroupAt(trimmed, skipSpaces(trimmed, command.end));
  if (!group || group.end !== trimmed.length) return { text: cell, bold: false };
  return { text: group.value, bold: true };
}

function parseTabular(content: string, spec: string): {
  rows: string[][];
  align: TableAlign[];
  header: boolean;
  bordered: boolean;
} | null {
  const prepared = stripRules(content);
  const rows = splitTableRows(prepared.content)
    .map((row) => splitTableRow(row).map(cleanCell))
    .filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) return null;
  const align = parseTableSpec(spec);
  const headerCells = rows[0].map(stripOuterTextbf);
  const boldHeader =
    headerCells.length > 0 && headerCells.every((cell) => cell.bold || cell.text.trim() === '');
  if (boldHeader) rows[0] = headerCells.map((cell) => cell.text);
  const header = boldHeader || (prepared.hasMidrule && rows.length > 1);
  const columns = Math.max(align.length, ...rows.map((row) => row.length), 1);
  const normalized = rows.map((row) =>
    Array.from({ length: columns }, (_, column) => row[column] ?? ''),
  );
  const paddedAlign = Array.from(
    { length: columns },
    (_, column) => align[column] ?? 'left',
  );
  return {
    rows: normalized,
    align: paddedAlign,
    header,
    bordered: prepared.bordered && !prepared.content.includes('\\toprule'),
  };
}

function tableFromEnvironment(
  env: EnvAt,
  warn: (message: string) => void,
): Block | null {
  let caption = '';
  let body = env.body;
  if (env.name === 'table' || env.name === 'table*') {
    const captionMatch = /\\caption\s*(?:\[[^\]]*\])?\s*\{/.exec(body);
    if (captionMatch) {
      const group = readGroupAt(body, captionMatch.index + captionMatch[0].length - 1);
      if (group) {
        caption = cleanCell(group.value);
        body = body.slice(0, captionMatch.index) + body.slice(group.end);
      }
    }
  }
  let tabular: EnvAt | null = null;
  let index = 0;
  while (index < body.length) {
    if (body.startsWith('\\begin', index)) {
      const child = readEnvironmentAt(body, index);
      if (child && (child.name === 'tabular' || child.name === 'tabular*' || child.name === 'array')) {
        tabular = child;
        break;
      }
      if (child) {
        index = child.end;
        continue;
      }
    }
    index += 1;
  }
  if (!tabular) {
    if (env.name === 'tabular' || env.name === 'tabular*' || env.name === 'array') tabular = env;
    else {
      warn(`A ${env.name} environment without a tabular was imported as plain content.`);
      return null;
    }
  }
  let spec = '';
  let content = tabular.body;
  const first = readGroupAt(content, skipSpaces(content, 0));
  if (tabular.name === 'tabular*') {
    const second = first ? readGroupAt(content, skipSpaces(content, first.end)) : null;
    if (second) {
      spec = second.value;
      content = content.slice(second.end);
    }
  } else if (first) {
    spec = first.value;
    content = content.slice(first.end);
  }
  const parsed = parseTabular(content, spec);
  if (!parsed) {
    warn('A table could not be parsed and was skipped.');
    return null;
  }
  return {
    id: uid('block'),
    type: 'table',
    rows: parsed.rows,
    align: parsed.align,
    header: parsed.header,
    ...(parsed.bordered ? { bordered: true } : {}),
    ...(caption ? { caption } : {}),
  };
}

function parseMathEnvironment(env: EnvAt): Block {
  let tex = env.body
    .replace(/\\label\s*\{[^}]*\}/g, '')
    .replace(/\\(?:nonumber|notag|noalign)\b/g, '')
    .trim();
  const mode = MATH_ENVS[env.name] ?? 'plain';
  if (mode === 'aligned' && !/^\s*\\begin\{aligned\}/.test(tex)) {
    tex = `\\begin{aligned}\n${tex}\n\\end{aligned}`;
  } else if (mode === 'gathered' && !/^\s*\\begin\{gathered\}/.test(tex)) {
    tex = `\\begin{gathered}\n${tex}\n\\end{gathered}`;
  }
  return { id: uid('block'), type: 'math', tex };
}

function codeLanguageFromOptions(options: string | null): string {
  if (!options) return 'text';
  const language = /(?:^|,)\s*language\s*=\s*(?:\{([^}]*)\}|([^,]+))/i.exec(options);
  const raw = (language?.[1] ?? language?.[2] ?? '').trim();
  if (!raw) return 'text';
  const cleaned = raw.replace(/^\[[^\]]*\]/, '').trim();
  return validCodeLang(cleaned);
}

function parseCodeEnvironment(env: EnvAt): Block {
  let language = 'text';
  let caption = '';
  let lineNumbers = false;
  if (env.name === 'lstlisting') {
    language = codeLanguageFromOptions(env.options);
    const captionMatch = /(?:^|,)\s*caption\s*=\s*(\{[^}]*\}|[^,]+)/i.exec(env.options ?? '');
    if (captionMatch) caption = cleanCell(captionMatch[1].replace(/^\{|\}$/g, ''));
    lineNumbers = /(?:^|,)\s*numbers\s*=\s*(?:left|right)/i.test(env.options ?? '');
  } else if (env.name === 'minted') {
    const firstGroup = readGroupAt(env.body, skipSpaces(env.body, 0));
    const explicit = readOptionAt(env.body, skipSpaces(env.body, 0));
    if (!explicit && firstGroup) {
      language = validCodeLang(firstGroup.value.trim());
      env = { ...env, body: env.body.slice(firstGroup.end) };
    }
    lineNumbers = /(?:^|,)\s*linenos\b/i.test(env.options ?? '');
  } else if (env.name === 'Verbatim') {
    lineNumbers = /(?:^|,)\s*numbers\s*=\s*(?:left|right)/i.test(env.options ?? '');
  }
  const text = env.body.replace(/^\n/, '').replace(/\n\s*$/, '');
  return {
    id: uid('block'),
    type: 'code',
    lang: language,
    text,
    ...(caption ? { caption } : {}),
    ...(lineNumbers ? { lineNumbers: true } : {}),
  };
}

function parseTikzEnvironment(env: EnvAt, warn: (message: string) => void): Block | null {
  let body = env.body;
  let width = 100;
  let height = 60;
  const bounding = /\\useasboundingbox\s*\([^)]*\)\s*rectangle\s*\(\s*([\d.]+)\s*(?:mm|cm)?\s*,\s*([\d.]+)\s*(?:mm|cm)?\s*\)\s*;/.exec(
    body,
  );
  if (bounding) {
    const unit = /cm/.test(bounding[0]) ? 10 : 1;
    width = Number(bounding[1]) * unit;
    height = Number(bounding[2]) * unit;
    body = body.replace(bounding[0], '');
  }
  const xFactor = /(?:^|,)\s*x\s*=\s*([\d.]+)\s*mm/.exec(env.options ?? '');
  const scale = xFactor ? Number(xFactor[1]) : 1;
  const parsed = parseIntoDrawing(body, { width, height });
  if (scale !== 1 && Number.isFinite(scale) && scale > 0) {
    const scaled = parsed.drawing.shapes.map((shape) => ({
      ...shape,
      x: shape.x * scale,
      y: shape.y * scale,
      ...(shape.x2 !== undefined ? { x2: shape.x2 * scale } : {}),
      ...(shape.y2 !== undefined ? { y2: shape.y2 * scale } : {}),
      ...(shape.points
        ? { points: shape.points.map((point) => ({ x: point.x * scale, y: point.y * scale })) }
        : {}),
      ...(shape.fontSize !== undefined ? { fontSize: shape.fontSize * scale } : {}),
      ...(shape.strokeWidth !== undefined ? { strokeWidth: shape.strokeWidth * scale } : {}),
      ...(shape.cornerRadius !== undefined ? { cornerRadius: shape.cornerRadius * scale } : {}),
    }));
    parsed.drawing = {
      width: parsed.width * scale,
      height: parsed.height * scale,
      shapes: scaled,
    };
  }
  if (parsed.unsupported > 0) {
    warn(
      `A TikZ drawing contains ${parsed.unsupported} command(s) outside the editable subset; they are kept in the source code.`,
    );
  }
  return {
    id: uid('block'),
    type: 'tikz',
    name: 'Imported TikZ',
    widthPct: 70,
    drawing: parsed.drawing,
  };
}

function parseImageCommand(
  source: string,
  start: number,
): { block: Block; end: number } | null {
  const command = readCommandName(source, start);
  if (!command || command.name !== 'includegraphics') return null;
  let cursor = skipSpaces(source, command.end);
  let options: string | null = null;
  if (source[cursor] === '[') {
    const option = readOptionAt(source, cursor);
    if (option) {
      options = option.value;
      cursor = skipSpaces(source, option.end);
    }
  }
  const group = readGroupAt(source, cursor);
  if (!group) return null;
  const path = group.value.trim();
  const name = path.split(/[\\/]/).pop() || 'image.png';
  let widthPct = 70;
  const widthOption = /(?:^|,)\s*width\s*=\s*([\d.]+)\s*\\(?:textwidth|linewidth|columnwidth)/.exec(
    options ?? '',
  );
  if (widthOption) widthPct = Number(widthOption[1]) * 100;
  else {
    const absolute = /(?:^|,)\s*width\s*=\s*([\d.]+)\s*(cm|mm|in)/.exec(options ?? '');
    if (absolute) {
      const unit = absolute[2] === 'cm' ? 1 : absolute[2] === 'mm' ? 0.1 : 2.54;
      widthPct = (Number(absolute[1]) * unit * 100) / 12;
    } else {
      const scale = /(?:^|,)\s*scale\s*=\s*([\d.]+)/.exec(options ?? '');
      if (scale) widthPct = Number(scale[1]) * 100;
    }
  }
  widthPct = Math.max(10, Math.min(100, Math.round(widthPct)));
  return {
    block: {
      id: uid('block'),
      type: 'image',
      src: '',
      name,
      widthPct,
    },
    end: group.end,
  };
}

function figureBlock(
  env: EnvAt,
  warn: (message: string) => void,
): Block[] {
  let caption = '';
  const captionMatch = /\\caption\s*(?:\[[^\]]*\])?\s*\{/.exec(env.body);
  if (captionMatch) {
    const group = readGroupAt(env.body, captionMatch.index + captionMatch[0].length - 1);
    if (group) caption = cleanCell(group.value);
  }
  const images: Block[] = [];
  let index = 0;
  while (index < env.body.length) {
    if (env.body.startsWith('\\includegraphics', index)) {
      const parsed = parseImageCommand(env.body, index);
      if (parsed) {
        images.push({ ...parsed.block, ...(caption ? { caption } : {}) } as Block);
        index = parsed.end;
        continue;
      }
    }
    index += 1;
  }
  if (images.length > 0) {
    if (images.length > 1) {
      warn('A figure contained several images; each was imported as its own image block.');
    }
    return images;
  }
  const blocks = parseBlocks(env.body);
  if (caption) {
    if (blocks.length === 1) {
      const only = blocks[0];
      if (only.type === 'tikz') {
        return [{ ...only, caption }];
      }
      if (only.type === 'table' && !only.caption) {
        return [{ ...only, caption }];
      }
    }
    if (blocks.length === 0) {
      return [
        {
          id: uid('block'),
          type: 'paragraph',
          text: caption,
          align: 'center',
        },
      ];
    }
  }
  return blocks;
}

function parseBlockEnvironment(env: EnvAt): Block {
  const titleGroup = readGroupAt(env.body, skipSpaces(env.body, 0));
  const title = titleGroup ? sanitizeInline(titleGroup.value).trim() : '';
  const body = titleGroup ? env.body.slice(titleGroup.end) : env.body;
  return {
    id: uid('block'),
    type: 'block',
    tone: env.name === 'alertblock' ? 'alert' : env.name === 'exampleblock' ? 'example' : 'normal',
    title,
    body: parseBlocks(body),
  };
}

function parseTheoremEnvironment(env: EnvAt): Block {
  const name = THEOREM_ENVS[env.name] ?? env.name;
  const titleGroup = readGroupAt(env.body, skipSpaces(env.body, 0));
  const optionTitle = env.options?.trim();
  const title = titleGroup
    ? `${name}: ${sanitizeInline(titleGroup.value).trim()}`
    : optionTitle
      ? `${name}: ${sanitizeInline(optionTitle).trim()}`
      : name;
  const body = titleGroup ? env.body.slice(titleGroup.end) : env.body;
  return {
    id: uid('block'),
    type: 'block',
    tone: env.name === 'example' ? 'example' : 'normal',
    title,
    body: parseBlocks(body),
  };
}

function parseEnvironment(
  env: EnvAt,
  warn: (message: string) => void,
): Block[] {
  if (LIST_ENVS.has(env.name)) {
    if (env.name === 'description') return [parseDescriptionEnvironment(env)];
    return [parseListEnvironment(env)];
  }
  if (env.name === 'block' || env.name === 'alertblock' || env.name === 'exampleblock') {
    return [parseBlockEnvironment(env)];
  }
  if (THEOREM_ENVS[env.name]) return [parseTheoremEnvironment(env)];
  if (env.name === 'columns') return [parseColumnsEnvironment(env, warn)];
  if (env.name === 'column') return parseBlocks(env.body);
  if (env.name === 'center') return withAlignment(parseBlocks(env.body), 'center');
  if (env.name === 'flushright') return withAlignment(parseBlocks(env.body), 'right');
  if (env.name === 'flushleft') return withAlignment(parseBlocks(env.body), 'left');
  if (env.name === 'figure' || env.name === 'figure*') return figureBlock(env, warn);
  if (env.name === 'table' || env.name === 'table*') {
    const table = tableFromEnvironment(env, warn);
    return table ? [table] : parseBlocks(env.body);
  }
  if (env.name === 'tabular' || env.name === 'tabular*' || env.name === 'array') {
    const table = tableFromEnvironment(env, warn);
    return table ? [table] : [];
  }
  if (MATH_ENVS[env.name]) return [parseMathEnvironment(env)];
  if (env.name === 'lstlisting' || env.name === 'verbatim' || env.name === 'minted' || env.name === 'Verbatim') {
    return [parseCodeEnvironment(env)];
  }
  if (env.name === 'tikzpicture') {
    const tikz = parseTikzEnvironment(env, warn);
    return tikz ? [tikz] : parseBlocks(env.body);
  }
  if (
    env.name === 'minipage' ||
    env.name === 'onlyenv' ||
    env.name === 'uncoverenv' ||
    env.name === 'overlayarea' ||
    env.name === 'overprint' ||
    env.name === 'quote' ||
    env.name === 'quotation' ||
    env.name === 'verse' ||
    env.name === 'beamercolorbox' ||
    env.name === 'tcolorbox' ||
    env.name === 'adjustbox' ||
    env.name === 'wrapfigure'
  ) {
    return parseBlocks(env.body);
  }
  warn(`Environment “${env.name}” is not modeled; its contents were imported as plain blocks.`);
  return parseBlocks(env.body);
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let buffer = '';
  let index = 0;
  const flush = () => {
    if (!buffer.trim()) {
      buffer = '';
      return;
    }
    blocks.push(...paragraphsFromRaw(buffer));
    buffer = '';
  };
  while (index < source.length) {
    if (source.startsWith('\\begin', index)) {
      const env = readEnvironmentAt(source, index);
      if (env) {
        flush();
        blocks.push(...parseEnvironment(env, warnOnce));
        index = env.end;
        continue;
      }
    }
    if (source.startsWith('\\[', index)) {
      const close = source.indexOf('\\]', index + 2);
      if (close > 0) {
        flush();
        const tex = source.slice(index + 2, close).trim();
        if (tex) blocks.push({ id: uid('block'), type: 'math', tex });
        index = close + 2;
        continue;
      }
    }
    if (source.startsWith('$$', index)) {
      const close = source.indexOf('$$', index + 2);
      if (close > 0) {
        flush();
        const tex = source.slice(index + 2, close).trim();
        if (tex) blocks.push({ id: uid('block'), type: 'math', tex });
        index = close + 2;
        continue;
      }
    }
    if (source.startsWith('\\includegraphics', index)) {
      const parsed = parseImageCommand(source, index);
      if (parsed) {
        flush();
        blocks.push(parsed.block);
        warnOnce('Images are imported as placeholders; reattach the files from the image inspector.');
        index = parsed.end;
        continue;
      }
    }
    if (source.startsWith('\\tableofcontents', index)) {
      flush();
      blocks.push({ id: uid('block'), type: 'toc' });
      index += '\\tableofcontents'.length;
      continue;
    }
    buffer += source[index];
    index += 1;
  }
  flush();
  return blocks;
}

/** Replaces \resizebox{..}{..}{content} / \scalebox{..}{content} with content. */
function unwrapBoxes(source: string): string {
  let out = '';
  let index = 0;
  while (index < source.length) {
    if (source[index] === '\\') {
      const command = readCommandName(source, index);
      const count = command?.name === 'resizebox' ? 3 : command?.name === 'scalebox' ? 2 : 0;
      if (command && count > 0) {
        let cursor = skipSpaces(source, command.end);
        const groups: TextGroup[] = [];
        for (let step = 0; step < count; step += 1) {
          const group = readGroupAt(source, cursor);
          if (!group) break;
          groups.push(group);
          cursor = skipSpaces(source, group.end);
        }
        const content = groups[groups.length - 1];
        if (groups.length === count && content) {
          out += unwrapBoxes(content.value);
          index = content.end;
          continue;
        }
      }
    }
    out += source[index];
    index += 1;
  }
  return out;
}

function unwrapOuterGroup(source: string): string {
  const trimmed = source.trim();
  if (!trimmed.startsWith('{')) return source;
  const group = readGroupAt(trimmed, 0);
  if (group && group.end === trimmed.length) return group.value;
  return source;
}

function stripFrametitle(body: string): { title: string | null; subtitle: string | null; body: string } {
  let title: string | null = null;
  let subtitle: string | null = null;
  let text = body;
  const titlePattern = /\\frametitle(?![A-Za-z])\s*(?:<[^>]*>)?\s*(?:\[[^\]]*\])?\s*\{/;
  const titleMatch = titlePattern.exec(text);
  if (titleMatch) {
    const group = readGroupAt(text, titleMatch.index + titleMatch[0].length - 1);
    if (group) {
      title = sanitizeInline(group.value).trim();
      text = text.slice(0, titleMatch.index) + text.slice(group.end);
    }
  }
  const subtitlePattern = /\\framesubtitle(?![A-Za-z])\s*(?:<[^>]*>)?\s*\{/;
  const subtitleMatch = subtitlePattern.exec(text);
  if (subtitleMatch) {
    const group = readGroupAt(text, subtitleMatch.index + subtitleMatch[0].length - 1);
    if (group) {
      subtitle = sanitizeInline(group.value).trim();
      text = text.slice(0, subtitleMatch.index) + text.slice(group.end);
    }
  }
  return { title, subtitle, body: text };
}

function frameArguments(source: string): { title: string; subtitle: string; rest: string } {
  let index = skipSpaces(source, 0);
  for (let guard = 0; guard < 3; guard += 1) {
    if (source[index] === '<') {
      index = skipSpaces(source, skipOverlay(source, index));
      continue;
    }
    if (source[index] === '[') {
      const option = readOptionAt(source, index);
      if (!option) break;
      index = skipSpaces(source, option.end);
      continue;
    }
    break;
  }
  const groupStart = index;
  const first = source[index] === '{' ? readGroupAt(source, index) : null;
  if (!first) return { title: '', subtitle: '', rest: source };
  // A leading group holding template pages or font scaffolding is content,
  // not a frame title (the app itself emits such groups for slide fonts).
  if (
    /\\(?:sectionpage|titlepage|maketitle)(?![A-Za-z])/.test(first.value) ||
    /^\s*\\(?:fontfamily|fontsize|usefont|selectfont|fontseries|fontshape)(?![A-Za-z])/.test(
      first.value,
    )
  ) {
    return { title: '', subtitle: '', rest: source.slice(groupStart) };
  }
  index = first.end;
  // A second braced group is Beamer's subtitle argument, but only when it
  // directly follows the title; a group on the next line is body content.
  let subtitleStart = index;
  while (
    subtitleStart < source.length &&
    (source[subtitleStart] === ' ' || source[subtitleStart] === '\t')
  ) {
    subtitleStart += 1;
  }
  const second = source[subtitleStart] === '{' ? readGroupAt(source, subtitleStart) : null;
  return {
    title: sanitizeInline(first.value).trim(),
    subtitle: second ? sanitizeInline(second.value).trim() : '',
    rest: second ? source.slice(second.end) : source.slice(first.end),
  };
}

function removeTemplatePages(body: string): {
  body: string;
  titlepage: boolean;
  sectionpage: boolean;
} {
  let text = body;
  const titlepage =
    /\\titlepage(?![A-Za-z])/.test(text) ||
    /\\maketitle(?![A-Za-z])/.test(text) ||
    /\\usebeamertemplate\s*\{\s*title page\s*\}/.test(text);
  text = text
    .replace(/\\titlepage(?![A-Za-z])/g, '')
    .replace(/\\maketitle(?![A-Za-z])/g, '')
    .replace(/\\usebeamertemplate\s*\{\s*title page\s*\}/g, '');
  const sectionpage =
    /\\sectionpage(?![A-Za-z])/.test(text) ||
    /\\usebeamertemplate\s*\{\s*section page\s*\}/.test(text);
  text = text
    .replace(/\\sectionpage(?![A-Za-z])/g, '')
    .replace(/\\usebeamertemplate\s*\{\s*section page\s*\}/g, '');
  return { body: text, titlepage, sectionpage };
}

function looksEmpty(source: string): boolean {
  return sanitizeInline(source)
    .replace(/\\par|\\noindent|[{}]/g, '')
    .trim().length === 0;
}

const warnings: string[] = [];
function warnOnce(message: string): void {
  if (!warnings.includes(message)) warnings.push(message);
}

function parseFrameContent(
  rawBody: string,
  titleArg: string,
  subtitleArg: string,
): Slide | null {
  const stripped = stripFrametitle(rawBody);
  const cleanedBody = unwrapBoxes(unwrapOuterGroup(stripped.body));
  const removed = removeTemplatePages(cleanedBody);
  const title = titleArg || stripped.title || '';
  const subtitle = subtitleArg || stripped.subtitle || '';

  if (removed.titlepage) {
    if (!looksEmpty(removed.body)) {
      warnOnce('Extra content on a title-page frame was dropped.');
    }
    return {
      id: uid('slide'),
      kind: 'title',
      title,
      layout: 'normal',
      body: [],
      images: [],
    };
  }

  if (removed.sectionpage) {
    const blocks = parseBlocks(removed.body);
    if (blocks.length === 0) {
      // The \section command already produced the section slide.
      return null;
    }
    return {
      id: uid('slide'),
      kind: 'frame',
      title,
      subtitle,
      layout: 'normal',
      body: blocks,
      images: [],
    };
  }

  return {
    id: uid('slide'),
    kind: 'frame',
    title,
    subtitle,
    layout: 'normal',
    body: parseBlocks(removed.body),
    images: [],
  };
}

function parseSectionCommand(
  source: string,
  start: number,
): { title: string; end: number } | null {
  const command = readCommandName(source, start);
  if (command?.name !== 'section') return null;
  let index = skipSpaces(source, command.end);
  if (source[index] === '*') index = skipSpaces(source, index + 1);
  if (source[index] === '[') {
    const option = readOptionAt(source, index);
    if (!option) return null;
    index = skipSpaces(source, option.end);
  }
  if (source[index] !== '{') return null;
  const group = readGroupAt(source, index);
  if (!group) return null;
  return { title: sanitizeInline(group.value).trim(), end: group.end };
}

function parseDocumentBody(
  body: string,
  meta: DeckMeta,
): Slide[] {
  const slides: Slide[] = [];
  const pattern = /\\begin\s*\{frame\}|\\frame(?![A-Za-z])|\\section(?![A-Za-z])|\\maketitle(?![A-Za-z])|\\titlepage(?![A-Za-z])/g;
  let position = 0;
  while (position < body.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(body);
    if (!match) break;
    const at = match.index;
    if (match[0].startsWith('\\begin')) {
      const env = readEnvironmentAt(body, at);
      if (!env) {
        position = at + match[0].length;
        continue;
      }
      if (env.name !== 'frame' && env.name !== 'frame*') {
        position = env.end;
        continue;
      }
      const args = frameArguments(env.body);
      const slide = parseFrameContent(args.rest, args.title, args.subtitle);
      if (slide) slides.push(slide);
      position = env.end;
      continue;
    }
    if (match[0] === '\\section') {
      const section = parseSectionCommand(body, at);
      if (!section) {
        position = at + match[0].length;
        continue;
      }
      const last = slides[slides.length - 1];
      if (!last || last.kind !== 'section' || last.title !== section.title) {
        slides.push({
          id: uid('slide'),
          kind: 'section',
          title: section.title,
          layout: 'normal',
          body: [],
          images: [],
        });
      }
      position = section.end;
      continue;
    }
    if (match[0] === '\\frame') {
      let index = skipSpaces(body, at + '\\frame'.length);
      for (let guard = 0; guard < 2; guard += 1) {
        if (body[index] === '<') {
          index = skipSpaces(body, skipOverlay(body, index));
        } else if (body[index] === '[') {
          const option = readOptionAt(body, index);
          if (!option) break;
          index = skipSpaces(body, option.end);
        } else {
          break;
        }
      }
      const group = body[index] === '{' ? readGroupAt(body, index) : null;
      if (!group) {
        position = at + match[0].length;
        continue;
      }
      const slide = parseFrameContent(group.value, '', '');
      if (slide) slides.push(slide);
      position = group.end;
      continue;
    }
    if (match[0] === '\\maketitle' || match[0] === '\\titlepage') {
      slides.push({
        id: uid('slide'),
        kind: 'title',
        title: meta.title,
        layout: 'normal',
        body: [],
        images: [],
      });
      position = at + match[0].length;
      continue;
    }
    position = at + match[0].length;
  }
  return slides;
}

function findDocumentBounds(source: string): { preamble: string; body: string } {
  const begin = /\\begin\s*\{document\}/.exec(source);
  if (!begin) return { preamble: source, body: source };
  const bodyStart = begin.index + begin[0].length;
  const end = /\\end\s*\{document\}/.exec(source.slice(bodyStart));
  const bodyEnd = end ? bodyStart + end.index : source.length;
  return { preamble: source.slice(0, begin.index), body: source.slice(bodyStart, bodyEnd) };
}

/**
 * Approximately imports a Beamer source file. The parser maps the common
 * structural commands onto the deck model; everything it cannot model is
 * reported as a warning and, where possible, kept as plain content.
 */
export function importBeamer(source: string): ImportResult {
  warnings.length = 0;
  const normalized = stripComments(
    source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'),
  ).replace(/\\(begin|end)[ \t]*\{/g, '\\$1{');
  if (!normalized.trim()) throw new Error('The LaTeX source is empty.');

  const { preamble, body } = findDocumentBounds(normalized);
  const info = parsePreamble(preamble);
  for (const warning of info.warnings) warnOnce(warning);
  if (!/\\begin\s*\{document\}/.test(normalized)) {
    warnOnce('No \\begin{document} was found; the whole file was parsed as frame content.');
  }

  const slides = parseDocumentBody(body, info.meta);
  if (slides.length === 0) {
    throw new Error(
      'No Beamer frames were found. This importer expects \\begin{frame} … \\end{frame} blocks.',
    );
  }

  const deck: Deck = {
    version: 1,
    meta: info.meta,
    aspect: info.aspect,
    theme: info.theme,
    document: info.document,
    slides,
  };
  const validated = parseDeck(deck);
  if (!validated) throw new Error('The parsed deck could not be validated.');
  return { deck: validated, warnings: [...warnings] };
}
