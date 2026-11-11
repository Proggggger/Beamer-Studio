import { downloadText, slugify } from '../export/download';
import type { Deck } from './types';
import { parseDeck } from './validate';

export function downloadProject(deck: Deck): void {
  downloadText(
    `${slugify(deck.meta.title)}.beamer.json`,
    JSON.stringify(deck, null, 2),
    'application/json',
  );
}

export async function readProjectFile(file: File): Promise<Deck> {
  const text = await file.text();
  const parsed = parseDeck(JSON.parse(text));
  if (!parsed) throw new Error('Not a valid Beamer Editor project file.');
  return parsed;
}
