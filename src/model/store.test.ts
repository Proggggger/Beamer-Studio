import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankSlide, createEmptyDeck } from './defaults';
import { selectedSlide, useDeckStore } from './store';
import type { ListBlock } from './types';

function reset(): void {
  useDeckStore.getState().replaceDeck(createEmptyDeck());
  useDeckStore.getState().selectSlide(useDeckStore.getState().deck.slides[1].id);
}

function firstListId(): string {
  const slide = selectedSlide(useDeckStore.getState());
  if (!slide) throw new Error('no slide');
  const block = slide.body.find((entry): entry is ListBlock => entry.type === 'list');
  if (!block) throw new Error('no list');
  return block.id;
}

beforeEach(() => {
  vi.useRealTimers();
  reset();
});

describe('slide actions', () => {
  it('starts from an empty deck with two slides', () => {
    useDeckStore.getState().replaceDeck(createEmptyDeck());
    const state = useDeckStore.getState();
    expect(state.deck.slides).toHaveLength(2);
    expect(state.selectedSlideId).toBe(state.deck.slides[0].id);
  });

  it('adds a slide after the selected one and selects it', () => {
    const store = useDeckStore.getState();
    store.selectSlide(store.deck.slides[0].id);
    const before = useDeckStore.getState().deck.slides.map((slide) => slide.id);
    const id = useDeckStore.getState().addSlide('section');
    const after = useDeckStore.getState();
    expect(after.deck.slides).toHaveLength(3);
    expect(after.deck.slides[1].id).toBe(id);
    expect(after.deck.slides[0].id).toBe(before[0]);
    expect(after.selectedSlideId).toBe(id);
    expect(after.deck.slides[1].kind).toBe('section');
  });

  it('duplicates a slide with fresh block ids', () => {
    const store = useDeckStore.getState();
    const source = store.deck.slides[1];
    const id = store.duplicateSlide(source.id);
    const clone = useDeckStore.getState().deck.slides.find((slide) => slide.id === id);
    expect(clone).toBeDefined();
    expect(clone).not.toBe(source);
    expect(clone?.title).toBe(`${source.title} (copy)`);
    expect(clone?.body[0]).not.toBe(source.body[0]);
    expect(clone?.body[0].id).not.toBe(source.body[0].id);
  });

  it('refuses to delete the only slide', () => {
    const store = useDeckStore.getState();
    store.replaceDeck({ ...createEmptyDeck(), slides: [createBlankSlide('frame')] });
    const state = useDeckStore.getState();
    state.deleteSlide(state.deck.slides[0].id);
    expect(useDeckStore.getState().deck.slides).toHaveLength(1);
  });

  it('deletes a slide and keeps selection valid', () => {
    const store = useDeckStore.getState();
    const id = store.deck.slides[0].id;
    useDeckStore.getState().selectSlide(id);
    useDeckStore.getState().deleteSlide(id);
    const after = useDeckStore.getState();
    expect(after.deck.slides).toHaveLength(1);
    expect(after.deck.slides.some((slide) => slide.id === id)).toBe(false);
    expect(after.selectedSlideId).toBe(after.deck.slides[0].id);
  });

  it('moves a slide within bounds only', () => {
    const store = useDeckStore.getState();
    const [first, second] = store.deck.slides;
    store.moveSlide(first.id, 1);
    expect(useDeckStore.getState().deck.slides[0].id).toBe(second.id);
    useDeckStore.getState().moveSlide(first.id, 1);
    expect(useDeckStore.getState().deck.slides[0].id).toBe(second.id);
    expect(useDeckStore.getState().deck.slides[1].id).toBe(first.id);
  });

  it('updates slide metadata without touching the body', () => {
    const store = useDeckStore.getState();
    const id = store.deck.slides[1].id;
    store.updateSlide(id, { title: 'Renamed', subtitle: 'Sub' });
    const slide = useDeckStore.getState().deck.slides[1];
    expect(slide.title).toBe('Renamed');
    expect(slide.subtitle).toBe('Sub');
    expect(slide.body).toBe(store.deck.slides[1].body);
  });
});

describe('theme actions', () => {
  it('updates meta and toggles aspect', () => {
    const store = useDeckStore.getState();
    store.updateMeta({ title: 'Talks' });
    store.setAspect('43');
    const state = useDeckStore.getState();
    expect(state.deck.meta.title).toBe('Talks');
    expect(state.deck.aspect).toBe('43');
  });

  it('resets color theme and shadow when switching template', () => {
    useDeckStore.getState().setTemplate('Antibes');
    let theme = useDeckStore.getState().deck.theme;
    expect(theme.template).toBe('Antibes');
    expect(theme.colorTheme).toBe('whale');
    expect(theme.blockShadow).toBe(false);

    useDeckStore.getState().setTemplate('Madrid');
    theme = useDeckStore.getState().deck.theme;
    expect(theme.colorTheme).toBe('whale');
    expect(theme.blockShadow).toBe(true);
  });

  it('merges custom colors and can reset them', () => {
    useDeckStore.getState().updateCustom({ enabled: true, structure: '#123456' });
    let custom = useDeckStore.getState().deck.theme.custom;
    expect(custom.enabled).toBe(true);
    expect(custom.structure).toBe('#123456');
    useDeckStore.getState().resetCustom();
    custom = useDeckStore.getState().deck.theme.custom;
    expect(custom.enabled).toBe(false);
  });
});

describe('block and item actions', () => {
  it('appends a block to the selected frame and selects it', () => {
    const id = useDeckStore.getState().addBlock('math');
    const state = useDeckStore.getState();
    const slide = selectedSlide(state);
    expect(slide?.body.at(-1)?.id).toBe(id);
    expect(slide?.body.at(-1)?.type).toBe('math');
    expect(state.selectedBlockId).toBe(id);
    expect(state.rightTab).toBe('edit');
  });

  it('updates nested blocks in place', () => {
    const id = useDeckStore.getState().addBlock('paragraph');
    useDeckStore
      .getState()
      .updateBlock(id, (block) => (block.type === 'paragraph' ? { ...block, text: 'Hi' } : block));
    const slide = selectedSlide(useDeckStore.getState());
    const block = slide?.body.find((entry) => entry.id === id);
    expect(block?.type === 'paragraph' && block.text).toBe('Hi');
  });

  it('removes a block and clears its selection', () => {
    const id = useDeckStore.getState().addBlock('paragraph');
    useDeckStore.getState().removeBlock(id);
    const state = useDeckStore.getState();
    expect(selectedSlide(state)?.body.some((entry) => entry.id === id)).toBe(false);
    expect(state.selectedBlockId).toBeNull();
  });

  it('adds, edits, moves, indents and removes list items', () => {
    const listId = firstListId();
    const itemId = useDeckStore.getState().addItem(listId);
    useDeckStore.getState().updateItem(listId, itemId, { text: 'Edited' });
    useDeckStore.getState().setItemDepth(listId, itemId, 2);
    useDeckStore.getState().moveItem(listId, itemId, -1);

    let list = selectedSlide(useDeckStore.getState())?.body.find(
      (entry): entry is ListBlock => entry.type === 'list' && entry.id === listId,
    );
    expect(list?.items[0].id).toBe(itemId);
    expect(list?.items[0].text).toBe('Edited');
    expect(list?.items[0].depth).toBe(2);

    useDeckStore.getState().removeItem(listId, itemId);
    list = selectedSlide(useDeckStore.getState())?.body.find(
      (entry): entry is ListBlock => entry.type === 'list' && entry.id === listId,
    );
    expect(list?.items.some((item) => item.id === itemId)).toBe(false);
  });
});

describe('history', () => {
  it('undoes and redoes a change', () => {
    const store = useDeckStore.getState();
    store.updateMeta({ title: 'Before' });
    const before = useDeckStore.getState().deck;
    useDeckStore.getState().updateMeta({ title: 'After' });
    expect(useDeckStore.getState().deck.meta.title).toBe('After');

    useDeckStore.getState().undo();
    expect(useDeckStore.getState().deck).toBe(before);

    useDeckStore.getState().redo();
    expect(useDeckStore.getState().deck.meta.title).toBe('After');
  });

  it('coalesces rapid edits to the same field', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    useDeckStore.getState().updateMeta({ title: 'A' }, 'meta.title');
    useDeckStore.getState().updateMeta({ title: 'AB' }, 'meta.title');
    useDeckStore.getState().updateMeta({ title: 'ABC' }, 'meta.title');
    expect(useDeckStore.getState().past).toHaveLength(1);
    useDeckStore.getState().undo();
    expect(useDeckStore.getState().deck.meta.title).toBe('Untitled presentation');
  });

  it('creates separate history entries after the coalesce window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    useDeckStore.getState().updateMeta({ title: 'A' }, 'meta.title');
    vi.setSystemTime(20_000);
    useDeckStore.getState().updateMeta({ title: 'B' }, 'meta.title');
    expect(useDeckStore.getState().past).toHaveLength(2);
  });

  it('does nothing when history is empty', () => {
    const store = useDeckStore.getState();
    const deck = store.deck;
    store.undo();
    store.redo();
    expect(useDeckStore.getState().deck).toBe(deck);
  });

  it('drops a block selection that no longer exists after undo', () => {
    const id = useDeckStore.getState().addBlock('paragraph');
    useDeckStore.getState().selectBlock(id);
    useDeckStore.getState().undo();
    expect(useDeckStore.getState().selectedBlockId).toBeNull();
  });

  it('keeps a selection that still exists after undo', () => {
    const listId = firstListId();
    useDeckStore.getState().selectBlock(listId);
    useDeckStore.getState().updateMeta({ title: 'Next' });
    useDeckStore.getState().undo();
    expect(useDeckStore.getState().selectedBlockId).toBe(listId);
  });

  it('resets history when replacing a deck', () => {
    useDeckStore.getState().updateMeta({ title: 'Dirty' });
    useDeckStore.getState().replaceDeck(createEmptyDeck());
    const state = useDeckStore.getState();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.selectedBlockId).toBeNull();
  });
});
