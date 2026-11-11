import { describe, expect, it } from 'vitest';
import type { BackgroundImageSettings } from '../model/types';
import {
  backgroundPositionCss,
  backgroundSizeCss,
  backgroundSlotFor,
  EMPTY_BACKGROUNDS,
  newBackground,
  resolveSlideBackground,
} from './backgrounds';

const image: BackgroundImageSettings = {
  src: 'data:image/png;base64,AAAA',
  name: 'background.png',
  opacity: 100,
  mode: 'scale',
  scale: 100,
  position: 'center',
};

describe('resolveSlideBackground', () => {
  it('returns null when nothing is configured', () => {
    expect(resolveSlideBackground(EMPTY_BACKGROUNDS, 'frame')).toBeNull();
    expect(resolveSlideBackground(EMPTY_BACKGROUNDS, 'title')).toBeNull();
  });

  it('applies the shared image to every slide kind', () => {
    const backgrounds = { ...EMPTY_BACKGROUNDS, all: image };
    expect(resolveSlideBackground(backgrounds, 'frame')?.slot).toBe('all');
    expect(resolveSlideBackground(backgrounds, 'title')?.slot).toBe('all');
    expect(resolveSlideBackground(backgrounds, 'section')?.slot).toBe('all');
  });

  it('prefers dedicated title and section images', () => {
    const title = { ...image, name: 'title.png' };
    const section = { ...image, name: 'section.png' };
    const backgrounds = { ...EMPTY_BACKGROUNDS, all: image, title, section };
    expect(resolveSlideBackground(backgrounds, 'title')).toEqual({ slot: 'title', image: title });
    expect(resolveSlideBackground(backgrounds, 'section')).toEqual({
      slot: 'section',
      image: section,
    });
    expect(resolveSlideBackground(backgrounds, 'frame')?.slot).toBe('all');
  });

  it('keeps a dedicated image when no shared one exists', () => {
    const backgrounds = { ...EMPTY_BACKGROUNDS, title: image };
    expect(resolveSlideBackground(backgrounds, 'title')?.slot).toBe('title');
    expect(resolveSlideBackground(backgrounds, 'frame')).toBeNull();
  });
});

describe('background CSS mapping', () => {
  it('maps anchors to CSS positions', () => {
    expect(backgroundPositionCss('center')).toBe('center center');
    expect(backgroundPositionCss('top-left')).toBe('left top');
    expect(backgroundPositionCss('bottom-right')).toBe('right bottom');
  });

  it('maps size modes', () => {
    expect(backgroundSizeCss({ ...image, mode: 'stretch' })).toBe('100% 100%');
    expect(backgroundSizeCss({ ...image, mode: 'fit' })).toBe('contain');
    expect(backgroundSizeCss({ ...image, mode: 'scale', scale: 65 })).toBe('65% auto');
  });
});

describe('background helpers', () => {
  it('builds a default settings object', () => {
    expect(newBackground('data:image/png;base64,AAAA', 'photo.png')).toEqual({
      src: 'data:image/png;base64,AAAA',
      name: 'photo.png',
      opacity: 100,
      mode: 'scale',
      scale: 100,
      position: 'center',
    });
  });

  it('routes slide kinds to slots', () => {
    expect(backgroundSlotFor('title')).toBe('title');
    expect(backgroundSlotFor('section')).toBe('section');
    expect(backgroundSlotFor('frame')).toBe('all');
  });
});
