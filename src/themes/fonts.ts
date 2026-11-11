import type { FontId, FontSizePt } from '../model/types';

export interface FontOption {
  id: FontId;
  label: string;
  kind: 'sans' | 'serif';
  /** Family name passed to fontspec under XeLaTeX. */
  tex: string;
  /** Stack used for the live preview. */
  css: string;
  monoTex?: string;
  monoCss?: string;
}

export const MONO_STACK =
  '"Latin Modern Mono", "Cascadia Mono", Consolas, "Courier New", monospace';

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'latin-modern-sans',
    label: 'Latin Modern Sans',
    kind: 'sans',
    tex: 'Latin Modern Sans',
    css: '"Latin Modern Sans", "CMU Sans Serif", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    monoTex: 'Latin Modern Mono',
    monoCss: MONO_STACK,
  },
  {
    id: 'latin-modern-roman',
    label: 'Latin Modern Roman',
    kind: 'serif',
    tex: 'Latin Modern Roman',
    css: '"Latin Modern Roman", "CMU Serif", Cambria, Georgia, "Times New Roman", serif',
    monoTex: 'Latin Modern Mono',
    monoCss: MONO_STACK,
  },
  {
    id: 'tex-gyre-heros',
    label: 'TeX Gyre Heros',
    kind: 'sans',
    tex: 'TeX Gyre Heros',
    css: '"TeX Gyre Heros", "Helvetica Neue", Helvetica, Arial, sans-serif',
    monoTex: 'TeX Gyre Cursor',
    monoCss: '"TeX Gyre Cursor", Consolas, "Courier New", monospace',
  },
  {
    id: 'tex-gyre-pagella',
    label: 'TeX Gyre Pagella',
    kind: 'serif',
    tex: 'TeX Gyre Pagella',
    css: '"TeX Gyre Pagella", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  },
  {
    id: 'tex-gyre-termes',
    label: 'TeX Gyre Termes',
    kind: 'serif',
    tex: 'TeX Gyre Termes',
    css: '"TeX Gyre Termes", "Times New Roman", Times, serif',
  },
  {
    id: 'tex-gyre-bonum',
    label: 'TeX Gyre Bonum',
    kind: 'serif',
    tex: 'TeX Gyre Bonum',
    css: '"TeX Gyre Bonum", "Bookman Old Style", Georgia, serif',
  },
  {
    id: 'tex-gyre-schola',
    label: 'TeX Gyre Schola',
    kind: 'serif',
    tex: 'TeX Gyre Schola',
    css: '"TeX Gyre Schola", "Century Schoolbook", Georgia, serif',
  },
  {
    id: 'tex-gyre-adventor',
    label: 'TeX Gyre Adventor',
    kind: 'sans',
    tex: 'TeX Gyre Adventor',
    css: '"TeX Gyre Adventor", "Century Gothic", "Avant Garde", Arial, sans-serif',
  },
  {
    id: 'libertinus-sans',
    label: 'Libertinus Sans',
    kind: 'sans',
    tex: 'Libertinus Sans',
    css: '"Libertinus Sans", "DejaVu Sans", Arial, sans-serif',
  },
  {
    id: 'libertinus-serif',
    label: 'Libertinus Serif',
    kind: 'serif',
    tex: 'Libertinus Serif',
    css: '"Libertinus Serif", "DejaVu Serif", Georgia, serif',
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    kind: 'serif',
    tex: 'EB Garamond',
    css: '"EB Garamond", Garamond, Georgia, serif',
  },
  {
    id: 'fira-sans',
    label: 'Fira Sans',
    kind: 'sans',
    tex: 'Fira Sans',
    css: '"Fira Sans", "Segoe UI", Arial, sans-serif',
    monoTex: 'Fira Mono',
    monoCss: '"Fira Mono", "Cascadia Mono", Consolas, monospace',
  },
  {
    id: 'source-sans-pro',
    label: 'Source Sans Pro',
    kind: 'sans',
    tex: 'Source Sans Pro',
    css: '"Source Sans Pro", "Segoe UI", Arial, sans-serif',
  },
  {
    id: 'dejavu-sans',
    label: 'DejaVu Sans',
    kind: 'sans',
    tex: 'DejaVu Sans',
    css: '"DejaVu Sans", Verdana, sans-serif',
    monoTex: 'DejaVu Sans Mono',
    monoCss: '"DejaVu Sans Mono", Consolas, monospace',
  },
  {
    id: 'dejavu-serif',
    label: 'DejaVu Serif',
    kind: 'serif',
    tex: 'DejaVu Serif',
    css: '"DejaVu Serif", Georgia, serif',
    monoTex: 'DejaVu Sans Mono',
    monoCss: '"DejaVu Sans Mono", Consolas, monospace',
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    kind: 'sans',
    tex: 'Noto Sans',
    css: '"Noto Sans", "Segoe UI", Arial, sans-serif',
    monoTex: 'Noto Sans Mono',
    monoCss: '"Noto Sans Mono", Consolas, monospace',
  },
  {
    id: 'noto-serif',
    label: 'Noto Serif',
    kind: 'serif',
    tex: 'Noto Serif',
    css: '"Noto Serif", Georgia, "Times New Roman", serif',
  },
];

export const FONT_IDS = FONT_OPTIONS.map((option) => option.id);

export function fontOption(id: FontId): FontOption {
  return FONT_OPTIONS.find((option) => option.id === id) ?? FONT_OPTIONS[0];
}

export function fontStack(id: FontId): string {
  return fontOption(id).css;
}

export function monoStack(id: FontId): string {
  return fontOption(id).monoCss ?? MONO_STACK;
}

export const FONT_SIZES: FontSizePt[] = [8, 9, 10, 11, 12, 14, 17, 20];
