import { COLOR_THEME_NAMES, THEME_SPECS } from '../themes/beamerThemes';
import { BACKGROUND_POSITIONS } from '../themes/backgrounds';
import { CUSTOM_FONT_ID, FONT_IDS, FONT_SIZES, sanitizeFontName } from '../themes/fonts';
import { LANGUAGE_IDS } from '../themes/languages';
import { wrapInColumns } from './blockOps';
import { validCodeLang } from './code';
import { DEFAULT_DOCUMENT, DEFAULT_META, DEFAULT_THEME } from './defaults';
import { uid } from './ids';
import {
  isTableAlign,
  normalizeTableRows,
  TABLE_MAX_CELL,
  TABLE_MAX_COLUMNS,
  TABLE_MAX_ROWS,
} from './table';
import type {
  BackgroundImageSettings,
  Block,
  BlockColorOverrides,
  CustomColors,
  Deck,
  DocumentSettings,
  FontChoice,
  FontId,
  Item,
  LanguageId,
  Slide,
  SlideImageStacks,
  TableAlign,
  ThemeSettings,
  TikzDrawing,
  TikzPoint,
  TikzShape,
  TikzShapeKind,
} from './types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

function normalizeHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return undefined;
  const short = match[1].toLowerCase();
  const full =
    short.length === 3
      ? short
          .split('')
          .map((char) => char + char)
          .join('')
      : short;
  return `#${full}`;
}

function validBlockColors(value: unknown): BlockColorOverrides | undefined {
  if (!isObject(value)) return undefined;
  const colors: BlockColorOverrides = {};
  for (const key of ['titleBg', 'titleFg', 'bodyBg', 'bodyFg'] as const) {
    const color = normalizeHex(value[key]);
    if (color) colors[key] = color;
  }
  return Object.keys(colors).length > 0 ? colors : undefined;
}

function validItem(value: unknown): Item | null {
  if (!isObject(value)) return null;
  const depth = value.depth === 1 || value.depth === 2 ? value.depth : 0;
  return {
    id: str(value.id) || uid('item'),
    text: str(value.text),
    depth,
    pause: value.pause === true,
  };
}

const TIKZ_KINDS: TikzShapeKind[] = ['line', 'arrow', 'rect', 'ellipse', 'text', 'path'];

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function coord(value: unknown, fallback: number): number {
  return Math.round(Math.max(-1000, Math.min(1000, finite(value, fallback))) * 100) / 100;
}

function validTikzPoint(value: unknown): TikzPoint | null {
  if (!isObject(value)) return null;
  return { x: coord(value.x, 0), y: coord(value.y, 0) };
}

function validTikzShape(value: unknown): TikzShape | null {
  if (!isObject(value)) return null;
  const kind = TIKZ_KINDS.find((entry) => entry === value.kind);
  if (!kind) return null;
  const shape: TikzShape = {
    id: str(value.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || uid('shape'),
    kind,
    x: coord(value.x, 0),
    y: coord(value.y, 0),
  };
  if (kind === 'line' || kind === 'arrow' || kind === 'rect' || kind === 'ellipse') {
    shape.x2 = coord(value.x2, shape.x);
    shape.y2 = coord(value.y2, shape.y);
  }
  if (kind === 'path') {
    const points = Array.isArray(value.points)
      ? value.points
          .slice(0, 2000)
          .map(validTikzPoint)
          .filter((point): point is TikzPoint => point !== null)
      : [];
    if (points.length < 2) return null;
    shape.points = points;
    shape.closed = value.closed === true;
    shape.arrow = value.arrow === true;
  }
  if (kind === 'text') {
    shape.text = str(value.text)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .slice(0, 500);
    shape.fontSize = Math.max(1, Math.min(40, finite(value.fontSize, 4)));
  }
  const canLabel = kind === 'rect' || kind === 'ellipse' || (kind === 'path' && shape.closed);
  if (canLabel) {
    const label = str(value.text)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .slice(0, 500);
    if (label) {
      shape.text = label;
      shape.fontSize = Math.max(1, Math.min(40, finite(value.fontSize, 4)));
      const textColor = normalizeHex(value.textColor);
      if (textColor) shape.textColor = textColor;
    }
  }
  if (kind === 'rect' && typeof value.cornerRadius === 'number' && Number.isFinite(value.cornerRadius)) {
    const radius = Math.round(Math.max(0, Math.min(20, value.cornerRadius)) * 2) / 2;
    if (radius > 0) shape.cornerRadius = radius;
  }
  for (const key of ['strokeOpacity', 'fillOpacity', 'textOpacity'] as const) {
    const opacity = value[key];
    if (typeof opacity === 'number' && Number.isFinite(opacity)) {
      const clamped = Math.round(Math.max(0, Math.min(100, opacity)));
      if (clamped < 100) shape[key] = clamped;
    }
  }
  if (typeof value.rotation === 'number' && Number.isFinite(value.rotation) && value.rotation !== 0) {
    shape.rotation = Math.round(Math.max(-180, Math.min(180, value.rotation)));
  }
  if (typeof value.stroke === 'string') {
    const stroke = value.stroke === 'none' ? 'none' : normalizeHex(value.stroke);
    if (stroke) shape.stroke = stroke;
  }
  const fill = normalizeHex(typeof value.fill === 'string' ? value.fill : undefined);
  if (fill) shape.fill = fill;
  if (typeof value.strokeWidth === 'number' && Number.isFinite(value.strokeWidth)) {
    shape.strokeWidth = Math.round(Math.max(0, Math.min(5, value.strokeWidth)) * 20) / 20;
  }
  if (value.dashed === true) shape.dashed = true;
  return shape;
}

function validTikzDrawing(value: unknown): TikzDrawing {
  const raw = isObject(value) ? value : {};
  const width = Math.round(Math.max(10, Math.min(400, finite(raw.width, 80))));
  const height = Math.round(Math.max(10, Math.min(400, finite(raw.height, 50))));
  const shapes = Array.isArray(raw.shapes)
    ? raw.shapes
        .slice(0, 500)
        .map(validTikzShape)
        .filter((shape): shape is TikzShape => shape !== null)
    : [];
  const code =
    typeof raw.code === 'string' ? raw.code.replace(/\u0000/g, '').slice(0, 20000) : '';
  return { width, height, shapes, code: code.trim() ? code : undefined };
}

function validTableData(
  rawRows: unknown,
  rawAlign: unknown,
): { rows: string[][]; align: TableAlign[] } {
  const align: TableAlign[] = Array.isArray(rawAlign)
    ? rawAlign.slice(0, TABLE_MAX_COLUMNS).map((entry) => (isTableAlign(entry) ? entry : 'left'))
    : [];
  const matrix: string[][] = Array.isArray(rawRows)
    ? rawRows
        .slice(0, TABLE_MAX_ROWS)
        .filter((row): row is unknown[] => Array.isArray(row))
        .map((row) =>
          row
            .slice(0, TABLE_MAX_COLUMNS)
            .map((cell) =>
              str(cell)
                .replace(/\s*[\r\n]+\s*/g, ' ')
                .slice(0, TABLE_MAX_CELL),
            ),
        )
    : [];
  const columns = Math.max(1, align.length, ...matrix.map((row) => row.length));
  const rows = normalizeTableRows(matrix.length > 0 ? matrix : [[]], columns);
  const nextAlign = Array.from({ length: columns }, (_, index) => align[index] ?? 'left');
  return { rows, align: nextAlign };
}

function validBlocks(value: unknown, depth = 0): Block[] {
  if (!Array.isArray(value) || depth > 3) return [];
  const blocks: Block[] = [];
  for (const raw of value) {
    if (!isObject(raw)) continue;
    const id = str(raw.id) || uid('block');
    switch (raw.type) {
      case 'paragraph':
        blocks.push({
          id,
          type: 'paragraph',
          text: str(raw.text),
          align: raw.align === 'center' || raw.align === 'right' ? raw.align : 'left',
          indent:
            typeof raw.indent === 'number' && Number.isFinite(raw.indent) && raw.indent > 0
              ? Math.min(8, raw.indent)
              : undefined,
          font: validFontChoice(raw.font),
        });
        break;
      case 'list':
        blocks.push({
          id,
          type: 'list',
          ordered: raw.ordered === true,
          items: Array.isArray(raw.items)
            ? raw.items.map(validItem).filter((item): item is Item => item !== null)
            : [],
          font: validFontChoice(raw.font),
        });
        break;
      case 'block':
        blocks.push({
          id,
          type: 'block',
          tone:
            raw.tone === 'alert' || raw.tone === 'example'
              ? raw.tone
              : 'normal',
          title: str(raw.title),
          body: validBlocks(raw.body, depth + 1),
          colors: validBlockColors(raw.colors),
          font: validFontChoice(raw.font),
        });
        break;
      case 'columns':
        blocks.push({
          id,
          type: 'columns',
          left: validBlocks(raw.left, depth + 1),
          right: validBlocks(raw.right, depth + 1),
          font: validFontChoice(raw.font),
        });
        break;
      case 'image':
        blocks.push({
          id,
          type: 'image',
          src: str(raw.src),
          name: str(raw.name, 'image.png'),
          widthPct: typeof raw.widthPct === 'number' ? Math.max(10, Math.min(100, raw.widthPct)) : 60,
          caption: str(raw.caption),
          font: validFontChoice(raw.font),
        });
        break;
      case 'math':
        blocks.push({ id, type: 'math', tex: str(raw.tex), font: validFontChoice(raw.font) });
        break;
      case 'code':
        blocks.push({
          id,
          type: 'code',
          lang: validCodeLang(raw.lang),
          text: str(raw.text),
          caption: str(raw.caption),
          lineNumbers: raw.lineNumbers === true,
          font: validFontChoice(raw.font),
        });
        break;
      case 'table': {
        const table = validTableData(raw.rows, raw.align);
        blocks.push({
          id,
          type: 'table',
          rows: table.rows,
          align: table.align,
          header: raw.header !== false,
          bordered: raw.bordered === true,
          caption: str(raw.caption),
          font: validFontChoice(raw.font),
        });
        break;
      }
      case 'toc':
        blocks.push({ id, type: 'toc', font: validFontChoice(raw.font) });
        break;
      case 'tikz':
        blocks.push({
          id,
          type: 'tikz',
          name: str(raw.name, 'TikZ drawing').slice(0, 120),
          widthPct:
            typeof raw.widthPct === 'number' ? Math.max(10, Math.min(100, raw.widthPct)) : 70,
          caption: str(raw.caption),
          drawing: validTikzDrawing(raw.drawing),
          font: validFontChoice(raw.font),
        });
        break;
      default:
        break;
    }
  }
  return blocks;
}

function validSlides(value: unknown): Slide[] {
  if (!Array.isArray(value)) return [];
  const slides: Slide[] = [];
  for (const raw of value) {
    if (!isObject(raw)) continue;
    const kind = raw.kind === 'title' || raw.kind === 'section' ? raw.kind : 'frame';
    const layout = raw.layout === 'two-column' ? 'two-column' : 'normal';
    const body = kind === 'frame' ? validBlocks(raw.body) : [];
    slides.push({
      id: str(raw.id) || uid('slide'),
      kind,
      title: str(raw.title),
      subtitle: str(raw.subtitle),
      layout,
      // Older decks stored two-column layouts as a flat body split in half.
      body: kind === 'frame' && layout === 'two-column' ? wrapInColumns(body) : body,
      images: validBackgroundList(raw.images, 'slide', 'fs', 'slide image'),
      font: validFontChoice(raw.font),
    });
  }
  return slides;
}

function validCustom(value: unknown): CustomColors {
  if (!isObject(value)) return { enabled: false };
  const custom: CustomColors = { enabled: value.enabled === true };
  for (const key of ['structure', 'primaryBar', 'background', 'foreground', 'alert'] as const) {
    const candidate = value[key];
    if (typeof candidate === 'string' && /^#[0-9a-fA-F]{6}$/.test(candidate)) {
      custom[key] = candidate;
    }
  }
  return custom;
}

function validBackground(
  value: unknown,
  fallbackId: string,
  fallbackName: string,
): BackgroundImageSettings | null {
  if (!isObject(value)) return null;
  const kind = value.kind === 'tikz' ? 'tikz' : 'image';
  const src = str(value.src);
  if (kind === 'image' && !/^data:image\/[a-z0-9.+-]+;base64,/i.test(src)) return null;
  const name = str(value.name, fallbackName)
    .replace(/[\u0000-\u001f\\{}]/g, '')
    .trim()
    .slice(0, 120);
  const id = str(value.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || fallbackId;
  const opacity =
    typeof value.opacity === 'number' && Number.isFinite(value.opacity)
      ? Math.round(Math.max(0, Math.min(100, value.opacity)))
      : 100;
  const scale =
    typeof value.scale === 'number' && Number.isFinite(value.scale)
      ? Math.round(Math.max(5, Math.min(200, value.scale)))
      : 100;
  const offset =
    typeof value.offsetX === 'number' && Number.isFinite(value.offsetX)
      ? Math.round(Math.max(-50, Math.min(50, value.offsetX)))
      : 0;
  const vertical =
    typeof value.offsetY === 'number' && Number.isFinite(value.offsetY)
      ? Math.round(Math.max(-50, Math.min(50, value.offsetY)))
      : 0;
  const rotation =
    typeof value.rotation === 'number' && Number.isFinite(value.rotation)
      ? Math.round(Math.max(-180, Math.min(180, value.rotation)))
      : 0;
  const mode =
    value.mode === 'fit' || value.mode === 'stretch' || value.mode === 'scale'
      ? value.mode
      : 'scale';
  const position = BACKGROUND_POSITIONS.some((entry) => entry.id === value.position)
    ? (value.position as BackgroundImageSettings['position'])
    : 'center';
  return {
    id,
    ...(kind === 'tikz'
      ? { kind: 'tikz' as const, src: '', drawing: validTikzDrawing(value.drawing) }
      : { src }),
    name: name || fallbackName,
    opacity,
    mode,
    scale,
    position,
    offsetX: offset,
    offsetY: vertical,
    rotation,
  };
}

/** Accepts the legacy single-image slot as well as the current layer list. */
function validBackgroundList(
  value: unknown,
  slot: string,
  prefix: string,
  fallbackName: string,
): BackgroundImageSettings[] {
  const entries = Array.isArray(value) ? value : isObject(value) ? [value] : [];
  const layers: BackgroundImageSettings[] = [];
  const used = new Set<string>();
  entries.forEach((entry, index) => {
    const layer = validBackground(entry, `${prefix}-${slot}-${index}`, fallbackName);
    if (!layer) return;
    let id = layer.id;
    let suffix = 2;
    while (used.has(id)) id = `${layer.id}-${suffix++}`;
    used.add(id);
    layers.push({ ...layer, id });
  });
  return layers;
}

function validImageStacks(
  value: unknown,
  prefix: 'bg' | 'fg',
  fallbackName: string,
): SlideImageStacks {
  const raw = isObject(value) ? value : {};
  return {
    all: validBackgroundList(raw.all, 'all', prefix, fallbackName),
    title: validBackgroundList(raw.title, 'title', prefix, fallbackName),
    section: validBackgroundList(raw.section, 'section', prefix, fallbackName),
  };
}

/** Decks saved before XeLaTeX support stored the family as 'sans' | 'serif'. */
const LEGACY_FONTS: Record<string, FontId> = {
  sans: 'latin-modern-sans',
  serif: 'latin-modern-roman',
};

function knownFontId(value: unknown): FontId | null {
  if (typeof value !== 'string') return null;
  if ((FONT_IDS as string[]).includes(value)) return value as FontId;
  return LEGACY_FONTS[value] ?? null;
}

function validFontId(value: unknown): FontId {
  return knownFontId(value) ?? DEFAULT_THEME.fontFamily;
}

/** Slide/block font overrides are optional, so unknown ids inherit instead. */
function validFontChoice(value: unknown): FontChoice | undefined {
  if (!isObject(value)) return undefined;
  const family = knownFontId(value.family);
  if (!family) return undefined;
  if (family === CUSTOM_FONT_ID) {
    const custom = sanitizeFontName(value.custom);
    return custom ? { family, custom } : undefined;
  }
  return { family };
}

function validDocument(value: unknown): DocumentSettings {
  const raw = isObject(value) ? value : {};
  const known = (id: string): id is LanguageId => (LANGUAGE_IDS as string[]).includes(id);
  const mainLanguage =
    typeof raw.mainLanguage === 'string' && known(raw.mainLanguage)
      ? raw.mainLanguage
      : DEFAULT_DOCUMENT.mainLanguage;
  const otherLanguages: LanguageId[] = [];
  if (Array.isArray(raw.otherLanguages)) {
    for (const entry of raw.otherLanguages) {
      if (typeof entry !== 'string' || !known(entry)) continue;
      if (entry === mainLanguage || otherLanguages.includes(entry)) continue;
      otherLanguages.push(entry);
    }
  }
  const fontSize = (FONT_SIZES as number[]).includes(raw.fontSize as number)
    ? (raw.fontSize as DocumentSettings['fontSize'])
    : DEFAULT_DOCUMENT.fontSize;
  const scriptFont =
    raw.scriptFont === 'auto' ||
    (typeof raw.scriptFont === 'string' &&
      raw.scriptFont !== CUSTOM_FONT_ID &&
      (FONT_IDS as string[]).includes(raw.scriptFont))
      ? (raw.scriptFont as DocumentSettings['scriptFont'])
      : DEFAULT_DOCUMENT.scriptFont;
  return { mainLanguage, otherLanguages, fontSize, scriptFont };
}

function validTheme(value: unknown): ThemeSettings {
  const raw = isObject(value) ? value : {};
  const template =
    typeof raw.template === 'string' && raw.template in THEME_SPECS
      ? (raw.template as ThemeSettings['template'])
      : DEFAULT_THEME.template;
  const colorTheme =
    typeof raw.colorTheme === 'string' && (COLOR_THEME_NAMES as string[]).includes(raw.colorTheme)
      ? (raw.colorTheme as ThemeSettings['colorTheme'])
      : DEFAULT_THEME.colorTheme;
  return {
    template,
    colorTheme,
    custom: validCustom(raw.custom),
    fontFamily: validFontId(raw.fontFamily),
    customFont: sanitizeFontName(raw.customFont),
    backgrounds: validImageStacks(raw.backgrounds, 'bg', 'background'),
    foregrounds: validImageStacks(raw.foregrounds, 'fg', 'foreground'),
    fontScale:
      typeof raw.fontScale === 'number' && Number.isFinite(raw.fontScale)
        ? Math.max(0.8, Math.min(1.3, raw.fontScale))
        : 1,
    bulletShape:
      raw.bulletShape === 'ball' ||
      raw.bulletShape === 'triangle' ||
      raw.bulletShape === 'circle' ||
      raw.bulletShape === 'square'
        ? raw.bulletShape
        : 'theme',
    blockShape:
      raw.blockShape === 'rectangle' || raw.blockShape === 'rounded' ? raw.blockShape : 'theme',
    blockShadow: raw.blockShadow !== false,
    navigationSymbols: raw.navigationSymbols !== false,
  };
}

export function parseDeck(value: unknown): Deck | null {
  if (!isObject(value) || value.version !== 1) return null;
  const metaRaw = isObject(value.meta) ? value.meta : {};
  const slides = validSlides(value.slides);
  if (slides.length === 0) return null;
  return {
    version: 1,
    meta: {
      title: str(metaRaw.title, DEFAULT_META.title),
      subtitle: str(metaRaw.subtitle, DEFAULT_META.subtitle),
      author: str(metaRaw.author, DEFAULT_META.author),
      institute: str(metaRaw.institute, DEFAULT_META.institute),
      date: str(metaRaw.date, DEFAULT_META.date),
    },
    aspect: value.aspect === '43' ? '43' : '169',
    theme: validTheme(value.theme),
    document: validDocument(value.document),
    slides,
  };
}
