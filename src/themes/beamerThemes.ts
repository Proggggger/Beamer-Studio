import type { ColorThemeName, ThemeName } from '../model/types';

export type OuterFamily =
  | 'none'
  | 'infolines'
  | 'miniframes'
  | 'split'
  | 'smoothbars'
  | 'tree'
  | 'smoothtree'
  | 'sidebar'
  | 'shadow';

export type InnerFamily = 'default' | 'rounded' | 'rectangles' | 'circles' | 'inmargin';
export type TitlePageStyle = 'plain' | 'box' | 'inmargin';

export interface SidebarSpec {
  side: 'left' | 'right';
  widthPct: number;
  head: boolean;
}

export interface MiniframesSpec {
  subsection: boolean;
  footline: 'authorinstitute' | 'authorinstitutetitle' | 'institutetitle' | 'none';
}

export interface ThemeSpec {
  name: ThemeName;
  outer: OuterFamily;
  inner: InnerFamily;
  colorThemes: ColorThemeName[];
  titlePage: TitlePageStyle;
  shadow: boolean;
  frametitleAlign: 'left' | 'center' | 'right';
  sidebar?: SidebarSpec;
  miniframes?: MiniframesSpec;
  smoothbars?: { subsection: boolean };
}

const SIDEBAR_LEFT: SidebarSpec = { side: 'left', widthPct: 0.096, head: true };

export const THEME_SPECS: Record<ThemeName, ThemeSpec> = {
  default: {
    name: 'default',
    outer: 'none',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'left',
  },
  boxes: {
    name: 'boxes',
    outer: 'none',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'left',
  },
  AnnArbor: {
    name: 'AnnArbor',
    outer: 'infolines',
    inner: 'rounded',
    colorThemes: ['wolverine'],
    titlePage: 'plain',
    shadow: true,
    frametitleAlign: 'left',
  },
  Antibes: {
    name: 'Antibes',
    outer: 'tree',
    inner: 'rectangles',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
  },
  Bergen: {
    name: 'Bergen',
    outer: 'none',
    inner: 'inmargin',
    colorThemes: ['orchid'],
    titlePage: 'inmargin',
    shadow: false,
    frametitleAlign: 'left',
  },
  Berkeley: {
    name: 'Berkeley',
    outer: 'sidebar',
    inner: 'rectangles',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
    sidebar: SIDEBAR_LEFT,
  },
  Berlin: {
    name: 'Berlin',
    outer: 'miniframes',
    inner: 'rectangles',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
    miniframes: { subsection: true, footline: 'authorinstitutetitle' },
  },
  Boadilla: {
    name: 'Boadilla',
    outer: 'infolines',
    inner: 'rounded',
    colorThemes: ['rose', 'dolphin'],
    titlePage: 'plain',
    shadow: true,
    frametitleAlign: 'left',
  },
  CambridgeUS: {
    name: 'CambridgeUS',
    outer: 'infolines',
    inner: 'rounded',
    colorThemes: ['beaver'],
    titlePage: 'plain',
    shadow: true,
    frametitleAlign: 'left',
  },
  Copenhagen: {
    name: 'Copenhagen',
    outer: 'split',
    inner: 'rounded',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
  },
  Darmstadt: {
    name: 'Darmstadt',
    outer: 'smoothbars',
    inner: 'rounded',
    colorThemes: ['orchid', 'whale'],
    titlePage: 'box',
    shadow: true,
    frametitleAlign: 'left',
    smoothbars: { subsection: true },
  },
  Dresden: {
    name: 'Dresden',
    outer: 'miniframes',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'left',
    miniframes: { subsection: true, footline: 'authorinstitutetitle' },
  },
  EastLansing: {
    name: 'EastLansing',
    outer: 'infolines',
    inner: 'rounded',
    colorThemes: ['spruce'],
    titlePage: 'plain',
    shadow: true,
    frametitleAlign: 'left',
  },
  Frankfurt: {
    name: 'Frankfurt',
    outer: 'smoothbars',
    inner: 'rounded',
    colorThemes: ['orchid', 'whale'],
    titlePage: 'box',
    shadow: true,
    frametitleAlign: 'left',
    smoothbars: { subsection: false },
  },
  Goettingen: {
    name: 'Goettingen',
    outer: 'sidebar',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'left',
    sidebar: { side: 'right', widthPct: 0.096, head: false },
  },
  Hannover: {
    name: 'Hannover',
    outer: 'sidebar',
    inner: 'circles',
    colorThemes: ['seahorse'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'right',
    sidebar: { side: 'left', widthPct: 0.096, head: false },
  },
  Ilmenau: {
    name: 'Ilmenau',
    outer: 'miniframes',
    inner: 'rounded',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: true,
    frametitleAlign: 'left',
    miniframes: { subsection: true, footline: 'authorinstitutetitle' },
  },
  JuanLesPins: {
    name: 'JuanLesPins',
    outer: 'smoothtree',
    inner: 'rounded',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: true,
    frametitleAlign: 'left',
  },
  Luebeck: {
    name: 'Luebeck',
    outer: 'split',
    inner: 'rectangles',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
  },
  Madrid: {
    name: 'Madrid',
    outer: 'infolines',
    inner: 'rounded',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'plain',
    shadow: true,
    frametitleAlign: 'left',
  },
  Malmoe: {
    name: 'Malmoe',
    outer: 'split',
    inner: 'default',
    colorThemes: ['whale'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
  },
  Marburg: {
    name: 'Marburg',
    outer: 'sidebar',
    inner: 'default',
    colorThemes: ['whale'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
    sidebar: { side: 'right', widthPct: 0.096, head: false },
  },
  Montpellier: {
    name: 'Montpellier',
    outer: 'tree',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'left',
  },
  PaloAlto: {
    name: 'PaloAlto',
    outer: 'sidebar',
    inner: 'rounded',
    colorThemes: ['orchid', 'whale'],
    titlePage: 'box',
    shadow: true,
    frametitleAlign: 'left',
    sidebar: SIDEBAR_LEFT,
  },
  Pittsburgh: {
    name: 'Pittsburgh',
    outer: 'none',
    inner: 'circles',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'right',
  },
  Rochester: {
    name: 'Rochester',
    outer: 'sidebar',
    inner: 'rectangles',
    colorThemes: ['whale', 'orchid'],
    titlePage: 'box',
    shadow: false,
    frametitleAlign: 'left',
    sidebar: { side: 'left', widthPct: 0, head: true },
  },
  Singapore: {
    name: 'Singapore',
    outer: 'miniframes',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'center',
    miniframes: { subsection: false, footline: 'none' },
  },
  Szeged: {
    name: 'Szeged',
    outer: 'miniframes',
    inner: 'default',
    colorThemes: ['default'],
    titlePage: 'plain',
    shadow: false,
    frametitleAlign: 'left',
    miniframes: { subsection: true, footline: 'institutetitle' },
  },
  Warsaw: {
    name: 'Warsaw',
    outer: 'shadow',
    inner: 'rounded',
    colorThemes: ['orchid', 'whale'],
    titlePage: 'box',
    shadow: true,
    frametitleAlign: 'left',
  },
};

export const THEME_NAMES = Object.keys(THEME_SPECS) as ThemeName[];

export function themeSpec(name: ThemeName): ThemeSpec {
  return THEME_SPECS[name] ?? THEME_SPECS.Madrid;
}

export const COLOR_THEME_NAMES: ColorThemeName[] = [
  'default',
  'albatross',
  'beaver',
  'beetle',
  'crane',
  'dolphin',
  'dove',
  'fly',
  'lily',
  'monarca',
  'orchid',
  'rose',
  'seagull',
  'seahorse',
  'sidebartab',
  'spruce',
  'structure',
  'whale',
  'wolverine',
];
