import type { TableAlign, TableBlock } from './types';

export const TABLE_ALIGNMENTS: TableAlign[] = ['left', 'center', 'right'];
export const TABLE_MAX_ROWS = 40;
export const TABLE_MAX_COLUMNS = 12;
export const TABLE_MAX_CELL = 500;

export function isTableAlign(value: unknown): value is TableAlign {
  return value === 'left' || value === 'center' || value === 'right';
}

export function tableColumnCount(block: TableBlock): number {
  return Math.max(1, block.align.length);
}

function emptyRow(columns: number): string[] {
  return Array.from({ length: columns }, () => '');
}

/** Keeps every row exactly as wide as the alignment list. */
export function normalizeTableRows(rows: string[][], columns: number): string[][] {
  return rows.map((row) => Array.from({ length: columns }, (_, index) => row[index] ?? ''));
}

export function setTableCell(
  block: TableBlock,
  rowIndex: number,
  columnIndex: number,
  text: string,
): TableBlock {
  return {
    ...block,
    rows: block.rows.map((row, index) =>
      index === rowIndex
        ? row.map((cell, cellIndex) => (cellIndex === columnIndex ? text : cell))
        : row,
    ),
  };
}

export function setTableAlign(
  block: TableBlock,
  columnIndex: number,
  align: TableAlign,
): TableBlock {
  return {
    ...block,
    align: block.align.map((entry, index) => (index === columnIndex ? align : entry)),
  };
}

export function addTableRow(block: TableBlock): TableBlock {
  if (block.rows.length >= TABLE_MAX_ROWS) return block;
  return { ...block, rows: [...block.rows, emptyRow(tableColumnCount(block))] };
}

export function removeTableRow(block: TableBlock, rowIndex: number): TableBlock {
  if (block.rows.length <= 1) return block;
  return { ...block, rows: block.rows.filter((_, index) => index !== rowIndex) };
}

export function addTableColumn(block: TableBlock): TableBlock {
  if (block.align.length >= TABLE_MAX_COLUMNS) return block;
  return {
    ...block,
    align: [...block.align, 'left'],
    rows: block.rows.map((row) => [...row, '']),
  };
}

export function removeTableColumn(block: TableBlock, columnIndex: number): TableBlock {
  if (block.align.length <= 1) return block;
  return {
    ...block,
    align: block.align.filter((_, index) => index !== columnIndex),
    rows: block.rows.map((row) => row.filter((_, index) => index !== columnIndex)),
  };
}

/**
 * Spreadsheet paste: a tab/newline separated matrix anchored at a cell. The
 * table grows as needed, up to the model limits, and existing cells survive.
 */
export function parseTablePaste(text: string): string[][] | null {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (!normalized.includes('\t') && !normalized.includes('\n')) return null;
  const matrix = normalized
    .split('\n')
    .map((line) => line.split('\t').map((cell) => cell.trim().slice(0, TABLE_MAX_CELL)));
  return matrix.length > 0 ? matrix : null;
}

export function pasteTableCells(
  block: TableBlock,
  matrix: string[][],
  rowIndex: number,
  columnIndex: number,
): TableBlock {
  if (matrix.length === 0) return block;
  const matrixColumns = Math.max(...matrix.map((row) => row.length));
  const rows = Math.min(TABLE_MAX_ROWS, Math.max(block.rows.length, rowIndex + matrix.length));
  const columns = Math.min(
    TABLE_MAX_COLUMNS,
    Math.max(block.align.length, columnIndex + matrixColumns),
  );
  const align: TableAlign[] = Array.from(
    { length: columns },
    (_, index) => block.align[index] ?? 'left',
  );
  const nextRows = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      if (row < rowIndex || column < columnIndex) return block.rows[row]?.[column] ?? '';
      const pasted = matrix[row - rowIndex]?.[column - columnIndex];
      return pasted ?? block.rows[row]?.[column] ?? '';
    }),
  );
  return { ...block, align, rows: nextRows };
}
