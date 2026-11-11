import type { Aspect, ThemeSettings } from '../model/types';
import type { ThemeSpec } from './beamerThemes';
import { themeSpec } from './beamerThemes';
import { applyColorThemes, applyCustomColors, type Palette, type Swatch } from './colorthemes';
import { mix, TRANSPARENT } from './colorMath';
import { MONO_STACK, SANS_STACK, SERIF_STACK, themeBlockRounded, themeBullet } from './typography';
import type { BlockShape, BulletShape } from '../model/types';

export interface ResolvedTheme {
  spec: ThemeSpec;
  palette: Palette;
  page: { w: number; h: number };
  font: { base: number; title: number; subtitle: number; small: number; tiny: number; family: string; mono: string };
  layout: {
    margin: number;
    headH: number;
    titleH: number;
    footH: number;
    sidebarWidth: number;
    sidebarHeadH: number;
    inmarginWidth: number;
    titlePage: ThemeSpec['titlePage'];
    bullet: BulletShape;
    blockShape: BlockShape;
    blockShadow: boolean;
    navigationSymbols: boolean;
  };
  cssVars: Record<string, string>;
}

export function solid(swatch: Swatch): string {
  return swatch.bg === TRANSPARENT ? swatch.fg : swatch.bg;
}

export function resolveTheme(settings: ThemeSettings, aspect: Aspect): ResolvedTheme {
  const spec = themeSpec(settings.template);
  const layered = applyColorThemes(spec.colorThemes);
  // Hannover/Malmoe/Marburg override `titlelike` to parent=structure in their
  // theme files; beamer's default frametitle inherits it, so nothing is filled
  // behind the frame or section title. An extra `\usecolortheme` layers after
  // this, so a selected theme that sets titlelike still gets its fill back.
  const withThemeOverride = spec.titlelikePlain
    ? {
        ...layered,
        titlelike: { fg: layered.structure, bg: TRANSPARENT },
        frametitle: { fg: layered.structure, bg: TRANSPARENT },
        framesubtitleFg: layered.structure,
      }
    : layered;
  const themed = spec.colorThemes.includes(settings.colorTheme)
    ? withThemeOverride
    : applyColorThemes([settings.colorTheme], withThemeOverride);
  const palette = applyCustomColors(themed, settings.custom);

  const page = aspect === '169' ? { w: 960, h: 540 } : { w: 800, h: 600 };
  const base = (page.w / 40) * settings.fontScale;
  const font = {
    base,
    title: base * 1.5,
    subtitle: base * 0.95,
    small: base * 0.68,
    tiny: base * 0.56,
    family: settings.fontFamily === 'serif' ? SERIF_STACK : SANS_STACK,
    mono: MONO_STACK,
  };

  const margin = page.w * 0.05;
  const sidebarWidth = spec.sidebar ? page.w * spec.sidebar.widthPct : 0;
  const sidebarHeadH = specificHeadHeight(page.h, spec);
  const inmarginWidth = spec.inner === 'inmargin' ? page.w * 0.25 : 0;

  // Measured against stock Beamer renders: Madrid/Copenhagen ~11%, tree themes
  // carry a taller bar under their two-row headline, sidebar themes taller still.
  const titleH =
    spec.inner === 'inmargin'
      ? page.h * 0.075
      : spec.outer === 'tree' || spec.outer === 'smoothtree'
        ? page.h * 0.144
        : spec.outer === 'miniframes' || spec.outer === 'smoothbars'
          ? page.h * 0.19
          : spec.sidebar
            ? page.h * (spec.sidebar.head ? 0.17 : 0.155)
            : page.h * 0.1125;
  const headH = page.h * 0.06;
  const footH = page.h * 0.06;

  const bullet: BulletShape =
    settings.bulletShape === 'theme' ? themeBullet(spec.inner) : settings.bulletShape;
  const blockShape: BlockShape =
    settings.blockShape === 'theme'
      ? themeBlockRounded(spec.inner)
        ? 'rounded'
        : 'rectangle'
      : settings.blockShape;

  const navColor = mix(palette.structure, palette.bg, 40);
  const titleBar = palette.frametitle.bg;
  const titleBarFg = palette.frametitle.fg;

  const cssVars: Record<string, string> = {
    '--bg': palette.bg,
    '--fg': palette.fg,
    '--structure': palette.structure,
    '--alert': palette.alert,
    '--example': palette.example,
    '--pal-primary-bg': palette.palettePrimary.bg,
    '--pal-primary-fg': palette.palettePrimary.fg,
    '--pal-secondary-bg': palette.paletteSecondary.bg,
    '--pal-secondary-fg': palette.paletteSecondary.fg,
    '--pal-tertiary-bg': palette.paletteTertiary.bg,
    '--pal-tertiary-fg': palette.paletteTertiary.fg,
    '--pal-quaternary-bg': palette.paletteQuaternary.bg,
    '--pal-quaternary-fg': palette.paletteQuaternary.fg,
    '--sidebar-bg': palette.sidebar.bg,
    '--sidebar-fg': palette.sidebar.fg,
    '--sidebar-primary': palette.sidebarPrimary,
    '--sidebar-secondary': palette.sidebarSecondary,
    '--sidebar-tertiary': palette.sidebarTertiary,
    '--sidebar-quaternary': palette.sidebarQuaternary,
    '--frametitle-bg': palette.frametitle.bg,
    '--frametitle-fg': palette.frametitle.fg,
    '--framesubtitle-fg': palette.framesubtitleFg,
    '--block-title-bg': palette.blockTitle.bg,
    '--block-title-fg': palette.blockTitle.fg,
    '--block-body-bg': palette.blockBody.bg,
    '--block-body-fg': palette.blockBody.fg,
    '--block-alert-bg': palette.blockTitleAlert.bg,
    '--block-alert-fg': palette.blockTitleAlert.fg,
    '--block-alert-body-bg': palette.blockBodyAlert.bg,
    '--block-alert-body-fg': palette.blockBodyAlert.fg,
    '--block-example-bg': palette.blockTitleExample.bg,
    '--block-example-fg': palette.blockTitleExample.fg,
    '--block-example-body-bg': palette.blockBodyExample.bg,
    '--block-example-body-fg': palette.blockBodyExample.fg,
    '--item-color': palette.item,
    '--subitem-color': palette.subitem,
    '--nav-color': navColor,
    '--projected-bg': palette.itemProjected.bg,
    '--projected-fg': palette.itemProjected.fg,
    '--title-bar': titleBar,
    '--title-bar-fg': titleBarFg,
    '--font-body': font.family,
    '--font-mono': font.mono,
    '--fs-base': `${font.base}px`,
    '--fs-title': `${font.title}px`,
    '--fs-subtitle': `${font.subtitle}px`,
    '--fs-small': `${font.small}px`,
    '--fs-tiny': `${font.tiny}px`,
    '--page-w': `${page.w}px`,
    '--page-h': `${page.h}px`,
    '--margin': `${margin}px`,
    '--title-h': `${titleH}px`,
    '--head-h': `${headH}px`,
    '--foot-h': `${footH}px`,
  };

  return {
    spec,
    palette,
    page,
    font,
    layout: {
      margin,
      headH,
      titleH,
      footH,
      sidebarWidth,
      sidebarHeadH,
      inmarginWidth,
      titlePage: spec.titlePage,
      bullet,
      blockShape,
      blockShadow: settings.blockShadow,
      navigationSymbols: settings.navigationSymbols,
    },
    cssVars,
  };
}

function specificHeadHeight(pageH: number, spec: ThemeSpec): number {
  if (!spec.sidebar) return 0;
  if (!spec.sidebar.head) return 0;
  return pageH * 0.135;
}
