import { describe, expect, it } from 'vitest';
import {
  addTableColumn,
  addTableRow,
  normalizeTableRows,
  parseTablePaste,
  pasteTableCells,
  removeTableColumn,
  removeTableRow,
  setTableAlign,
  setTableCell,
  tableColumnCount,
  TABLE_MAX_CELL,
  TABLE_MAX_COLUMNS,
  TABLE_MAX_ROWS,
} from './table';
import type { TableBlock } from './types';

function table(patch: Partial<TableBlock> = {}): TableBlock {
  return {
    id: 't',
    type: 'table',
    rows: [
      ['A', 'B'],
      ['1', '2'],
    ],
    align: ['left', 'center'],
    header: true,
    ...patch,
  };
}

describe('table helpers', () => {
  it('derives the column count from the alignment list', () => {
    expect(tableColumnCount(table())).toBe(2);
    expect(tableColumnCount(table({ align: [] }))).toBe(1);
  });

  it('pads short rows to the column count', () => {
    expect(normalizeTableRows([['a'], ['b', 'c', 'd']], 2)).toEqual([
      ['a', ''],
      ['b', 'c'],
    ]);
  });

  it('updates a single cell without touching its neighbours', () => {
    const next = setTableCell(table(), 1, 1, '2.5');
    expect(next.rows).toEqual([
      ['A', 'B'],
      ['1', '2.5'],
    ]);
    expect(next.align).toEqual(['left', 'center']);
  });

  it('updates one column alignment', () => {
    expect(setTableAlign(table(), 0, 'right').align).toEqual(['right', 'center']);
  });

  it('adds and removes rows while keeping at least one', () => {
    const added = addTableRow(table());
    expect(added.rows).toHaveLength(3);
    expect(added.rows[2]).toEqual(['', '']);
    expect(removeTableRow(added, 0).rows).toEqual([
      ['1', '2'],
      ['', ''],
    ]);
    expect(removeTableRow(table({ rows: [['only']] }), 0).rows).toEqual([['only']]);
  });

  it('adds and removes columns in every row', () => {
    const added = addTableColumn(table());
    expect(added.align).toEqual(['left', 'center', 'left']);
    expect(added.rows).toEqual([
      ['A', 'B', ''],
      ['1', '2', ''],
    ]);
    expect(removeTableColumn(added, 1).rows).toEqual([
      ['A', ''],
      ['1', ''],
    ]);
    expect(removeTableColumn(table({ align: ['left'] }), 0).align).toEqual(['left']);
  });

  it('caps rows and columns at the model limits', () => {
    const wide = table({
      rows: [Array.from({ length: TABLE_MAX_COLUMNS }, (_, index) => String(index))],
      align: Array.from({ length: TABLE_MAX_COLUMNS }, () => 'left' as const),
    });
    expect(addTableColumn(wide)).toBe(wide);
    const tall = table({
      rows: Array.from({ length: TABLE_MAX_ROWS }, () => ['a', 'b']),
    });
    expect(addTableRow(tall)).toBe(tall);
  });
});

describe('table paste', () => {
  it('ignores plain single-cell text', () => {
    expect(parseTablePaste('hello')).toBeNull();
    expect(parseTablePaste('')).toBeNull();
  });

  it('parses a spreadsheet matrix and normalizes CRLF', () => {
    expect(parseTablePaste('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseTablePaste('one\ntwo')).toEqual([['one'], ['two']]);
  });

  it('clips a pasted cell to the maximum cell length', () => {
    const matrix = parseTablePaste(`${'x'.repeat(TABLE_MAX_CELL + 20)}\t2`);
    expect(matrix?.[0][0]).toHaveLength(TABLE_MAX_CELL);
  });

  it('grows the table around the anchor and keeps existing cells', () => {
    const next = pasteTableCells(table(), [
      ['x', 'y'],
      ['z', 'w'],
    ], 0, 1);
    expect(next.align).toHaveLength(3);
    expect(next.rows).toEqual([
      ['A', 'x', 'y'],
      ['1', 'z', 'w'],
    ]);
  });

  it('pastes into an existing rectangle without dropping neighbours', () => {
    const next = pasteTableCells(table(), [['Q']], 1, 0);
    expect(next.rows).toEqual([
      ['A', 'B'],
      ['Q', '2'],
    ]);
  });
});
