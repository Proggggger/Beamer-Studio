export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const TRANSPARENT = 'transparent';

export function hexToRgb(hex: string): Rgb {
  let value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function isHexColor(value: string | undefined): value is string {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/** xcolor's `a!pct!b`: pct percent of `a`, the rest of `b`. */
export function mix(a: string, b: string, pct: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const t = Math.max(0, Math.min(100, pct)) / 100;
  return rgbToHex({
    r: ca.r * t + cb.r * (1 - t),
    g: ca.g * t + cb.g * (1 - t),
    b: ca.b * t + cb.b * (1 - t),
  });
}

/** `color!pct` in xcolor: mix with white. */
export function tint(color: string, pct: number): string {
  return mix(color, '#ffffff', pct);
}

/** Darken toward black by `pct` percent of the original color. */
export function shade(color: string, pct: number): string {
  return mix(color, '#000000', pct);
}

export function luminance(color: string): number {
  const { r, g, b } = hexToRgb(color);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function readableOn(background: string): string {
  if (!isHexColor(background)) return '#111111';
  return luminance(background) > 0.45 ? '#111111' : '#ffffff';
}

export function withAlpha(color: string, alpha: number): string {
  if (!isHexColor(color)) return color;
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
