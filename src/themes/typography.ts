import type { BulletShape } from '../model/types';
import type { InnerFamily } from './beamerThemes';

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
