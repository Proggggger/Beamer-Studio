import type { Deck } from './types';
import { parseDeck } from './validate';

export const STORAGE_KEY = 'beamer-editor.deck.v1';

export function loadDeck(): Deck | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDeck(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDeck(deck: Deck): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  } catch {
    // Storage can be full or disabled; autosave is best effort.
  }
}
