import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '../model/defaults';
import type { ThemeSettings } from '../model/types';
import { COLOR_THEME_NAMES, THEME_NAMES, themeSpec } from './beamerThemes';
import { resolveTheme } from './resolve';

function settings(patch: Partial<ThemeSettings> = {}): ThemeSettings {
  return {
    ...DEFAULT_THEME,
    custom: { ...DEFAULT_THEME.custom },
    ...patch,
  };
}

describe('resolveTheme', () => {
  it('uses the 16:9 page by default and 4:3 when requested', () => {
    expect(resolveTheme(settings(), '169').page).toEqual({ w: 960, h: 540 });
    expect(resolveTheme(settings(), '43').page).toEqual({ w: 800, h: 600 });
  });

  it('derives layout metrics from the page size', () => {
    const resolved = resolveTheme(settings(), '169');
    expect(resolved.layout.margin).toBeCloseTo(48, 5);
    expect(resolved.layout.titleH).toBeCloseTo(540 * 0.1125, 5);
    expect(resolved.layout.headH).toBeCloseTo(540 * 0.06, 5);
    expect(resolved.layout.footH).toBeCloseTo(540 * 0.06, 5);
    expect(resolved.cssVars['--page-w']).toBe('960px');
    expect(resolved.cssVars['--page-h']).toBe('540px');
  });

  it('scales the base font with fontScale and swaps families', () => {
    const normal = resolveTheme(settings({ fontScale: 1 }), '169');
    const large = resolveTheme(settings({ fontScale: 1.25 }), '169');
    expect(large.font.base).toBeCloseTo(normal.font.base * 1.25, 5);
    expect(normal.font.family).toContain('Latin Modern Sans');
    const serif = resolveTheme(settings({ fontFamily: 'latin-modern-roman' }), '169');
    expect(serif.font.family).toContain('Latin Modern Roman');
    expect(serif.font.family).not.toBe(normal.font.family);
  });

  it('scales the base font with the document font size', () => {
    const eleven = resolveTheme(settings(), '169', 11);
    const fourteen = resolveTheme(settings(), '169', 14);
    expect(fourteen.font.base).toBeCloseTo(eleven.font.base * (14 / 11), 5);
    expect(fourteen.cssVars['--fs-base']).toBe(`${fourteen.font.base}px`);
  });

  it('exposes the chosen font stack and its mono companion', () => {
    const resolved = resolveTheme(settings({ fontFamily: 'fira-sans' }), '169');
    expect(resolved.font.family).toContain('Fira Sans');
    expect(resolved.font.mono).toContain('Fira Mono');
    expect(resolved.cssVars['--font-mono']).toContain('Fira Mono');
  });

  it('uses a system font stack and sanitized custom families', () => {
    const arial = resolveTheme(settings({ fontFamily: 'arial' }), '169');
    expect(arial.font.family).toContain('Arial');
    expect(arial.font.mono).toContain('Consolas');
    const custom = resolveTheme(
      settings({ fontFamily: 'custom', customFont: 'Bahnschrift}"x' }),
      '169',
    );
    expect(custom.font.family).toContain('"Bahnschrift x"');
  });

  it('honors explicit bullet and block shape overrides', () => {
    const rounded = resolveTheme(settings({ bulletShape: 'square', blockShape: 'rectangle' }), '169');
    expect(rounded.layout.bullet).toBe('square');
    expect(rounded.layout.blockShape).toBe('rectangle');
  });

  it('uses the theme bullet and block shape when set to theme', () => {
    const resolved = resolveTheme(settings({ template: 'Madrid' }), '169');
    expect(resolved.layout.bullet).toBe('ball');
    expect(resolved.layout.blockShape).toBe('rounded');
  });

  it('preserves transparent chrome backgrounds instead of flattening them', () => {
    const resolved = resolveTheme(settings({ template: 'default', colorTheme: 'default' }), '169');
    expect(resolved.palette.frametitle.bg).toBe('transparent');
    expect(resolved.cssVars['--frametitle-bg']).toBe('transparent');
    expect(resolved.cssVars['--title-bar']).toBe('transparent');
  });

  it('applies custom colors when enabled', () => {
    const resolved = resolveTheme(
      settings({
        custom: {
          enabled: true,
          structure: '#123456',
          background: '#fefefe',
          foreground: '#101010',
          alert: '#cc0001',
          primaryBar: '#204060',
        },
      }),
      '169',
    );
    expect(resolved.palette.structure).toBe('#123456');
    expect(resolved.palette.bg).toBe('#fefefe');
    expect(resolved.palette.fg).toBe('#101010');
    expect(resolved.palette.alert).toBe('#cc0001');
    expect(resolved.cssVars['--structure']).toBe('#123456');
  });

  it('propagates a structure override into colors derived from it', () => {
    const before = resolveTheme(settings({ template: 'Madrid' }), '169');
    const after = resolveTheme(
      settings({ template: 'Madrid', custom: { enabled: true, structure: '#c00040' } }),
      '169',
    );
    expect(before.palette.frametitle.bg).not.toBe('transparent');
    expect(after.palette.structure).toBe('#c00040');
    expect(after.palette.frametitle.bg).toBe('#c00040');
    expect(after.palette.palettePrimary.bg).toBe('#c00040');
    expect(after.palette.sidebar.bg).toBe('#c00040');
    expect(after.palette.paletteSecondary.bg).not.toBe(before.palette.paletteSecondary.bg);
  });

  it('ignores custom colors when disabled', () => {
    const plain = resolveTheme(settings(), '169');
    const disabled = resolveTheme(
      settings({ custom: { enabled: false, structure: '#123456' } }),
      '169',
    );
    expect(disabled.palette.structure).toBe(plain.palette.structure);
  });

  it('adds the gallery color theme as a layer when it is not part of the template', () => {
    const resolved = resolveTheme(settings({ template: 'default', colorTheme: 'rose' }), '169');
    expect(resolved.spec.colorThemes).not.toContain('rose');
    expect(resolved.palette).toBeDefined();
  });

  it('mirrors colortheme titlelike/frametitle inheritance from the stock .sty files', () => {
    const madrid = (colorTheme: ThemeSettings['colorTheme']) =>
      resolveTheme(settings({ template: 'Madrid', colorTheme }), '169').palette;

    // lily sets titlelike=structure and the default frametitle inherits it.
    expect(madrid('lily').titlelike.bg).toBe('transparent');
    expect(madrid('lily').frametitle.bg).toBe('transparent');
    // seagull and albatross keep whale's titlelike (palette primary) fill.
    expect(madrid('seagull').frametitle.bg).toBe('#cccccc');
    expect(madrid('albatross').frametitle.bg).toBe('#000060');
    // crane only sets titlelike, so its frametitle uses the same orange.
    expect(madrid('crane').frametitle.bg).toBe('#fcbb06');
  });

  it('resets plain-title themes before an extra colortheme layers on top', () => {
    const hannover = resolveTheme(settings({ template: 'Hannover', colorTheme: 'seahorse' }), '169').palette;
    expect(hannover.titlelike.bg).toBe('transparent');
    expect(hannover.frametitle.bg).toBe('transparent');
    const malmoe = resolveTheme(settings({ template: 'Malmoe' }), '169').palette;
    expect(malmoe.frametitle.bg).toBe('transparent');
    // \usecolortheme{crane} after \usetheme{Hannover} fills titlelike again.
    const extra = resolveTheme(settings({ template: 'Hannover', colorTheme: 'crane' }), '169').palette;
    expect(extra.frametitle.bg).toBe('#fcbb06');
  });

  it('resolves every stock theme and color theme without throwing', () => {
    expect(THEME_NAMES).toHaveLength(29);
    expect(COLOR_THEME_NAMES).toHaveLength(19);
    for (const template of THEME_NAMES) {
      for (const colorTheme of COLOR_THEME_NAMES) {
        const resolved = resolveTheme(settings({ template, colorTheme }), '169');
        expect(resolved.spec.name).toBe(template);
        expect(resolved.cssVars['--fs-base']).toMatch(/px$/);
        expect(resolved.cssVars['--bg']).toBeTruthy();
      }
    }
  });

  it('reports sidebar geometry only for sidebar themes', () => {
    const berkeley = resolveTheme(settings({ template: 'Berkeley' }), '169');
    expect(berkeley.layout.sidebarWidth).toBeGreaterThan(0);
    const plain = resolveTheme(settings({ template: 'default' }), '169');
    expect(plain.layout.sidebarWidth).toBe(0);
  });

  it('reports an inmargin gutter for Bergen', () => {
    const bergen = resolveTheme(settings({ template: 'Bergen' }), '169');
    expect(bergen.layout.inmarginWidth).toBeCloseTo(960 * 0.25, 5);
    expect(themeSpec('Bergen').inner).toBe('inmargin');
  });
});
