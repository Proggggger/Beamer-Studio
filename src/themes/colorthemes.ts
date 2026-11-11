import type { ColorThemeName, CustomColors } from '../model/types';
import { mix, readableOn, shade, TRANSPARENT } from './colorMath';

export interface Swatch {
  fg: string;
  bg: string;
}

export interface Palette {
  bg: string;
  fg: string;
  structure: string;
  alert: string;
  example: string;
  palettePrimary: Swatch;
  paletteSecondary: Swatch;
  paletteTertiary: Swatch;
  paletteQuaternary: Swatch;
  sidebar: Swatch;
  sidebarPrimary: string;
  sidebarSecondary: string;
  sidebarTertiary: string;
  sidebarQuaternary: string;
  frametitle: Swatch;
  framesubtitleFg: string;
  blockTitle: Swatch;
  blockBody: Swatch;
  blockTitleAlert: Swatch;
  blockBodyAlert: Swatch;
  blockTitleExample: Swatch;
  blockBodyExample: Swatch;
  item: string;
  subitem: string;
  itemProjected: Swatch;
  titlelike: Swatch;
}

const WHITE = '#ffffff';
const BLACK = '#000000';
const RED = '#ff0000';
const GREEN = '#00ff00';
const BLUE = '#0000ff';
const YELLOW = '#ffff00';
const ORANGE = '#ff8000';
const GRAY = '#808080';
const DARKRED = '#cc0000';
const DARKBLUE = '#0000cc';
const BLENDED_BLUE = '#3333b3';
const EXAMPLE_GREEN = mix(GREEN, BLACK, 50);

export const BASE_PALETTE: Palette = {
  bg: WHITE,
  fg: BLACK,
  structure: BLENDED_BLUE,
  alert: RED,
  example: EXAMPLE_GREEN,
  palettePrimary: { fg: BLENDED_BLUE, bg: TRANSPARENT },
  paletteSecondary: { fg: mix(BLENDED_BLUE, BLACK, 75), bg: TRANSPARENT },
  paletteTertiary: { fg: mix(BLENDED_BLUE, BLACK, 50), bg: TRANSPARENT },
  paletteQuaternary: { fg: BLACK, bg: TRANSPARENT },
  sidebar: { fg: BLACK, bg: TRANSPARENT },
  sidebarPrimary: BLACK,
  sidebarSecondary: BLENDED_BLUE,
  sidebarTertiary: BLACK,
  sidebarQuaternary: BLENDED_BLUE,
  frametitle: { fg: BLENDED_BLUE, bg: TRANSPARENT },
  framesubtitleFg: BLENDED_BLUE,
  blockTitle: { fg: BLENDED_BLUE, bg: TRANSPARENT },
  blockBody: { fg: BLACK, bg: TRANSPARENT },
  blockTitleAlert: { fg: RED, bg: TRANSPARENT },
  blockBodyAlert: { fg: BLACK, bg: TRANSPARENT },
  blockTitleExample: { fg: EXAMPLE_GREEN, bg: TRANSPARENT },
  blockBodyExample: { fg: BLACK, bg: TRANSPARENT },
  item: BLENDED_BLUE,
  subitem: BLENDED_BLUE,
  itemProjected: { fg: WHITE, bg: BLENDED_BLUE },
  titlelike: { fg: BLENDED_BLUE, bg: TRANSPARENT },
};

type ThemeFn = (p: Palette) => Palette;

const identity: ThemeFn = (p) => p;

const whale: ThemeFn = (p) => ({
  ...p,
  palettePrimary: { fg: WHITE, bg: p.structure },
  paletteSecondary: { fg: WHITE, bg: mix(p.structure, BLACK, 75) },
  paletteTertiary: { fg: WHITE, bg: mix(p.structure, BLACK, 50) },
  paletteQuaternary: { fg: WHITE, bg: BLACK },
  sidebar: { fg: p.fg, bg: p.structure },
  sidebarPrimary: mix(p.structure, WHITE, 10),
  sidebarSecondary: WHITE,
  sidebarTertiary: mix(p.structure, WHITE, 50),
  sidebarQuaternary: WHITE,
  titlelike: { fg: WHITE, bg: p.structure },
  frametitle: { fg: WHITE, bg: p.structure },
  framesubtitleFg: WHITE,
});

const orchid: ThemeFn = (p) => {
  const blockBg = mix(p.structure, BLACK, 75);
  const alertBg = mix(p.alert, BLACK, 75);
  const exampleBg = mix(p.example, BLACK, 75);
  return {
    ...p,
    blockTitle: { fg: WHITE, bg: blockBg },
    blockTitleAlert: { fg: WHITE, bg: alertBg },
    blockTitleExample: { fg: WHITE, bg: exampleBg },
    blockBody: { fg: p.fg, bg: mix(blockBg, p.bg, 10) },
    blockBodyAlert: { fg: p.fg, bg: mix(alertBg, p.bg, 10) },
    blockBodyExample: { fg: p.fg, bg: mix(exampleBg, p.bg, 10) },
  };
};

const beaver: ThemeFn = (p) => ({
  ...p,
  alert: mix(DARKRED, GRAY, 80),
  palettePrimary: { fg: mix(DARKRED, BLACK, 60), bg: mix(GRAY, WHITE, 30) },
  paletteSecondary: { fg: mix(DARKRED, BLACK, 70), bg: mix(GRAY, WHITE, 15) },
  paletteTertiary: { fg: mix(GRAY, WHITE, 10), bg: mix(DARKRED, BLACK, 80) },
  paletteQuaternary: { fg: DARKRED, bg: mix(GRAY, WHITE, 5) },
  sidebar: { fg: DARKRED, bg: mix(GRAY, WHITE, 15) },
  sidebarPrimary: mix(DARKRED, BLACK, 90),
  sidebarSecondary: WHITE,
  sidebarTertiary: mix(DARKRED, BLACK, 50),
  sidebarQuaternary: mix(GRAY, WHITE, 10),
  titlelike: { fg: DARKRED, bg: mix(GRAY, WHITE, 30) },
  frametitle: { fg: DARKRED, bg: mix(GRAY, WHITE, 10) },
  framesubtitleFg: DARKRED,
});

const wolverine: ThemeFn = (p) => ({
  ...p,
  alert: mix(DARKBLUE, YELLOW, 80),
  palettePrimary: { fg: mix(DARKBLUE, BLACK, 60), bg: mix(YELLOW, ORANGE, 85) },
  paletteSecondary: { fg: mix(DARKBLUE, BLACK, 70), bg: mix(YELLOW, ORANGE, 60) },
  paletteTertiary: { fg: mix(YELLOW, ORANGE, 50), bg: mix(DARKBLUE, BLACK, 80) },
  paletteQuaternary: { fg: DARKBLUE, bg: mix(YELLOW, ORANGE, 20) },
  sidebar: { fg: DARKBLUE, bg: mix(ORANGE, WHITE, 75) },
  sidebarPrimary: mix(DARKBLUE, BLACK, 90),
  sidebarSecondary: WHITE,
  sidebarTertiary: mix(DARKBLUE, BLACK, 50),
  sidebarQuaternary: mix(YELLOW, ORANGE, 10),
  titlelike: { fg: mix(DARKBLUE, BLACK, 60), bg: mix(YELLOW, ORANGE, 85) },
  frametitle: { fg: DARKBLUE, bg: mix(YELLOW, ORANGE, 90) },
  framesubtitleFg: DARKBLUE,
});

const craneOrange = '#fcbb06';
const craneBlue = '#04064c';

const crane: ThemeFn = (p) => ({
  ...p,
  structure: craneBlue,
  palettePrimary: { fg: craneBlue, bg: mix(craneOrange, WHITE, 70) },
  paletteSecondary: { fg: craneBlue, bg: mix(craneOrange, WHITE, 80) },
  paletteTertiary: { fg: craneBlue, bg: mix(craneOrange, WHITE, 90) },
  paletteQuaternary: { fg: craneBlue, bg: craneOrange },
  titlelike: { fg: craneBlue, bg: craneOrange },
  sidebar: { fg: craneBlue, bg: mix(craneOrange, WHITE, 70) },
  sidebarPrimary: craneBlue,
  sidebarSecondary: mix(craneBlue, WHITE, 75),
  sidebarTertiary: mix(craneBlue, WHITE, 75),
  sidebarQuaternary: craneBlue,
  // crane.sty sets only titlelike; the default frametitle inherits its fill.
  frametitle: { fg: craneBlue, bg: craneOrange },
  framesubtitleFg: craneBlue,
  blockTitle: { fg: craneBlue, bg: craneOrange },
  blockTitleAlert: { fg: craneBlue, bg: mix(p.alert, WHITE, 75) },
  blockTitleExample: { fg: craneBlue, bg: mix(p.example, WHITE, 75) },
  blockBody: { fg: p.fg, bg: mix(craneOrange, p.bg, 25) },
  blockBodyAlert: { fg: p.fg, bg: mix(mix(p.alert, WHITE, 75), p.bg, 25) },
  blockBodyExample: { fg: p.fg, bg: mix(mix(p.example, WHITE, 75), p.bg, 25) },
  item: craneBlue,
  subitem: craneBlue,
  itemProjected: { fg: WHITE, bg: craneBlue },
});

const dolphin: ThemeFn = (p) => ({
  ...p,
  palettePrimary: { fg: BLACK, bg: mix(p.structure, WHITE, 40) },
  paletteSecondary: { fg: WHITE, bg: mix(p.structure, WHITE, 60) },
  paletteTertiary: { fg: WHITE, bg: mix(p.structure, WHITE, 90) },
  paletteQuaternary: { fg: WHITE, bg: BLACK },
  sidebar: { fg: WHITE, bg: p.structure },
  sidebarPrimary: mix(p.structure, WHITE, 10),
  sidebarSecondary: WHITE,
  sidebarTertiary: mix(p.structure, WHITE, 50),
  sidebarQuaternary: WHITE,
  titlelike: { fg: p.structure, bg: TRANSPARENT },
  frametitle: { fg: p.structure, bg: TRANSPARENT },
  framesubtitleFg: p.structure,
});

const dove: ThemeFn = (p) => ({
  ...p,
  alert: BLACK,
  example: BLACK,
  structure: BLACK,
  palettePrimary: { fg: BLACK, bg: WHITE },
  paletteSecondary: { fg: BLACK, bg: WHITE },
  paletteTertiary: { fg: BLACK, bg: WHITE },
  paletteQuaternary: { fg: BLACK, bg: WHITE },
  sidebar: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  sidebarPrimary: BLACK,
  sidebarSecondary: BLACK,
  sidebarTertiary: BLACK,
  sidebarQuaternary: BLACK,
  item: BLACK,
  subitem: BLACK,
  itemProjected: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  blockTitle: { fg: BLACK, bg: TRANSPARENT },
  blockTitleAlert: { fg: BLACK, bg: TRANSPARENT },
  blockTitleExample: { fg: BLACK, bg: TRANSPARENT },
  blockBody: { fg: BLACK, bg: TRANSPARENT },
  blockBodyAlert: { fg: BLACK, bg: TRANSPARENT },
  blockBodyExample: { fg: BLACK, bg: TRANSPARENT },
  titlelike: { fg: BLACK, bg: TRANSPARENT },
  frametitle: { fg: BLACK, bg: TRANSPARENT },
  framesubtitleFg: BLACK,
});

const fly: ThemeFn = (p) => ({
  ...p,
  bg: mix(BLACK, WHITE, 40),
  fg: BLACK,
  structure: WHITE,
  alert: mix(RED, BLACK, 85),
  palettePrimary: { fg: WHITE, bg: TRANSPARENT },
  paletteSecondary: { fg: mix(WHITE, BLACK, 95), bg: TRANSPARENT },
  paletteTertiary: { fg: mix(WHITE, BLACK, 90), bg: TRANSPARENT },
  paletteQuaternary: { fg: mix(WHITE, BLACK, 85), bg: TRANSPARENT },
  sidebar: { fg: WHITE, bg: mix(BLACK, WHITE, 50) },
  sidebarPrimary: WHITE,
  sidebarSecondary: BLACK,
  sidebarTertiary: WHITE,
  sidebarQuaternary: BLACK,
  item: WHITE,
  subitem: WHITE,
  itemProjected: { fg: BLACK, bg: mix(WHITE, BLACK, 75) },
  blockTitle: { fg: WHITE, bg: TRANSPARENT },
  blockBody: { fg: BLACK, bg: TRANSPARENT },
  titlelike: { fg: WHITE, bg: TRANSPARENT },
  frametitle: { fg: WHITE, bg: TRANSPARENT },
  framesubtitleFg: BLACK,
  blockTitleAlert: { fg: mix(RED, BLACK, 85), bg: TRANSPARENT },
});

const beetleOther = '#40507f';

const beetle: ThemeFn = (p) => ({
  ...p,
  bg: mix(BLACK, WHITE, 40),
  fg: BLACK,
  structure: WHITE,
  alert: mix(RED, BLACK, 85),
  palettePrimary: { fg: WHITE, bg: beetleOther },
  paletteSecondary: { fg: WHITE, bg: mix(beetleOther, BLACK, 95) },
  paletteTertiary: { fg: WHITE, bg: mix(beetleOther, BLACK, 90) },
  paletteQuaternary: { fg: WHITE, bg: mix(beetleOther, BLACK, 85) },
  sidebar: { fg: WHITE, bg: beetleOther },
  sidebarPrimary: WHITE,
  sidebarSecondary: BLACK,
  sidebarTertiary: WHITE,
  sidebarQuaternary: BLACK,
  item: WHITE,
  subitem: WHITE,
  itemProjected: { fg: BLACK, bg: mix(WHITE, BLACK, 75) },
  blockTitle: { fg: WHITE, bg: TRANSPARENT },
  blockBody: { fg: BLACK, bg: TRANSPARENT },
  titlelike: { fg: WHITE, bg: TRANSPARENT },
  frametitle: { fg: WHITE, bg: TRANSPARENT },
  framesubtitleFg: BLACK,
});

const albatross: ThemeFn = (p) => {
  const normalBg = mix(BLUE, BLACK, 50);
  const normalFg = mix(YELLOW, WHITE, 50);
  const structure = mix(BLUE, WHITE, 25);
  return {
    ...p,
    bg: normalBg,
    fg: normalFg,
    structure,
    example: mix(GREEN, BLACK, 65),
    palettePrimary: { fg: structure, bg: mix(normalBg, BLACK, 75) },
    paletteSecondary: { fg: structure, bg: mix(normalBg, BLACK, 60) },
    paletteTertiary: { fg: structure, bg: mix(normalBg, BLACK, 45) },
    paletteQuaternary: { fg: structure, bg: mix(normalBg, BLACK, 30) },
    sidebar: { fg: structure, bg: mix(normalBg, BLACK, 75) },
    sidebarPrimary: normalFg,
    sidebarSecondary: structure,
    sidebarTertiary: normalFg,
    sidebarQuaternary: structure,
    item: structure,
    subitem: structure,
    itemProjected: { fg: BLACK, bg: structure },
    blockTitle: { fg: structure, bg: mix(normalBg, BLACK, 75) },
    blockBody: { fg: normalFg, bg: mix(normalBg, BLACK, 90) },
    blockTitleAlert: { fg: mix(p.alert, WHITE, 25), bg: mix(normalBg, BLACK, 75) },
    blockTitleExample: { fg: mix(mix(GREEN, BLACK, 65), WHITE, 25), bg: mix(normalBg, BLACK, 75) },
    blockBodyAlert: { fg: normalFg, bg: mix(normalBg, BLACK, 90) },
    blockBodyExample: { fg: normalFg, bg: mix(normalBg, BLACK, 90) },
    // albatross.sty keeps whale's titlelike (palette primary) fill.
    titlelike: { fg: structure, bg: mix(normalBg, BLACK, 75) },
    frametitle: { fg: structure, bg: mix(normalBg, BLACK, 75) },
    framesubtitleFg: structure,
  };
};

const lily: ThemeFn = (p) => ({
  ...p,
  blockTitle: { fg: p.structure, bg: TRANSPARENT },
  blockTitleAlert: { fg: p.alert, bg: TRANSPARENT },
  blockTitleExample: { fg: p.example, bg: TRANSPARENT },
  blockBody: { fg: p.fg, bg: TRANSPARENT },
  blockBodyAlert: { fg: p.fg, bg: TRANSPARENT },
  blockBodyExample: { fg: p.fg, bg: TRANSPARENT },
  titlelike: { fg: p.structure, bg: TRANSPARENT },
  // lily sets titlelike=structure; beamer's default frametitle inherits titlelike.
  frametitle: { fg: p.structure, bg: TRANSPARENT },
  framesubtitleFg: p.structure,
});

const rose: ThemeFn = (p) => ({
  ...p,
  blockTitle: { fg: p.structure, bg: mix(p.structure, p.bg, 20) },
  blockTitleAlert: { fg: p.alert, bg: mix(p.alert, p.bg, 20) },
  blockTitleExample: { fg: p.example, bg: mix(p.example, p.bg, 20) },
  blockBody: { fg: p.fg, bg: mix(mix(p.structure, p.bg, 20), p.bg, 50) },
  blockBodyAlert: { fg: p.fg, bg: mix(mix(p.alert, p.bg, 20), p.bg, 50) },
  blockBodyExample: { fg: p.fg, bg: mix(mix(p.example, p.bg, 20), p.bg, 50) },
});

const seagull: ThemeFn = (p) => ({
  ...p,
  alert: BLACK,
  example: BLACK,
  structure: BLACK,
  palettePrimary: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  paletteSecondary: { fg: BLACK, bg: mix(BLACK, WHITE, 25) },
  paletteTertiary: { fg: BLACK, bg: mix(BLACK, WHITE, 30) },
  paletteQuaternary: { fg: BLACK, bg: mix(BLACK, WHITE, 35) },
  sidebar: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  sidebarPrimary: BLACK,
  sidebarSecondary: BLACK,
  sidebarTertiary: BLACK,
  sidebarQuaternary: BLACK,
  item: BLACK,
  subitem: BLACK,
  itemProjected: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  blockTitle: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  blockTitleAlert: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  blockTitleExample: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  blockBody: { fg: BLACK, bg: mix(BLACK, WHITE, 10) },
  blockBodyAlert: { fg: BLACK, bg: mix(BLACK, WHITE, 10) },
  blockBodyExample: { fg: BLACK, bg: mix(BLACK, WHITE, 10) },
  // No titlelike override in seagull.sty: it keeps whale's palette-primary fill.
  titlelike: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  frametitle: { fg: BLACK, bg: mix(BLACK, WHITE, 20) },
  framesubtitleFg: BLACK,
});

const seahorse: ThemeFn = (p) => ({
  ...p,
  palettePrimary: { fg: BLACK, bg: mix(p.structure, WHITE, 20) },
  paletteSecondary: { fg: BLACK, bg: mix(p.structure, WHITE, 25) },
  paletteTertiary: { fg: BLACK, bg: mix(p.structure, WHITE, 30) },
  paletteQuaternary: { fg: BLACK, bg: mix(p.structure, WHITE, 35) },
  sidebar: { fg: BLACK, bg: mix(p.structure, WHITE, 20) },
  sidebarPrimary: BLACK,
  sidebarSecondary: p.structure,
  sidebarTertiary: BLACK,
  sidebarQuaternary: p.structure,
  titlelike: { fg: BLACK, bg: mix(p.structure, WHITE, 20) },
  frametitle: { fg: BLACK, bg: mix(p.structure, WHITE, 20) },
  framesubtitleFg: BLACK,
});

const spruceGreen = '#006633';

const spruce: ThemeFn = (p) => ({
  ...p,
  alert: mix(spruceGreen, WHITE, 80),
  palettePrimary: { fg: mix(spruceGreen, BLACK, 60), bg: mix(WHITE, spruceGreen, 85) },
  paletteSecondary: { fg: mix(spruceGreen, BLACK, 70), bg: mix(WHITE, spruceGreen, 60) },
  paletteTertiary: { fg: mix(WHITE, spruceGreen, 50), bg: mix(spruceGreen, BLACK, 80) },
  paletteQuaternary: { fg: spruceGreen, bg: mix(WHITE, spruceGreen, 20) },
  sidebar: { fg: spruceGreen, bg: mix(spruceGreen, WHITE, 75) },
  sidebarPrimary: mix(spruceGreen, BLACK, 90),
  sidebarSecondary: WHITE,
  sidebarTertiary: mix(spruceGreen, BLACK, 50),
  sidebarQuaternary: mix(WHITE, spruceGreen, 10),
  titlelike: { fg: mix(spruceGreen, BLACK, 60), bg: mix(WHITE, spruceGreen, 85) },
  frametitle: { fg: mix(spruceGreen, BLACK, 60), bg: mix(WHITE, spruceGreen, 90) },
  framesubtitleFg: mix(spruceGreen, BLACK, 60),
  blockBody: { fg: p.fg, bg: TRANSPARENT },
});

const monarca: ThemeFn = (p) => ({
  ...p,
  bg: craneOrange,
  fg: BLACK,
  structure: BLACK,
  palettePrimary: { fg: mix(craneOrange, WHITE, 75), bg: BLACK },
  paletteSecondary: { fg: BLACK, bg: craneOrange },
  paletteTertiary: { fg: mix(craneOrange, WHITE, 75), bg: BLACK },
  paletteQuaternary: { fg: BLACK, bg: WHITE },
  sidebar: { fg: BLACK, bg: mix(craneOrange, WHITE, 90) },
  sidebarPrimary: BLACK,
  sidebarSecondary: mix(BLACK, WHITE, 75),
  sidebarTertiary: mix(BLACK, WHITE, 75),
  sidebarQuaternary: BLACK,
  item: BLACK,
  subitem: BLACK,
  itemProjected: { fg: WHITE, bg: BLACK },
  titlelike: { fg: BLACK, bg: WHITE },
  frametitle: { fg: BLACK, bg: WHITE },
  framesubtitleFg: BLACK,
  blockTitle: { fg: BLACK, bg: WHITE },
  blockTitleAlert: { fg: BLACK, bg: mix(p.alert, WHITE, 75) },
  blockTitleExample: { fg: BLACK, bg: mix(p.example, WHITE, 75) },
  blockBody: { fg: BLACK, bg: mix(WHITE, craneOrange, 25) },
  blockBodyAlert: { fg: BLACK, bg: mix(mix(p.alert, WHITE, 75), craneOrange, 25) },
  blockBodyExample: { fg: BLACK, bg: mix(mix(p.example, WHITE, 75), craneOrange, 25) },
});

const sidebartab: ThemeFn = (p) => ({
  ...p,
  sidebarPrimary: p.fg,
  sidebarSecondary: p.structure,
});

export const COLOR_THEMES: Record<ColorThemeName, ThemeFn> = {
  default: identity,
  albatross,
  beaver,
  beetle,
  crane,
  dolphin,
  dove,
  fly,
  lily,
  monarca,
  orchid,
  rose,
  seagull,
  seahorse,
  sidebartab,
  spruce,
  structure: identity,
  whale,
  wolverine,
};

export function applyColorThemes(names: ColorThemeName[], base: Palette = BASE_PALETTE): Palette {
  return names.reduce<Palette>((palette, name) => (COLOR_THEMES[name] ?? identity)(palette), {
    ...base,
  });
}

export function applyCustomColors(palette: Palette, custom: CustomColors): Palette {
  if (!custom.enabled) return palette;
  let next: Palette = { ...palette };

  if (custom.structure) {
    const old = next.structure;
    const neu = custom.structure;
    // Beamer colors are references, so palette entries derived from `structure`
    // have to follow the override instead of keeping the old hue.
    const remap = (color: string): string => {
      if (color === old) return neu;
      for (const pct of [75, 50] as const) {
        if (color === mix(old, BLACK, pct)) return mix(neu, BLACK, pct);
      }
      for (const pct of [10, 50] as const) {
        if (color === mix(old, WHITE, pct)) return mix(neu, WHITE, pct);
      }
      if (color === mix(mix(old, BLACK, 75), next.bg, 10)) {
        return mix(mix(neu, BLACK, 75), next.bg, 10);
      }
      if (color === mix(old, next.bg, 20)) return mix(neu, next.bg, 20);
      if (color === mix(mix(old, next.bg, 20), next.bg, 50)) {
        return mix(mix(neu, next.bg, 20), next.bg, 50);
      }
      return color;
    };
    const remapSwatch = (swatch: Swatch): Swatch => ({ fg: remap(swatch.fg), bg: remap(swatch.bg) });
    next = {
      ...next,
      structure: neu,
      item: remap(next.item),
      subitem: remap(next.subitem),
      itemProjected: remapSwatch(next.itemProjected),
      palettePrimary: remapSwatch(next.palettePrimary),
      paletteSecondary: remapSwatch(next.paletteSecondary),
      paletteTertiary: remapSwatch(next.paletteTertiary),
      paletteQuaternary: remapSwatch(next.paletteQuaternary),
      sidebar: remapSwatch(next.sidebar),
      sidebarPrimary: remap(next.sidebarPrimary),
      sidebarSecondary: remap(next.sidebarSecondary),
      sidebarTertiary: remap(next.sidebarTertiary),
      sidebarQuaternary: remap(next.sidebarQuaternary),
      frametitle: remapSwatch(next.frametitle),
      framesubtitleFg: remap(next.framesubtitleFg),
      blockTitle: remapSwatch(next.blockTitle),
      blockBody: remapSwatch(next.blockBody),
      blockTitleAlert: remapSwatch(next.blockTitleAlert),
      blockBodyAlert: remapSwatch(next.blockBodyAlert),
      blockTitleExample: remapSwatch(next.blockTitleExample),
      blockBodyExample: remapSwatch(next.blockBodyExample),
      titlelike: remapSwatch(next.titlelike),
    };
  }

  if (custom.primaryBar) {
    const bar = custom.primaryBar;
    next.palettePrimary = { fg: readableOn(bar), bg: bar };
    next.paletteSecondary = { fg: readableOn(shade(bar, 82)), bg: shade(bar, 82) };
    next.paletteTertiary = { fg: readableOn(shade(bar, 64)), bg: shade(bar, 64) };
    next.frametitle = { fg: readableOn(bar), bg: bar };
    next.framesubtitleFg = readableOn(bar);
    next.sidebar = { fg: readableOn(shade(bar, 78)), bg: shade(bar, 78) };
    next.sidebarPrimary = mix(bar, WHITE, 10);
    next.sidebarSecondary = WHITE;
    next.sidebarTertiary = mix(bar, WHITE, 50);
    next.sidebarQuaternary = WHITE;
    next.titlelike = { fg: readableOn(bar), bg: bar };
  }

  if (custom.background) {
    next.bg = custom.background;
  }

  if (custom.foreground) {
    const old = next.fg;
    next.fg = custom.foreground;
    if (next.blockBody.fg === old) next.blockBody = { ...next.blockBody, fg: custom.foreground };
    if (next.blockBodyAlert.fg === old) next.blockBodyAlert = { ...next.blockBodyAlert, fg: custom.foreground };
    if (next.blockBodyExample.fg === old) next.blockBodyExample = { ...next.blockBodyExample, fg: custom.foreground };
  }

  if (custom.alert) {
    const old = next.alert;
    next.alert = custom.alert;
    if (next.blockTitleAlert.fg === old) next.blockTitleAlert = { ...next.blockTitleAlert, fg: custom.alert };
  }

  return next;
}
