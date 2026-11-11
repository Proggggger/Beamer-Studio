import type { BulletShape } from '../model/types';
import type { InnerFamily } from './beamerThemes';

export const SANS_STACK =
  '"Latin Modern Sans", "CMU Sans Serif", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
export const SERIF_STACK =
  '"Latin Modern Roman", "CMU Serif", Cambria, Georgia, "Times New Roman", serif';
export const MONO_STACK = '"Latin Modern Mono", "Cascadia Mono", Consolas, "Courier New", monospace';

export function themeBullet(inner: InnerFamily): BulletShape {
  switch (inner) {
    case 'rounded':
      return 'ball';
    case 'circles':
      return 'circle';
    case 'rectangles':
    case 'inmargin':
      return 'square';
    default:
      return 'triangle';
  }
}

export function themeBlockRounded(inner: InnerFamily): boolean {
  return inner === 'rounded';
}
