/** Named colours shared by xcolor/dvips, so manual TikZ code previews correctly. */
export const XCOLOR_NAMES: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  yellow: '#ffff00',
  gray: '#808080',
  grey: '#808080',
  darkgray: '#404040',
  darkgrey: '#404040',
  lightgray: '#bfbfbf',
  lightgrey: '#bfbfbf',
  brown: '#bf8040',
  lime: '#bfff00',
  olive: '#808000',
  orange: '#ff8000',
  pink: '#ffbfbf',
  purple: '#bf0040',
  teal: '#008080',
  violet: '#800080',
};

export function normalizeHex(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  const short = match[1];
  const full =
    short.length === 3
      ? short
          .split('')
          .map((char) => char + char)
          .join('')
      : short;
  return `#${full.toLowerCase()}`;
}

function channels(hex: string): [number, number, number] {
  const value = normalizeHex(hex) ?? '#000000';
  return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

export function mixHex(first: string, second: string, shareOfFirst: number): string {
  const ratio = Math.max(0, Math.min(100, shareOfFirst)) / 100;
  const a = channels(first);
  const b = channels(second);
  const mixed = a.map((value, index) => Math.round(value * ratio + b[index] * (1 - ratio)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Resolves xcolor expressions such as `red`, `blue!30` (towards white) and
 * `green!40!black`. `defined` holds names declared with `\definecolor`.
 */
export function resolveColorName(
  raw: string,
  defined: Record<string, string> = {},
): string | null {
  const value = raw.trim();
  if (!value) return null;
  const direct = normalizeHex(value);
  if (direct) return direct;
  const key = value.toLowerCase();
  if (defined[key]) return defined[key];
  if (XCOLOR_NAMES[key]) return XCOLOR_NAMES[key];
  if (!value.includes('!')) return null;
  const [first, second, third] = value.split('!');
  const percent = second === undefined ? 100 : Number(second);
  if (Number.isNaN(percent)) return null;
  const base = resolveColorName(first, defined);
  if (!base) return null;
  const partner = third ? resolveColorName(third, defined) ?? '#ffffff' : '#ffffff';
  return mixHex(base, partner, percent);
}
