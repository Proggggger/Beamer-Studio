import { COLOR_THEME_NAMES, THEME_SPECS } from '../themes/beamerThemes';
import { wrapInColumns } from './blockOps';
import { DEFAULT_META, DEFAULT_THEME } from './defaults';
import { uid } from './ids';
import type { Block, CustomColors, Deck, Item, Slide, ThemeSettings } from './types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

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
        });
        break;
      case 'columns':
        blocks.push({
          id,
          type: 'columns',
          left: validBlocks(raw.left, depth + 1),
          right: validBlocks(raw.right, depth + 1),
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
        });
        break;
      case 'math':
        blocks.push({ id, type: 'math', tex: str(raw.tex) });
        break;
      case 'code':
        blocks.push({
          id,
          type: 'code',
          lang: str(raw.lang, 'text'),
          text: str(raw.text),
        });
        break;
      case 'toc':
        blocks.push({ id, type: 'toc' });
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
    fontFamily: raw.fontFamily === 'serif' ? 'serif' : 'sans',
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
    slides,
  };
}
