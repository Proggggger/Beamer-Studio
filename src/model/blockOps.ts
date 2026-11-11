import { uid } from './ids';
import type { Block, BlockType, Item, ListBlock } from './types';

export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'paragraph':
      return { id: uid('block'), type, text: 'New paragraph', align: 'left' };
    case 'list':
      return {
        id: uid('block'),
        type,
        ordered: false,
        items: [{ id: uid('item'), text: 'New item', depth: 0 }],
      };
    case 'block':
      return {
        id: uid('block'),
        type,
        tone: 'normal',
        title: 'Block title',
        body: [{ id: uid('block'), type: 'paragraph', text: 'Block body', align: 'left' }],
      };
    case 'columns':
      return {
        id: uid('block'),
        type,
        left: [{ id: uid('block'), type: 'paragraph', text: 'Left column', align: 'left' }],
        right: [{ id: uid('block'), type: 'paragraph', text: 'Right column', align: 'left' }],
      };
    case 'image':
      return { id: uid('block'), type, src: '', name: 'image.png', widthPct: 70, caption: '' };
    case 'math':
      return { id: uid('block'), type, tex: 'E = mc^2' };
    case 'code':
      return { id: uid('block'), type, lang: 'python', text: 'print("Hello, Beamer!")' };
    case 'toc':
      return { id: uid('block'), type };
  }
}

export function findBlock(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type === 'block') {
      const found = findBlock(block.body, id);
      if (found) return found;
    } else if (block.type === 'columns') {
      const found = findBlock(block.left, id) ?? findBlock(block.right, id);
      if (found) return found;
    }
  }
  return null;
}

export function walkBlocks(blocks: Block[], visit: (block: Block) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.type === 'block') {
      walkBlocks(block.body, visit);
    } else if (block.type === 'columns') {
      walkBlocks(block.left, visit);
      walkBlocks(block.right, visit);
    }
  }
}

export function updateBlock(blocks: Block[], id: string, update: (block: Block) => Block): Block[] {
  let changed = false;
  const next = blocks.map((block) => {
    if (block.id === id) {
      changed = true;
      return update(block);
    }
    if (block.type === 'block') {
      const body = updateBlock(block.body, id, update);
      if (body !== block.body) {
        changed = true;
        return { ...block, body };
      }
    } else if (block.type === 'columns') {
      const left = updateBlock(block.left, id, update);
      const right = updateBlock(block.right, id, update);
      if (left !== block.left || right !== block.right) {
        changed = true;
        return { ...block, left, right };
      }
    }
    return block;
  });
  return changed ? next : blocks;
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index >= 0) {
    return [...blocks.slice(0, index), ...blocks.slice(index + 1)];
  }
  let changed = false;
  const next = blocks.map((block) => {
    if (block.type === 'block') {
      const body = removeBlock(block.body, id);
      if (body !== block.body) {
        changed = true;
        return { ...block, body };
      }
    } else if (block.type === 'columns') {
      const left = removeBlock(block.left, id);
      const right = removeBlock(block.right, id);
      if (left !== block.left || right !== block.right) {
        changed = true;
        return { ...block, left, right };
      }
    }
    return block;
  });
  return changed ? next : blocks;
}

export function moveBlock(blocks: Block[], id: string, direction: -1 | 1): Block[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return blocks;
    const copy = blocks.slice();
    const moved = copy[index];
    copy[index] = copy[target];
    copy[target] = moved;
    return copy;
  }
  let changed = false;
  const next = blocks.map((block) => {
    if (block.type === 'block') {
      const body = moveBlock(block.body, id, direction);
      if (body !== block.body) {
        changed = true;
        return { ...block, body };
      }
    } else if (block.type === 'columns') {
      const left = moveBlock(block.left, id, direction);
      const right = moveBlock(block.right, id, direction);
      if (left !== block.left || right !== block.right) {
        changed = true;
        return { ...block, left, right };
      }
    }
    return block;
  });
  return changed ? next : blocks;
}

/** Two-column slide layouts are stored as one real columns container, so each
    side owns its own block list instead of splitting a flat body in half. */
export function wrapInColumns(blocks: Block[]): Block[] {
  if (blocks.length === 1 && blocks[0].type === 'columns') return blocks;
  const split = Math.ceil(blocks.length / 2);
  return [
    {
      id: uid('block'),
      type: 'columns',
      left: blocks.slice(0, split),
      right: blocks.slice(split),
    },
  ];
}

export function flattenColumns(blocks: Block[]): Block[] {
  return blocks.length === 1 && blocks[0].type === 'columns'
    ? [...blocks[0].left, ...blocks[0].right]
    : blocks;
}

export function appendBlock(
  blocks: Block[],
  containerId: string | null,
  side: 'left' | 'right',
  block: Block,
): Block[] {
  if (!containerId) return [...blocks, block];
  const container = findBlock(blocks, containerId);
  if (!container || (container.type !== 'block' && container.type !== 'columns')) {
    return [...blocks, block];
  }
  return updateBlock(blocks, containerId, (target) => {
    if (target.type === 'block') return { ...target, body: [...target.body, block] };
    if (target.type === 'columns') {
      return side === 'right'
        ? { ...target, right: [...target.right, block] }
        : { ...target, left: [...target.left, block] };
    }
    return target;
  });
}

export function updateList(
  blocks: Block[],
  listId: string,
  update: (list: ListBlock) => ListBlock,
): Block[] {
  return updateBlock(blocks, listId, (block) => (block.type === 'list' ? update(block) : block));
}

export function moveItem(items: Item[], id: string, direction: -1 | 1): Item[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = items.slice();
  const moved = copy[index];
  copy[index] = copy[target];
  copy[target] = moved;
  return copy;
}

export function cloneBlock(block: Block): Block {
  const id = uid('block');
  switch (block.type) {
    case 'list':
      return { ...block, id, items: block.items.map((item) => ({ ...item, id: uid('item') })) };
    case 'block':
      return { ...block, id, body: cloneBlocks(block.body) };
    case 'columns':
      return { ...block, id, left: cloneBlocks(block.left), right: cloneBlocks(block.right) };
    case 'paragraph':
    case 'image':
    case 'math':
    case 'code':
    case 'toc':
      return { ...block, id };
  }
}

export function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map(cloneBlock);
}

export function blockLabel(block: Block): string {
  switch (block.type) {
    case 'paragraph':
      return block.text.trim() || 'Empty paragraph';
    case 'list':
      return `${block.items.length} list item${block.items.length === 1 ? '' : 's'}`;
    case 'block':
      return block.title || 'Untitled block';
    case 'columns':
      return 'Two columns';
    case 'image':
      return block.name || 'Image';
    case 'math':
      return block.tex || 'Math';
    case 'code':
      return `${block.lang || 'text'} code`;
    case 'toc':
      return 'Table of contents';
  }
}
