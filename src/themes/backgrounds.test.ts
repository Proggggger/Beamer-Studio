import { describe, expect, it } from 'vitest';
import type { BackgroundImageSettings } from '../model/types';
import {
  backgroundPlacementCss,
  backgroundSizeCss,
  backgroundSlotFor,
  EMPTY_BACKGROUNDS,
  newBackground,
  resolveSlideBackground,
} from './backgrounds';

const image: BackgroundImageSettings = {
  id: 'bg-1',
  src: 'data:image/png;base64,AAAA',
  name: 'background.png',
  opacity: 100,
  mode: 'scale',
  scale: 100,
  position: 'center',
  offsetX: 0,
  offsetY: 0,
};

describe('resolveSlideBackground', () => {
  it('returns null when nothing is configured', () => {
    expect(resolveSlideBackground(EMPTY_BACKGROUNDS, 'frame')).toBeNull();
    expect(resolveSlideBackground(EMPTY_BACKGROUNDS, 'title')).toBeNull();
  });

  it('applies the shared stack to every slide kind', () => {
    const backgrounds = { ...EMPTY_BACKGROUNDS, all: [image] };
    expect(resolveSlideBackground(backgrounds, 'frame')?.slot).toBe('all');
    expect(resolveSlideBackground(backgrounds, 'title')?.slot).toBe('all');
    expect(resolveSlideBackground(backgrounds, 'section')?.slot).toBe('all');
    expect(resolveSlideBackground(backgrounds, 'frame')?.layers).toEqual([image]);
  });

  it('prefers dedicated title and section stacks', () => {
    const title = { ...image, id: 't1', name: 'title.png' };
    const section = { ...image, id: 's1', name: 'section.png' };
    const backgrounds = { ...EMPTY_BACKGROUNDS, all: [image], title: [title], section: [section] };
    expect(resolveSlideBackground(backgrounds, 'title')).toEqual({
      slot: 'title',
      layers: [title],
    });
    expect(resolveSlideBackground(backgrounds, 'section')).toEqual({
      slot: 'section',
      layers: [section],
    });
    expect(resolveSlideBackground(backgrounds, 'frame')?.slot).toBe('all');
  });

  it('keeps dedicated stacks when no shared one exists', () => {
    const backgrounds = { ...EMPTY_BACKGROUNDS, title: [image] };
    expect(resolveSlideBackground(backgrounds, 'title')?.slot).toBe('title');
    expect(resolveSlideBackground(backgrounds, 'frame')).toBeNull();
  });

  it('keeps the whole stack in order', () => {
    const logo = { ...image, id: 'bg-2', name: 'logo.png', scale: 20 };
    const backgrounds = { ...EMPTY_BACKGROUNDS, all: [image, logo] };
    expect(resolveSlideBackground(backgrounds, 'frame')?.layers.map((layer) => layer.id)).toEqual([
      'bg-1',
      'bg-2',
    ]);
  });
});

describe('background CSS mapping', () => {
  it('maps anchors to CSS positions without offsets', () => {
    expect(backgroundPlacementCss(image, 960, 540)).toBe('50% 50%');
    expect(backgroundPlacementCss({ ...image, position: 'top-left' }, 960, 540)).toBe('0% 0%');
    expect(backgroundPlacementCss({ ...image, position: 'bottom-right' }, 960, 540)).toBe(
      '100% 100%',
    );
  });

  it('converts page-percent offsets to pixels from the anchor', () => {
    const placed: BackgroundImageSettings = {
      ...image,
      position: 'top-right',
      offsetX: 10,
      offsetY: -5,
    };
    expect(backgroundPlacementCss(placed, 960, 540)).toBe(
      'calc(100% + 96.0px) calc(0% - 27.0px)',
    );
  });

  it('maps size modes', () => {
    expect(backgroundSizeCss({ ...image, mode: 'stretch' })).toBe('100% 100%');
    expect(backgroundSizeCss({ ...image, mode: 'fit' })).toBe('contain');
    expect(backgroundSizeCss({ ...image, mode: 'scale', scale: 65 })).toBe('65% auto');
  });
});

describe('background helpers', () => {
  it('builds a default settings object', () => {
    expect(newBackground('data:image/png;base64,AAAA', 'photo.png')).toMatchObject({
      src: 'data:image/png;base64,AAAA',
      name: 'photo.png',
      opacity: 100,
      mode: 'scale',
      scale: 100,
      position: 'center',
      offsetX: 0,
      offsetY: 0,
    });
    expect(newBackground('data:image/png;base64,AAAA', 'photo.png').id).toMatch(/^bg_/);
  });

  it('routes slide kinds to slots', () => {
    expect(backgroundSlotFor('title')).toBe('title');
    expect(backgroundSlotFor('section')).toBe('section');
    expect(backgroundSlotFor('frame')).toBe('all');
  });
});
