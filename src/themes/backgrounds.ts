import { uid } from '../model/ids';
import type {
  BackgroundImageSettings,
  BackgroundPosition,
  BackgroundSizeMode,
  SlideImageStacks,
  SlideKind,
} from '../model/types';

export const EMPTY_BACKGROUNDS: SlideImageStacks = { all: [], title: [], section: [] };
export const EMPTY_FOREGROUNDS: SlideImageStacks = { all: [], title: [], section: [] };

export const BACKGROUND_POSITIONS: Array<{ id: BackgroundPosition; label: string }> = [
  { id: 'top-left', label: 'Top left' },
  { id: 'top', label: 'Top' },
  { id: 'top-right', label: 'Top right' },
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'bottom-right', label: 'Bottom right' },
];

export const BACKGROUND_MODES: Array<{ id: BackgroundSizeMode; label: string }> = [
  { id: 'scale', label: 'Scale to width' },
  { id: 'fit', label: 'Fit inside page' },
  { id: 'stretch', label: 'Stretch to page' },
];

/** Anchor fractions in screen coordinates: x from the left, y from the top. */
export const BACKGROUND_ANCHOR_FRACTIONS: Record<
  BackgroundPosition,
  { x: number; y: number }
> = {
  center: { x: 0.5, y: 0.5 },
  top: { x: 0.5, y: 0 },
  bottom: { x: 0.5, y: 1 },
  left: { x: 0, y: 0.5 },
  right: { x: 1, y: 0.5 },
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
};

export function newBackground(
  src: string,
  name: string,
  prefix: 'bg' | 'fg' | 'fs' = 'bg',
): BackgroundImageSettings {
  return {
    id: uid(prefix),
    src,
    name,
    opacity: 100,
    mode: 'scale',
    scale: 100,
    position: 'center',
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  };
}

export interface ResolvedImageStack {
  /** Which slot supplied the stack; title/section fall back to 'all'. */
  slot: keyof SlideImageStacks;
  layers: BackgroundImageSettings[];
}

export function backgroundSlotFor(kind: SlideKind): keyof SlideImageStacks {
  if (kind === 'title') return 'title';
  if (kind === 'section') return 'section';
  return 'all';
}

export function resolveSlideLayers(
  stacks: SlideImageStacks,
  kind: SlideKind,
): ResolvedImageStack | null {
  const slot = backgroundSlotFor(kind);
  if (stacks[slot].length > 0) return { slot, layers: stacks[slot] };
  if (slot !== 'all' && stacks.all.length > 0) {
    return { slot: 'all', layers: stacks.all };
  }
  return null;
}

export function backgroundSizeCss(image: BackgroundImageSettings): string {
  if (image.mode === 'stretch') return '100% 100%';
  if (image.mode === 'fit') return 'contain';
  return `${image.scale}% auto`;
}

/**
 * CSS background-position that mirrors the export anchors: the percentage
 * aligns the image to the page anchor, the pixel part is the manual offset.
 */
export function backgroundPlacementCss(
  image: BackgroundImageSettings,
  pageWidth: number,
  pageHeight: number,
): string {
  const anchor = BACKGROUND_ANCHOR_FRACTIONS[image.position];
  const shiftX = (image.offsetX / 100) * pageWidth;
  const shiftY = (image.offsetY / 100) * pageHeight;
  const axis = (percent: number, shift: number) =>
    shift === 0
      ? `${percent}%`
      : `calc(${percent}% ${shift > 0 ? '+' : '-'} ${Math.abs(shift).toFixed(1)}px)`;
  return `${axis(anchor.x * 100, shiftX)} ${axis(anchor.y * 100, shiftY)}`;
}

/** Rotation origin in page pixels, matching the anchored export node. */
export function backgroundRotationOrigin(
  image: BackgroundImageSettings,
  pageWidth: number,
  pageHeight: number,
): string {
  const anchor = BACKGROUND_ANCHOR_FRACTIONS[image.position];
  const x = (anchor.x + image.offsetX / 100) * pageWidth;
  const y = (anchor.y + image.offsetY / 100) * pageHeight;
  return `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}
