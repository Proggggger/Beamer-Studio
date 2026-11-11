import { uid } from './ids';
import type { Block, Deck, DeckMeta, DocumentSettings, Slide, ThemeSettings } from './types';

export const DEFAULT_META: DeckMeta = {
  title: 'Untitled presentation',
  subtitle: 'A subtitle',
  author: 'Ada Lovelace',
  institute: 'Analytical Engine',
  date: '1843',
};

export const DEFAULT_THEME: ThemeSettings = {
  template: 'Madrid',
  colorTheme: 'whale',
  custom: { enabled: false },
  fontFamily: 'latin-modern-sans',
  customFont: '',
  fontScale: 1,
  bulletShape: 'theme',
  blockShape: 'theme',
  blockShadow: true,
  navigationSymbols: true,
};

export const DEFAULT_DOCUMENT: DocumentSettings = {
  mainLanguage: 'english',
  otherLanguages: [],
  fontSize: 11,
  scriptFont: 'auto',
};

function titleSlide(): Slide {
  return { id: uid('slide'), kind: 'title', title: '', layout: 'normal', body: [] };
}

function sectionSlide(title: string): Slide {
  return { id: uid('slide'), kind: 'section', title, layout: 'normal', body: [] };
}

function frameSlide(title: string, body: Block[]): Slide {
  return { id: uid('slide'), kind: 'frame', title, layout: 'normal', body };
}

function list(texts: Array<{ text: string; depth?: 0 | 1 | 2 }>): Block {
  return {
    id: uid('block'),
    type: 'list',
    ordered: false,
    items: texts.map((entry) => ({ id: uid('item'), text: entry.text, depth: entry.depth ?? 0 })),
  };
}

export function createEmptyDeck(): Deck {
  return {
    version: 1,
    meta: { ...DEFAULT_META },
    aspect: '169',
    theme: { ...DEFAULT_THEME, custom: { ...DEFAULT_THEME.custom } },
    document: { ...DEFAULT_DOCUMENT, otherLanguages: [...DEFAULT_DOCUMENT.otherLanguages] },
    slides: [titleSlide(), frameSlide('New frame', [list([{ text: 'Start writing here' }])])],
  };
}

export function createSampleDeck(): Deck {
  const fidelity: Block = {
    id: uid('block'),
    type: 'block',
    tone: 'normal',
    title: 'Faithful preview',
    body: [
      {
        id: uid('block'),
        type: 'paragraph',
        text: 'The page mirrors Beamer chrome, palette colors, bullets and block shapes.',
      },
    ],
  };
  const exportBlock: Block = {
    id: uid('block'),
    type: 'block',
    tone: 'alert',
    title: 'Clean export',
    body: [
      {
        id: uid('block'),
        type: 'paragraph',
        text: 'The generated .tex file is ordinary Beamer and compiles with XeLaTeX.',
      },
    ],
  };

  return {
    version: 1,
    meta: {
      title: 'Beamer Editor',
      subtitle: 'A WYSIWYG LaTeX presentation editor',
      author: 'Ada Lovelace',
      institute: 'Analytical Engine',
      date: '1843',
    },
    aspect: '169',
    theme: { ...DEFAULT_THEME, custom: { ...DEFAULT_THEME.custom } },
    document: { ...DEFAULT_DOCUMENT, otherLanguages: [...DEFAULT_DOCUMENT.otherLanguages] },
    slides: [
      titleSlide(),
      frameSlide(
        'Welcome',
        [
          list([
            { text: 'Pick a template in the Design panel, then tune its colors and fonts' },
            { text: 'Add title, section and content slides from the left rail' },
            { text: 'Indent a line with the item controls to make a sub-bullet', depth: 1 },
            { text: 'Double-click any text on the slide to edit it in place' },
            { text: 'Export a Beamer .tex file and compile it anywhere' },
          ]),
        ],
      ),
      sectionSlide('Customization'),
      frameSlide('Blocks, math and columns', [
        {
          id: uid('block'),
          type: 'columns',
          left: [fidelity],
          right: [exportBlock],
        },
        {
          id: uid('block'),
          type: 'math',
          tex: 'e^{i\\pi} + 1 = 0',
        },
        {
          id: uid('block'),
          type: 'paragraph',
          text: 'Everything on this page is editable, including $\\alpha^2 + \\beta^2$ inline math.',
          align: 'center',
        },
      ]),
      frameSlide('Make it yours', [
        list([
          { text: 'All 29 stock Beamer themes and 19 color themes are available' },
          { text: 'Accent, chrome, background and text colors can be overridden' },
          { text: 'Switch between 16:9 and 4:3 at deck level', depth: 1 },
          { text: 'Save the project as JSON and reopen it later' },
        ]),
      ]),
    ],
  };
}

export function createBlankSlide(kind: Slide['kind']): Slide {
  if (kind === 'title') return titleSlide();
  if (kind === 'section') return sectionSlide('New section');
  return frameSlide('New frame', [list([{ text: 'Start writing here' }])]);
}

export const GALLERY_SLIDE: Slide = {
  id: 'gallery',
  kind: 'frame',
  title: 'Title',
  layout: 'normal',
  body: [
    {
      id: 'gallery-list',
      type: 'list',
      ordered: false,
      items: [
        { id: 'gallery-item-1', text: 'First point', depth: 0 },
        { id: 'gallery-item-2', text: 'Second point', depth: 0 },
      ],
    },
  ],
};

/** Color themes mostly differ in block/bar colors, so color swatches preview a block. */
export const COLOR_GALLERY_SLIDE: Slide = {
  id: 'color-gallery',
  kind: 'frame',
  title: 'Frame',
  layout: 'normal',
  body: [
    {
      id: 'color-gallery-block',
      type: 'block',
      tone: 'normal',
      title: 'Block',
      body: [{ id: 'color-gallery-text', type: 'paragraph', text: 'Text' }],
    },
    {
      id: 'color-gallery-list',
      type: 'list',
      ordered: false,
      items: [
        { id: 'color-gallery-item-1', text: 'Item', depth: 0 },
        { id: 'color-gallery-item-2', text: 'Item', depth: 0 },
      ],
    },
  ],
};
