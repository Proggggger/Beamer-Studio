import { describe, expect, it } from 'vitest';
import { createEmptyDeck } from './defaults';
import type { Block, Deck } from './types';
import { parseDeck } from './validate';

function flatTwoColumnDeck(body: Block[]): Deck {
  const deck = createEmptyDeck();
  deck.slides[1] = { ...deck.slides[1], layout: 'two-column', body };
  return JSON.parse(JSON.stringify(deck)) as Deck;
}

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
