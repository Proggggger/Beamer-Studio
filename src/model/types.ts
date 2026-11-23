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

/** Per-slide or per-block font override; omitted means inherit the theme face. */
export interface FontChoice {
  family: FontId;
  /** Family name typed by the user when family is 'custom'. */
  custom?: string;
}

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
  /** Face used for Greek/Cyrillic text; 'auto' follows the main font when it has the glyphs. */
  scriptFont: FontId | 'auto';
}

export type BackgroundPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type BackgroundSizeMode = 'scale' | 'fit' | 'stretch';

export interface TikzPoint {
  x: number;
  y: number;
}

export type TikzShapeKind = 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'path';

/**
 * One primitive in a TikZ picture. Coordinates are millimetres in editor
 * space (y grows down); the exporter flips y for TikZ's y-up axes.
 */
export interface TikzShape {
  id: string;
  kind: TikzShapeKind;
  x: number;
  y: number;
  /** End point of line/arrow and the opposite corner of rect/ellipse. */
  x2?: number;
  y2?: number;
  /** Polyline for kind 'path', already including start and end. */
  points?: TikzPoint[];
  text?: string;
  /** Text size in millimetres (1mm = 2.845pt in the export). */
  fontSize?: number;
  /** Text colour for a label attached to a shape; defaults to black. */
  textColor?: string;
  /** Clockwise rotation in degrees. */
  rotation?: number;
  /** Hex stroke colour; 'none' draws no outline. */
  stroke?: string;
  /** Hex fill colour; omitted means no fill. */
  fill?: string;
  /** Outline width in millimetres. */
  strokeWidth?: number;
  /** Rect only: rounded-corner radius in millimetres. */
  cornerRadius?: number;
  /** Paint opacity, 0–100; omitted means fully opaque. */
  strokeOpacity?: number;
  fillOpacity?: number;
  textOpacity?: number;
  dashed?: boolean;
  /** Path only: close the polyline with `-- cycle`. */
  closed?: boolean;
  /** Path only: add an arrow tip at the end. */
  arrow?: boolean;
}

export interface TikzDrawing {
  /** Drawing canvas size in millimetres. */
  width: number;
  height: number;
  shapes: TikzShape[];
  /**
   * Authoritative source typed in code mode. Canvas edits overwrite it with
   * generated code, so preview and export always agree.
   */
  code?: string;
}

export interface BackgroundImageSettings {
  id: string;
  /** 'tikz' layers carry a drawing instead of an uploaded image. */
  kind?: 'image' | 'tikz';
  /** Data URL of the uploaded image; empty for TikZ layers. */
  src: string;
  name: string;
  /** 0–100, where 100 is fully opaque. */
  opacity: number;
  mode: BackgroundSizeMode;
  /** Width as a percentage of the page when mode is 'scale'. */
  scale: number;
  position: BackgroundPosition;
  /** Fine placement offset from the anchor, in percent of the page. */
  offsetX: number;
  offsetY: number;
  /** Clockwise rotation in degrees around the anchor, -180 to 180. */
  rotation: number;
  drawing?: TikzDrawing;
}

/**
 * Ordered image stacks drawn back to front, used for both background and
 * foreground layers. Empty title/section lists inherit the shared stack; on
 * 'all' an empty list means no layer.
 */
export interface SlideImageStacks {
  all: BackgroundImageSettings[];
  title: BackgroundImageSettings[];
  section: BackgroundImageSettings[];
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
  /** Background images drawn behind every slide, with optional title/section overrides. */
  backgrounds: SlideImageStacks;
  /** Foreground images drawn above the slide content, with the same slot overrides. */
  foregrounds: SlideImageStacks;
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
  font?: FontChoice;
}

export interface ListBlock {
  id: string;
  type: 'list';
  ordered: boolean;
  items: Item[];
  font?: FontChoice;
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
  font?: FontChoice;
}

export interface ColumnsBlock {
  id: string;
  type: 'columns';
  left: Block[];
  right: Block[];
  font?: FontChoice;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
  name: string;
  widthPct: number;
  caption?: string;
  font?: FontChoice;
}

export interface MathBlock {
  id: string;
  type: 'math';
  tex: string;
  font?: FontChoice;
}

export interface CodeBlock {
  id: string;
  type: 'code';
  /** Id from the code-language catalog, e.g. 'python' or 'text'. */
  lang: string;
  text: string;
  /** Listing caption shown below the code; omit for no caption. */
  caption?: string;
  /** Print line numbers in the margin. */
  lineNumbers?: boolean;
  font?: FontChoice;
}

export type TableAlign = 'left' | 'center' | 'right';

export interface TableBlock {
  id: string;
  type: 'table';
  /** Row-major cell text; each row has one cell per column. */
  rows: string[][];
  /** One alignment per column; its length is the column count. */
  align: TableAlign[];
  /** Render and export the first row as a header. */
  header: boolean;
  /** Draw a full grid instead of booktabs horizontal rules. */
  bordered?: boolean;
  caption?: string;
  font?: FontChoice;
}

export interface TocBlock {
  id: string;
  type: 'toc';
  font?: FontChoice;
}

export interface TikzBlock {
  id: string;
  type: 'tikz';
  name: string;
  widthPct: number;
  caption?: string;
  drawing: TikzDrawing;
  font?: FontChoice;
}

export type Block =
  | ParagraphBlock
  | ListBlock
  | BlockBlock
  | ColumnsBlock
  | ImageBlock
  | MathBlock
  | CodeBlock
  | TableBlock
  | TocBlock
  | TikzBlock;

export type BlockType = Block['type'];

export interface Slide {
  id: string;
  kind: SlideKind;
  title: string;
  subtitle?: string;
  layout: SlideLayout;
  body: Block[];
  /** Positioned image layers drawn above this slide only, on top of template foregrounds. */
  images: BackgroundImageSettings[];
  /** Body/section text font for this slide; omitted means inherit the theme face. */
  font?: FontChoice;
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
