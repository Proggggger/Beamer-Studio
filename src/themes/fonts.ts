import type { FontId, FontSizePt } from '../model/types';

export interface FontOption {
  id: FontId;
  label: string;
  kind: 'sans' | 'serif';
  /** Where the family usually comes from; used for grouping in the UI. */
  source: 'tex' | 'system' | 'web';
  /** Family name passed to fontspec under XeLaTeX. */
  tex: string;
  /** Stack used for the live preview. */
  css: string;
  monoTex?: string;
  monoCss?: string;
}

export const MONO_STACK =
  '"Latin Modern Mono", "Cascadia Mono", Consolas, "Courier New", monospace';

export const CONSOLAS_STACK = '"Consolas", "Cascadia Mono", "Courier New", monospace';

export const CUSTOM_FONT_ID = 'custom';

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'latin-modern-sans',
    label: 'Latin Modern Sans',
    kind: 'sans',
    source: 'tex',
    tex: 'Latin Modern Sans',
    css: '"Latin Modern Sans", "CMU Sans Serif", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    monoTex: 'Latin Modern Mono',
    monoCss: MONO_STACK,
  },
  {
    id: 'latin-modern-roman',
    label: 'Latin Modern Roman',
    kind: 'serif',
    source: 'tex',
    tex: 'Latin Modern Roman',
    css: '"Latin Modern Roman", "CMU Serif", Cambria, Georgia, "Times New Roman", serif',
    monoTex: 'Latin Modern Mono',
    monoCss: MONO_STACK,
  },
  {
    id: 'tex-gyre-heros',
    label: 'TeX Gyre Heros',
    kind: 'sans',
    source: 'tex',
    tex: 'TeX Gyre Heros',
    css: '"TeX Gyre Heros", "Helvetica Neue", Helvetica, Arial, sans-serif',
    monoTex: 'TeX Gyre Cursor',
    monoCss: '"TeX Gyre Cursor", Consolas, "Courier New", monospace',
  },
  {
    id: 'tex-gyre-pagella',
    label: 'TeX Gyre Pagella',
    kind: 'serif',
    source: 'tex',
    tex: 'TeX Gyre Pagella',
    css: '"TeX Gyre Pagella", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  },
  {
    id: 'tex-gyre-termes',
    label: 'TeX Gyre Termes',
    kind: 'serif',
    source: 'tex',
    tex: 'TeX Gyre Termes',
    css: '"TeX Gyre Termes", "Times New Roman", Times, serif',
  },
  {
    id: 'tex-gyre-bonum',
    label: 'TeX Gyre Bonum',
    kind: 'serif',
    source: 'tex',
    tex: 'TeX Gyre Bonum',
    css: '"TeX Gyre Bonum", "Bookman Old Style", Georgia, serif',
  },
  {
    id: 'tex-gyre-schola',
    label: 'TeX Gyre Schola',
    kind: 'serif',
    source: 'tex',
    tex: 'TeX Gyre Schola',
    css: '"TeX Gyre Schola", "Century Schoolbook", Georgia, serif',
  },
  {
    id: 'tex-gyre-adventor',
    label: 'TeX Gyre Adventor',
    kind: 'sans',
    source: 'tex',
    tex: 'TeX Gyre Adventor',
    css: '"TeX Gyre Adventor", "Century Gothic", "Avant Garde", Arial, sans-serif',
  },
  {
    id: 'libertinus-sans',
    label: 'Libertinus Sans',
    kind: 'sans',
    source: 'tex',
    tex: 'Libertinus Sans',
    css: '"Libertinus Sans", "DejaVu Sans", Arial, sans-serif',
  },
  {
    id: 'libertinus-serif',
    label: 'Libertinus Serif',
    kind: 'serif',
    source: 'tex',
    tex: 'Libertinus Serif',
    css: '"Libertinus Serif", "DejaVu Serif", Georgia, serif',
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    kind: 'serif',
    source: 'tex',
    tex: 'EB Garamond',
    css: '"EB Garamond", Garamond, Georgia, serif',
  },
  {
    id: 'fira-sans',
    label: 'Fira Sans',
    kind: 'sans',
    source: 'tex',
    tex: 'Fira Sans',
    css: '"Fira Sans", "Segoe UI", Arial, sans-serif',
    monoTex: 'Fira Mono',
    monoCss: '"Fira Mono", "Cascadia Mono", Consolas, monospace',
  },
  {
    id: 'source-sans-pro',
    label: 'Source Sans Pro',
    kind: 'sans',
    source: 'tex',
    tex: 'Source Sans Pro',
    css: '"Source Sans Pro", "Segoe UI", Arial, sans-serif',
  },
  {
    id: 'dejavu-sans',
    label: 'DejaVu Sans',
    kind: 'sans',
    source: 'tex',
    tex: 'DejaVu Sans',
    css: '"DejaVu Sans", Verdana, sans-serif',
    monoTex: 'DejaVu Sans Mono',
    monoCss: '"DejaVu Sans Mono", Consolas, monospace',
  },
  {
    id: 'dejavu-serif',
    label: 'DejaVu Serif',
    kind: 'serif',
    source: 'tex',
    tex: 'DejaVu Serif',
    css: '"DejaVu Serif", Georgia, serif',
    monoTex: 'DejaVu Sans Mono',
    monoCss: '"DejaVu Sans Mono", Consolas, monospace',
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    kind: 'sans',
    source: 'tex',
    tex: 'Noto Sans',
    css: '"Noto Sans", "Segoe UI", Arial, sans-serif',
    monoTex: 'Noto Sans Mono',
    monoCss: '"Noto Sans Mono", Consolas, monospace',
  },
  {
    id: 'noto-serif',
    label: 'Noto Serif',
    kind: 'serif',
    source: 'tex',
    tex: 'Noto Serif',
    css: '"Noto Serif", Georgia, "Times New Roman", serif',
  },
  {
    id: 'arial',
    label: 'Arial',
    kind: 'sans',
    source: 'system',
    tex: 'Arial',
    css: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'calibri',
    label: 'Calibri',
    kind: 'sans',
    source: 'system',
    tex: 'Calibri',
    css: 'Calibri, "Segoe UI", Arial, sans-serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'segoe-ui',
    label: 'Segoe UI',
    kind: 'sans',
    source: 'system',
    tex: 'Segoe UI',
    css: '"Segoe UI", Tahoma, Arial, sans-serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'verdana',
    label: 'Verdana',
    kind: 'sans',
    source: 'system',
    tex: 'Verdana',
    css: 'Verdana, Geneva, sans-serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'tahoma',
    label: 'Tahoma',
    kind: 'sans',
    source: 'system',
    tex: 'Tahoma',
    css: 'Tahoma, Verdana, sans-serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'trebuchet-ms',
    label: 'Trebuchet MS',
    kind: 'sans',
    source: 'system',
    tex: 'Trebuchet MS',
    css: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'times-new-roman',
    label: 'Times New Roman',
    kind: 'serif',
    source: 'system',
    tex: 'Times New Roman',
    css: '"Times New Roman", Times, serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'georgia',
    label: 'Georgia',
    kind: 'serif',
    source: 'system',
    tex: 'Georgia',
    css: 'Georgia, "Times New Roman", serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'cambria',
    label: 'Cambria',
    kind: 'serif',
    source: 'system',
    tex: 'Cambria',
    css: 'Cambria, Georgia, "Times New Roman", serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'palatino-linotype',
    label: 'Palatino Linotype',
    kind: 'serif',
    source: 'system',
    tex: 'Palatino Linotype',
    css: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
    monoTex: 'Consolas',
    monoCss: CONSOLAS_STACK,
  },
  {
    id: 'inter',
    label: 'Inter',
    kind: 'sans',
    source: 'web',
    tex: 'Inter',
    css: 'Inter, "Segoe UI", Arial, sans-serif',
  },
  {
    id: 'roboto',
    label: 'Roboto',
    kind: 'sans',
    source: 'web',
    tex: 'Roboto',
    css: 'Roboto, Arial, sans-serif',
  },
  {
    id: 'open-sans',
    label: 'Open Sans',
    kind: 'sans',
    source: 'web',
    tex: 'Open Sans',
    css: '"Open Sans", "Segoe UI", Arial, sans-serif',
  },
  {
    id: 'lato',
    label: 'Lato',
    kind: 'sans',
    source: 'web',
    tex: 'Lato',
    css: 'Lato, "Segoe UI", Arial, sans-serif',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    kind: 'sans',
    source: 'web',
    tex: 'Montserrat',
    css: 'Montserrat, "Segoe UI", Arial, sans-serif',
  },
  {
    id: 'source-serif-pro',
    label: 'Source Serif Pro',
    kind: 'serif',
    source: 'web',
    tex: 'Source Serif Pro',
    css: '"Source Serif Pro", Georgia, serif',
  },
];

export const FONT_IDS: FontId[] = [...FONT_OPTIONS.map((option) => option.id), CUSTOM_FONT_ID];

/** Keeps user-typed family names safe for fontspec braces and CSS strings. */
export function sanitizeFontName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[^\p{L}\p{N} .'+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function fontOption(id: FontId): FontOption {
  return FONT_OPTIONS.find((option) => option.id === id) ?? FONT_OPTIONS[0];
}

export function resolveFont(id: FontId, customFont = ''): FontOption {
  if (id !== CUSTOM_FONT_ID) return fontOption(id);
  const name = sanitizeFontName(customFont);
  if (!name) return FONT_OPTIONS[0];
  return {
    id: CUSTOM_FONT_ID,
    label: name,
    kind: 'sans',
    source: 'system',
    tex: name,
    css: `"${name}", "Segoe UI", Arial, sans-serif`,
    monoTex: 'Latin Modern Mono',
    monoCss: MONO_STACK,
  };
}

export const FONT_SIZES: FontSizePt[] = [8, 9, 10, 11, 12, 14, 17, 20];
