import { describe, expect, it } from 'vitest';
import { createEmptyDeck } from './defaults';
import type { Block, Deck } from './types';
import { parseDeck } from './validate';

function flatTwoColumnDeck(body: Block[]): Deck {
  const deck = createEmptyDeck();
  deck.slides[1] = { ...deck.slides[1], layout: 'two-column', body };
  return JSON.parse(JSON.stringify(deck)) as Deck;
}

describe('parseDeck block colors', () => {
  function deckWithColors(colors: unknown): unknown {
    const raw = JSON.parse(JSON.stringify(createEmptyDeck())) as {
      slides: Array<{ body: unknown[] }>;
    };
    raw.slides[1].body = [
      { id: 'b1', type: 'block', tone: 'alert', title: 'T', body: [], colors },
    ];
    return raw;
  }

  it('normalizes valid hex channels and drops invalid ones', () => {
    const parsed = parseDeck(
      deckWithColors({ titleBg: '#ABC', titleFg: 'nope', bodyFg: '#112233' }),
    );
    const block = parsed?.slides[1].body[0];
    if (block?.type !== 'block') throw new Error('expected block');
    expect(block.colors).toEqual({ titleBg: '#aabbcc', bodyFg: '#112233' });
  });

  it('omits the override object when no channel is valid', () => {
    const parsed = parseDeck(deckWithColors({ titleBg: 'red', bodyFg: '#12345' }));
    const block = parsed?.slides[1].body[0];
    if (block?.type !== 'block') throw new Error('expected block');
    expect(block.colors).toBeUndefined();
  });
});

describe('parseDeck document settings', () => {
  function legacy(theme: unknown, extra: Record<string, unknown> = {}): unknown {
    const raw = JSON.parse(JSON.stringify(createEmptyDeck())) as Record<string, unknown>;
    delete raw.document;
    raw.theme = { ...(raw.theme as object), ...(theme as object) };
    return { ...raw, ...extra };
  }

  it('fills document settings on decks saved before XeLaTeX support', () => {
    const parsed = parseDeck(legacy({ fontFamily: 'sans' }));
    expect(parsed?.document).toEqual({
      mainLanguage: 'english',
      otherLanguages: [],
      fontSize: 11,
      scriptFont: 'auto',
    });
  });

  it('maps the legacy font family values onto the font catalog', () => {
    expect(parseDeck(legacy({ fontFamily: 'serif' }))?.theme.fontFamily).toBe('latin-modern-roman');
    expect(parseDeck(legacy({ fontFamily: 'sans' }))?.theme.fontFamily).toBe('latin-modern-sans');
    expect(parseDeck(legacy({ fontFamily: 'tex-gyre-pagella' }))?.theme.fontFamily).toBe(
      'tex-gyre-pagella',
    );
  });

  it('keeps the custom font id and sanitizes the family name', () => {
    const parsed = parseDeck(
      legacy({ fontFamily: 'custom', customFont: 'Bahnschrift}\\lets{x}{' }),
    );
    expect(parsed?.theme.fontFamily).toBe('custom');
    expect(parsed?.theme.customFont).toBe('Bahnschrift lets x');
  });

  it('dedupes additional languages, drops the main one and rejects unknown ids', () => {
    const parsed = parseDeck(
      legacy(
        {},
        {
          document: {
            mainLanguage: 'russian',
            otherLanguages: ['english', 'english', 'russian', 'klingon', 'greek'],
            fontSize: 14,
          },
        },
      ),
    );
    expect(parsed?.document).toEqual({
      mainLanguage: 'russian',
      otherLanguages: ['english', 'greek'],
      fontSize: 14,
      scriptFont: 'auto',
    });
  });

  it('falls back to 11pt for an unsupported font size', () => {
    const parsed = parseDeck(legacy({}, { document: { fontSize: 13 } }));
    expect(parsed?.document.fontSize).toBe(11);
  });

  it('accepts only catalog font ids or auto for the script font', () => {
    expect(
      parseDeck(legacy({}, { document: { scriptFont: 'segoe-ui' } }))?.document.scriptFont,
    ).toBe('segoe-ui');
    expect(parseDeck(legacy({}, { document: { scriptFont: 'custom' } }))?.document.scriptFont).toBe(
      'auto',
    );
    expect(parseDeck(legacy({}, { document: { scriptFont: 'nonsense' } }))?.document.scriptFont).toBe(
      'auto',
    );
  });
});

describe('parseDeck backgrounds', () => {
  function withBackgrounds(backgrounds: unknown): unknown {
    const raw = JSON.parse(JSON.stringify(createEmptyDeck())) as Record<string, unknown>;
    raw.theme = { ...(raw.theme as object), backgrounds };
    return raw;
  }

  const src = 'data:image/png;base64,AAAA';

  it('fills empty slots for decks saved before backgrounds existed', () => {
    expect(parseDeck(createEmptyDeck())?.theme.backgrounds).toEqual({
      all: [],
      title: [],
      section: [],
    });
  });

  it('migrates a legacy single image into a one-layer stack', () => {
    const parsed = parseDeck(
      withBackgrounds({
        all: {
          src,
          name: ' hero.png ',
          opacity: 240,
          scale: 2,
          mode: 'stretch',
          position: 'bottom-right',
        },
      }),
    );
    expect(parsed?.theme.backgrounds.all).toEqual([
      {
        id: 'bg-all-0',
        src,
        name: 'hero.png',
        opacity: 100,
        scale: 5,
        mode: 'stretch',
        position: 'bottom-right',
        offsetX: 0,
        offsetY: 0,
      },
    ]);
    expect(parsed?.theme.backgrounds.title).toEqual([]);
  });

  it('keeps layer order and clamps offsets', () => {
    const parsed = parseDeck(
      withBackgrounds({
        all: [
          { id: 'back', src, name: 'backdrop.png', offsetX: 80, offsetY: -80 },
          { src, name: 'logo.png', offsetX: 12.6, offsetY: -4.4 },
        ],
      }),
    );
    const layers = parsed?.theme.backgrounds.all ?? [];
    expect(layers.map((layer) => layer.name)).toEqual(['backdrop.png', 'logo.png']);
    expect(layers[0]).toMatchObject({ id: 'back', offsetX: 50, offsetY: -50 });
    expect(layers[1]).toMatchObject({ id: 'bg-all-1', offsetX: 13, offsetY: -4 });
  });

  it('falls back to defaults for unknown enums and scrubs the name', () => {
    const parsed = parseDeck(
      withBackgrounds({
        section: { src, name: 'bad\\name{}', opacity: -4, mode: 'zoom', position: 'middle' },
      }),
    );
    expect(parsed?.theme.backgrounds.section).toEqual([
      {
        id: 'bg-section-0',
        src,
        name: 'badname',
        opacity: 0,
        scale: 100,
        mode: 'scale',
        position: 'center',
        offsetX: 0,
        offsetY: 0,
      },
    ]);
  });

  it('drops slots without an embedded image', () => {
    const parsed = parseDeck(
      withBackgrounds({
        all: { src: 'https://example.com/bg.png', name: 'remote' },
        title: { src: '', name: 'empty' },
      }),
    );
    expect(parsed?.theme.backgrounds.all).toEqual([]);
    expect(parsed?.theme.backgrounds.title).toEqual([]);
  });
});

describe('parseDeck two-column migration', () => {
  it('moves a flat two-column body into a columns container split in half', () => {
    const parsed = parseDeck(
      flatTwoColumnDeck([
        { id: 'p1', type: 'paragraph', text: 'A' },
        { id: 'p2', type: 'paragraph', text: 'B' },
        { id: 'p3', type: 'paragraph', text: 'C' },
      ]),
    );
    expect(parsed).not.toBeNull();
    const body = parsed?.slides[1].body ?? [];
    expect(body).toHaveLength(1);
    const columns = body[0];
    expect(columns.type).toBe('columns');
    if (columns.type !== 'columns') throw new Error('expected columns');
    expect(columns.left.map((block) => block.id)).toEqual(['p1', 'p2']);
    expect(columns.right.map((block) => block.id)).toEqual(['p3']);
  });

  it('leaves an existing columns container alone on later loads', () => {
    const once = parseDeck(
      flatTwoColumnDeck([
        { id: 'p1', type: 'paragraph', text: 'A' },
        { id: 'p2', type: 'paragraph', text: 'B' },
      ]),
    );
    const twice = parseDeck(JSON.parse(JSON.stringify(once)));
    const body = twice?.slides[1].body ?? [];
    expect(body).toHaveLength(1);
    expect(body[0].type).toBe('columns');
    expect(body[0].id).toBe(once?.slides[1].body[0].id);
  });
});
