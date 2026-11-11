import { describe, expect, it } from 'vitest';
import {
  hexToRgb,
  isHexColor,
  luminance,
  mix,
  readableOn,
  rgbToHex,
  shade,
  tint,
  TRANSPARENT,
  withAlpha,
} from './colorMath';

describe('hexToRgb', () => {
  it('parses six and three digit hex with or without the hash', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('falls back to black for invalid input', () => {
    expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#12345')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('round-trips a color and clamps out-of-range channels', () => {
    expect(rgbToHex({ r: 18, g: 52, b: 86 })).toBe('#123456');
    expect(rgbToHex({ r: 300, g: -4, b: 127.6 })).toBe('#ff0080');
  });
});

describe('mix', () => {
  it('follows xcolor A!pct!B semantics', () => {
    expect(mix('#ffffff', '#000000', 100)).toBe('#ffffff');
    expect(mix('#ffffff', '#000000', 0)).toBe('#000000');
    expect(mix('#ff0000', '#0000ff', 50)).toBe('#800080');
  });

  it('clamps percentages outside 0-100', () => {
    expect(mix('#ffffff', '#000000', 150)).toBe('#ffffff');
    expect(mix('#ffffff', '#000000', -20)).toBe('#000000');
  });
});

describe('tint and shade', () => {
  it('tint blends toward white and shade toward black', () => {
    expect(tint('#000000', 50)).toBe('#808080');
    expect(shade('#ffffff', 50)).toBe('#808080');
    expect(shade('#ff0000', 100)).toBe('#ff0000');
  });
});

describe('luminance and readableOn', () => {
  it('computes relative luminance extremes', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('picks black text on light backgrounds and white on dark ones', () => {
    expect(readableOn('#ffffff')).toBe('#111111');
    expect(readableOn('#000000')).toBe('#ffffff');
    expect(readableOn(TRANSPARENT)).toBe('#111111');
  });
});

describe('isHexColor and withAlpha', () => {
  it('accepts 3/6 digit hex only', () => {
    expect(isHexColor('#abc')).toBe(true);
    expect(isHexColor('#aabbcc')).toBe(true);
    expect(isHexColor('aabbcc')).toBe(false);
    expect(isHexColor('#abcd')).toBe(false);
  });

  it('converts hex to rgba and passes non-hex through', () => {
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    expect(withAlpha(TRANSPARENT, 0.5)).toBe(TRANSPARENT);
  });
});
