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
