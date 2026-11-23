import { create } from 'zustand';
import { themeSpec } from '../themes/beamerThemes';
import {
  appendBlock,
  cloneBlocks,
  createBlock,
  findBlock,
  flattenColumns,
  moveBlock,
  moveItem,
  removeBlock,
  updateBlock,
  updateList,
  wrapInColumns,
} from './blockOps';
import { createBlankSlide, createEmptyDeck, createSampleDeck } from './defaults';
import { uid } from './ids';
import { loadDeck } from './persistence';
import type {
  Aspect,
  Block,
  BlockType,
  ColorThemeName,
  CustomColors,
  Deck,
  DeckMeta,
  DocumentSettings,
  Item,
  Slide,
  SlideKind,
  SlideLayout,
  ThemeName,
  ThemeSettings,
} from './types';

export type RightTab = 'design' | 'edit';
export type DesignTab = 'template' | 'colors' | 'layout' | 'images';

export const HISTORY_LIMIT = 120;
const COALESCE_MS = 600;

interface DeckStore {
  deck: Deck;
  selectedSlideId: string;
  selectedBlockId: string | null;
  selectedItemId: string | null;
  rightTab: RightTab;
  designTab: DesignTab;
  showExport: boolean;
  showImport: boolean;
  past: Deck[];
  future: Deck[];
  lastKey: string | null;
  lastTime: number;

  selectSlide: (id: string) => void;
  selectBlock: (id: string | null) => void;
  selectItem: (id: string | null) => void;
  setRightTab: (tab: RightTab) => void;
  setDesignTab: (tab: DesignTab) => void;
  setShowExport: (open: boolean) => void;
  setShowImport: (open: boolean) => void;

  updateMeta: (patch: Partial<DeckMeta>, key?: string) => void;
  updateDocument: (patch: Partial<DocumentSettings>, key?: string) => void;
  updateTheme: (patch: Partial<ThemeSettings>, key?: string) => void;
  setAspect: (aspect: Aspect) => void;
  setTemplate: (template: ThemeName) => void;
  setColorTheme: (colorTheme: ColorThemeName) => void;
  updateCustom: (patch: Partial<CustomColors>, key?: string) => void;
  resetCustom: () => void;

  addSlide: (kind: SlideKind) => string;
  duplicateSlide: (id: string) => string;
  deleteSlide: (id: string) => void;
  moveSlide: (id: string, direction: -1 | 1) => void;
  updateSlide: (id: string, patch: Partial<Omit<Slide, 'id' | 'body'>>, key?: string) => void;
  setSlideLayout: (id: string, layout: SlideLayout) => void;

  addBlock: (type: BlockType, containerId?: string | null, side?: 'left' | 'right') => string;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: -1 | 1) => void;
  updateBlock: (id: string, update: (block: Block) => Block, key?: string) => void;

  addItem: (listId: string) => string;
  updateItem: (listId: string, itemId: string, patch: Partial<Item>, key?: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  moveItem: (listId: string, itemId: string, direction: -1 | 1) => void;
  setItemDepth: (listId: string, itemId: string, depth: 0 | 1 | 2) => void;

  undo: () => void;
  redo: () => void;
  replaceDeck: (deck: Deck) => void;
  newDeck: () => void;
  loadSampleDeck: () => void;
}

function firstSlideId(deck: Deck): string {
  return deck.slides[0]?.id ?? '';
}

function blockBelongsTo(slide: Slide | undefined, blockId: string | null): boolean {
  return Boolean(slide && blockId && findBlock(slide.body, blockId));
}

const startingDeck = loadDeck() ?? createSampleDeck();

export const useDeckStore = create<DeckStore>((set, get) => {
  const commit = (update: (deck: Deck) => Deck, key?: string): void => {
    const state = get();
    const deck = update(state.deck);
    if (deck === state.deck) return;
    const now = Date.now();
    const coalesce =
      key !== undefined && state.lastKey === key && now - state.lastTime < COALESCE_MS;
    set({
      deck,
      past: coalesce ? state.past : [...state.past.slice(-(HISTORY_LIMIT - 1)), state.deck],
      future: [],
      lastKey: key ?? null,
      lastTime: now,
    });
  };

  const updateSelectedSlide = (update: (slide: Slide) => Slide, key?: string): void => {
    const { selectedSlideId } = get();
    commit(
      (deck) => ({
        ...deck,
        slides: deck.slides.map((slide) => (slide.id === selectedSlideId ? update(slide) : slide)),
      }),
      key,
    );
  };

  return {
    deck: startingDeck,
    selectedSlideId: firstSlideId(startingDeck),
    selectedBlockId: null,
    selectedItemId: null,
    rightTab: 'design',
    designTab: 'template',
    showExport: false,
    showImport: false,
    past: [],
    future: [],
    lastKey: null,
    lastTime: 0,

    selectSlide: (id) =>
      set({ selectedSlideId: id, selectedBlockId: null, selectedItemId: null }),
    selectBlock: (id) =>
      set({
        selectedBlockId: id,
        selectedItemId: null,
        rightTab: id ? 'edit' : get().rightTab,
      }),
    selectItem: (id) => set({ selectedItemId: id }),
    setRightTab: (tab) => set({ rightTab: tab }),
    setDesignTab: (tab) => set({ designTab: tab }),
    setShowExport: (open) => set({ showExport: open }),
    setShowImport: (open) => set({ showImport: open }),

    updateMeta: (patch, key) =>
      commit((deck) => ({ ...deck, meta: { ...deck.meta, ...patch } }), key),

    updateDocument: (patch, key) =>
      commit((deck) => ({ ...deck, document: { ...deck.document, ...patch } }), key),

    updateTheme: (patch, key) =>
      commit((deck) => ({ ...deck, theme: { ...deck.theme, ...patch } }), key),

    setAspect: (aspect) => commit((deck) => ({ ...deck, aspect })),

    setTemplate: (template) => {
      const spec = themeSpec(template);
      commit((deck) => ({
        ...deck,
        theme: {
          ...deck.theme,
          template,
          colorTheme: spec.colorThemes[0],
          blockShadow: spec.shadow,
        },
      }));
    },

    setColorTheme: (colorTheme) =>
      commit((deck) => ({ ...deck, theme: { ...deck.theme, colorTheme } })),

    updateCustom: (patch, key) =>
      commit(
        (deck) => ({
          ...deck,
          theme: { ...deck.theme, custom: { ...deck.theme.custom, ...patch } },
        }),
        key,
      ),

    resetCustom: () =>
      commit((deck) => ({ ...deck, theme: { ...deck.theme, custom: { enabled: false } } })),

    addSlide: (kind) => {
      const state = get();
      const slide = createBlankSlide(kind);
      const index = state.deck.slides.findIndex((entry) => entry.id === state.selectedSlideId);
      const at = index >= 0 ? index + 1 : state.deck.slides.length;
      commit((deck) => ({
        ...deck,
        slides: [...deck.slides.slice(0, at), slide, ...deck.slides.slice(at)],
      }));
      set({
        selectedSlideId: slide.id,
        selectedBlockId: null,
        selectedItemId: null,
        rightTab: 'edit',
      });
      return slide.id;
    },

    duplicateSlide: (id) => {
      const state = get();
      const source = state.deck.slides.find((slide) => slide.id === id);
      if (!source) return id;
      const clone: Slide = {
        ...source,
        id: uid('slide'),
        title: source.title ? `${source.title} (copy)` : source.title,
        body: cloneBlocks(source.body),
      };
      const index = state.deck.slides.findIndex((slide) => slide.id === id);
      commit((deck) => ({
        ...deck,
        slides: [
          ...deck.slides.slice(0, index + 1),
          clone,
          ...deck.slides.slice(index + 1),
        ],
      }));
      set({ selectedSlideId: clone.id, selectedBlockId: null, selectedItemId: null });
      return clone.id;
    },

    deleteSlide: (id) => {
      const state = get();
      if (state.deck.slides.length <= 1) return;
      const index = state.deck.slides.findIndex((slide) => slide.id === id);
      if (index < 0) return;
      const slides = state.deck.slides.filter((slide) => slide.id !== id);
      commit((deck) => ({ ...deck, slides }));
      const selectedSlideId =
        state.selectedSlideId === id
          ? slides[Math.min(index, slides.length - 1)].id
          : state.selectedSlideId;
      set({ selectedSlideId, selectedBlockId: null, selectedItemId: null });
    },

    moveSlide: (id, direction) => {
      const slides = get().deck.slides.slice();
      const index = slides.findIndex((slide) => slide.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= slides.length) return;
      const moved = slides[index];
      slides[index] = slides[target];
      slides[target] = moved;
      commit((deck) => ({ ...deck, slides }));
    },

    updateSlide: (id, patch, key) =>
      commit(
        (deck) => ({
          ...deck,
          slides: deck.slides.map((slide) =>
            slide.id === id ? { ...slide, ...patch } : slide,
          ),
        }),
        key,
      ),

    setSlideLayout: (id, layout) =>
      commit((deck) => ({
        ...deck,
        slides: deck.slides.map((slide) => {
          if (slide.id !== id || slide.layout === layout || slide.kind !== 'frame') return slide;
          return {
            ...slide,
            layout,
            body: layout === 'two-column' ? wrapInColumns(slide.body) : flattenColumns(slide.body),
          };
        }),
      })),

    addBlock: (type, containerId = null, side = 'left') => {
      const state = get();
      const block = createBlock(type);
      commit((deck) => ({
        ...deck,
        slides: deck.slides.map((slide) =>
          slide.id === state.selectedSlideId && slide.kind === 'frame'
            ? { ...slide, body: appendBlock(slide.body, containerId, side, block) }
            : slide,
        ),
      }));
      set({ selectedBlockId: block.id, selectedItemId: null, rightTab: 'edit' });
      return block.id;
    },

    removeBlock: (id) => {
      updateSelectedSlide((slide) => ({ ...slide, body: removeBlock(slide.body, id) }));
      set((state) => (state.selectedBlockId === id ? { selectedBlockId: null } : {}));
    },

    moveBlock: (id, direction) =>
      updateSelectedSlide((slide) => ({ ...slide, body: moveBlock(slide.body, id, direction) })),

    updateBlock: (id, update, key) =>
      updateSelectedSlide((slide) => ({ ...slide, body: updateBlock(slide.body, id, update) }), key),

    addItem: (listId) => {
      const item: Item = { id: uid('item'), text: 'New item', depth: 0 };
      updateSelectedSlide((slide) => ({
        ...slide,
        body: updateList(slide.body, listId, (list) => ({ ...list, items: [...list.items, item] })),
      }));
      set({ selectedItemId: item.id });
      return item.id;
    },

    updateItem: (listId, itemId, patch, key) =>
      updateSelectedSlide(
        (slide) => ({
          ...slide,
          body: updateList(slide.body, listId, (list) => ({
            ...list,
            items: list.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
          })),
        }),
        key,
      ),

    removeItem: (listId, itemId) => {
      updateSelectedSlide((slide) => ({
        ...slide,
        body: updateList(slide.body, listId, (list) => ({
          ...list,
          items: list.items.filter((item) => item.id !== itemId),
        })),
      }));
      set((state) => (state.selectedItemId === itemId ? { selectedItemId: null } : {}));
    },

    moveItem: (listId, itemId, direction) =>
      updateSelectedSlide((slide) => ({
        ...slide,
        body: updateList(slide.body, listId, (list) => ({
          ...list,
          items: moveItem(list.items, itemId, direction),
        })),
      })),

    setItemDepth: (listId, itemId, depth) =>
      updateSelectedSlide((slide) => ({
        ...slide,
        body: updateList(slide.body, listId, (list) => ({
          ...list,
          items: list.items.map((item) => (item.id === itemId ? { ...item, depth } : item)),
        })),
      })),

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      const slide = previous.slides.find((entry) => entry.id === state.selectedSlideId);
      const selectedSlideId = slide ? slide.id : firstSlideId(previous);
      const stayingSlide = previous.slides.find((entry) => entry.id === selectedSlideId);
      set({
        deck: previous,
        past: state.past.slice(0, -1),
        future: [state.deck, ...state.future].slice(0, HISTORY_LIMIT),
        lastKey: null,
        lastTime: 0,
        selectedSlideId,
        selectedBlockId: blockBelongsTo(stayingSlide, state.selectedBlockId)
          ? state.selectedBlockId
          : null,
        selectedItemId: null,
      });
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      const next = state.future[0];
      const slide = next.slides.find((entry) => entry.id === state.selectedSlideId);
      const selectedSlideId = slide ? slide.id : firstSlideId(next);
      const stayingSlide = next.slides.find((entry) => entry.id === selectedSlideId);
      set({
        deck: next,
        past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.deck],
        future: state.future.slice(1),
        lastKey: null,
        lastTime: 0,
        selectedSlideId,
        selectedBlockId: blockBelongsTo(stayingSlide, state.selectedBlockId)
          ? state.selectedBlockId
          : null,
        selectedItemId: null,
      });
    },

    replaceDeck: (deck) =>
      set({
        deck,
        selectedSlideId: firstSlideId(deck),
        selectedBlockId: null,
        selectedItemId: null,
        past: [],
        future: [],
        lastKey: null,
        lastTime: 0,
        showExport: false,
        showImport: false,
      }),

    newDeck: () => {
      const deck = createEmptyDeck();
      set({
        deck,
        selectedSlideId: firstSlideId(deck),
        selectedBlockId: null,
        selectedItemId: null,
        past: [],
        future: [],
        lastKey: null,
        lastTime: 0,
      });
    },

    loadSampleDeck: () => {
      const deck = createSampleDeck();
      set({
        deck,
        selectedSlideId: firstSlideId(deck),
        selectedBlockId: null,
        selectedItemId: null,
        past: [],
        future: [],
        lastKey: null,
        lastTime: 0,
      });
    },
  };
});

export function selectedSlide(state: DeckStore): Slide | undefined {
  return state.deck.slides.find((slide) => slide.id === state.selectedSlideId);
}
