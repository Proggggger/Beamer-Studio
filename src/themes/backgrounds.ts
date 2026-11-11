import type {
  BackgroundImageSettings,
  BackgroundPosition,
  BackgroundSizeMode,
  SlideBackgrounds,
  SlideKind,
} from '../model/types';

export const EMPTY_BACKGROUNDS: SlideBackgrounds = { all: null, title: null, section: null };

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

export function newBackground(src: string, name: string): BackgroundImageSettings {
  return { src, name, opacity: 100, mode: 'scale', scale: 100, position: 'center' };
}

export interface SlideBackground {
  /** Which slot supplied the image; title/section fall back to 'all'. */
  slot: keyof SlideBackgrounds;
  image: BackgroundImageSettings;
}

export function backgroundSlotFor(kind: SlideKind): keyof SlideBackgrounds {
  if (kind === 'title') return 'title';
  if (kind === 'section') return 'section';
  return 'all';
}

export function resolveSlideBackground(
  backgrounds: SlideBackgrounds,
  kind: SlideKind,
): SlideBackground | null {
  const slot = backgroundSlotFor(kind);
  const own = backgrounds[slot];
  if (own) return { slot, image: own };
  if (slot !== 'all' && backgrounds.all) return { slot: 'all', image: backgrounds.all };
  return null;
}

const CSS_POSITIONS: Record<BackgroundPosition, string> = {
  center: 'center center',
  top: 'center top',
  bottom: 'center bottom',
  left: 'left center',
  right: 'right center',
  'top-left': 'left top',
  'top-right': 'right top',
  'bottom-left': 'left bottom',
  'bottom-right': 'right bottom',
};

export function backgroundPositionCss(position: BackgroundPosition): string {
  return CSS_POSITIONS[position];
}

export function backgroundSizeCss(image: BackgroundImageSettings): string {
  if (image.mode === 'stretch') return '100% 100%';
  if (image.mode === 'fit') return 'contain';
  return `${image.scale}% auto`;
}
