export type Aspect = '169' | '43';
export type SlideKind = 'title' | 'section' | 'frame';
export type SlideLayout = 'normal' | 'two-column';

export type ThemeName =
  | 'default'
  | 'boxes'
  | 'AnnArbor'
  | 'Antibes'
  | 'Bergen'
  | 'Berkeley'
  | 'Berlin'
  | 'Boadilla'
  | 'CambridgeUS'
  | 'Copenhagen'
  | 'Darmstadt'
  | 'Dresden'
  | 'EastLansing'
  | 'Frankfurt'
  | 'Goettingen'
  | 'Hannover'
  | 'Ilmenau'
  | 'JuanLesPins'
  | 'Luebeck'
  | 'Madrid'
  | 'Malmoe'
  | 'Marburg'
  | 'Montpellier'
  | 'PaloAlto'
  | 'Pittsburgh'
  | 'Rochester'
  | 'Singapore'
  | 'Szeged'
  | 'Warsaw';

export type ColorThemeName =
  | 'default'
  | 'albatross'
  | 'beaver'
  | 'beetle'
  | 'crane'
  | 'dolphin'
  | 'dove'
  | 'fly'
  | 'lily'
  | 'monarca'
  | 'orchid'
  | 'rose'
  | 'seagull'
  | 'seahorse'
  | 'sidebartab'
  | 'spruce'
  | 'structure'
  | 'whale'
  | 'wolverine';

export type BulletShape = 'ball' | 'triangle' | 'circle' | 'square';
export type BlockShape = 'rectangle' | 'rounded';

export type FontId =
  | 'latin-modern-sans'
  | 'latin-modern-roman'
  | 'tex-gyre-heros'
  | 'tex-gyre-pagella'
  | 'tex-gyre-termes'
  | 'tex-gyre-bonum'
  | 'tex-gyre-schola'
  | 'tex-gyre-adventor'
  | 'libertinus-sans'
  | 'libertinus-serif'
  | 'eb-garamond'
  | 'fira-sans'
  | 'source-sans-pro'
  | 'dejavu-sans'
  | 'dejavu-serif'
  | 'noto-sans'
  | 'noto-serif'
  | 'arial'
  | 'calibri'
  | 'segoe-ui'
  | 'verdana'
  | 'tahoma'
  | 'trebuchet-ms'
  | 'times-new-roman'
  | 'georgia'
  | 'cambria'
  | 'palatino-linotype'
  | 'inter'
  | 'roboto'
  | 'open-sans'
  | 'lato'
  | 'montserrat'
  | 'source-serif-pro'
  | 'custom';

export type LanguageId =
  | 'english'
  | 'german'
  | 'french'
  | 'spanish'
  | 'italian'
  | 'portuguese'
  | 'dutch'
  | 'swedish'
  | 'norsk'
  | 'danish'
  | 'finnish'
  | 'icelandic'
  | 'polish'
  | 'czech'
  | 'slovak'
  | 'magyar'
  | 'romanian'
  | 'catalan'
  | 'croatian'
  | 'turkish'
  | 'latin'
  | 'estonian'
  | 'latvian'
  | 'lithuanian'
  | 'greek'
  | 'russian'
  | 'ukrainian'
  | 'bulgarian';

export type FontSizePt = 8 | 9 | 10 | 11 | 12 | 14 | 17 | 20;

/** Settings that affect the generated XeLaTeX document as a whole. */
export interface DocumentSettings {
  mainLanguage: LanguageId;
  otherLanguages: LanguageId[];
  fontSize: FontSizePt;
}

export interface CustomColors {
  enabled: boolean;
  structure?: string;
  primaryBar?: string;
  background?: string;
  foreground?: string;
  alert?: string;
}

export interface ThemeSettings {
  template: ThemeName;
  colorTheme: ColorThemeName;
  custom: CustomColors;
  fontFamily: FontId;
  /** family name typed by the user when fontFamily is 'custom' */
  customFont: string;
  fontScale: number;
  bulletShape: 'theme' | BulletShape;
  blockShape: 'theme' | BlockShape;
  blockShadow: boolean;
  navigationSymbols: boolean;
}

export interface DeckMeta {
  title: string;
  subtitle: string;
  author: string;
  institute: string;
  date: string;
}

export interface Item {
  id: string;
  text: string;
  depth: 0 | 1 | 2;
  pause?: boolean;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  text: string;
  align?: 'left' | 'center' | 'right';
  /** First-line indent in em, matching `\hspace*{...}` in the export. */
  indent?: number;
}

export interface ListBlock {
  id: string;
  type: 'list';
  ordered: boolean;
  items: Item[];
}

export type BlockTone = 'normal' | 'alert' | 'example';

export interface BlockColorOverrides {
  titleBg?: string;
  titleFg?: string;
  bodyBg?: string;
  bodyFg?: string;
}

export interface BlockBlock {
  id: string;
  type: 'block';
  tone: BlockTone;
  title: string;
  body: Block[];
  /** Local overrides, exported inside a LaTeX group with the block. */
  colors?: BlockColorOverrides;
}

export interface ColumnsBlock {
  id: string;
  type: 'columns';
  left: Block[];
  right: Block[];
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
  name: string;
  widthPct: number;
  caption?: string;
}

export interface MathBlock {
  id: string;
  type: 'math';
  tex: string;
}

export interface CodeBlock {
  id: string;
  type: 'code';
  lang: string;
  text: string;
}

export interface TocBlock {
  id: string;
  type: 'toc';
}

export type Block =
  | ParagraphBlock
  | ListBlock
  | BlockBlock
  | ColumnsBlock
  | ImageBlock
  | MathBlock
  | CodeBlock
  | TocBlock;

export type BlockType = Block['type'];

export interface Slide {
  id: string;
  kind: SlideKind;
  title: string;
  subtitle?: string;
  layout: SlideLayout;
  body: Block[];
}

export interface Deck {
  version: 1;
  meta: DeckMeta;
  aspect: Aspect;
  theme: ThemeSettings;
  document: DocumentSettings;
  slides: Slide[];
}

export interface ExportImage {
  name: string;
  dataUrl: string;
}
