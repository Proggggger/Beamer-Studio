import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type ReactNode,
} from 'react';
import { blockLabel, findBlock } from '../model/blockOps';
import { CODE_LANGUAGES, codeLanguage } from '../model/code';
import { useDeckStore } from '../model/store';
import {
  addTableColumn,
  addTableRow,
  parseTablePaste,
  pasteTableCells,
  removeTableColumn,
  removeTableRow,
  setTableAlign,
  setTableCell,
  tableColumnCount,
} from '../model/table';
import type {
  Block,
  BlockColorOverrides,
  BlockTone,
  BlockType,
  Deck,
  DeckMeta,
  FontChoice,
  FontId,
  TableAlign,
} from '../model/types';
import { isHexColor } from '../themes/colorMath';
import { CUSTOM_FONT_ID, FONT_OPTIONS } from '../themes/fonts';
import { resolveTheme } from '../themes/resolve';
import { drawingSummary, emptyBlockDrawing } from '../tikz/drawing';
import { TikzSvg } from '../tikz/TikzSvg';
import { ColorField } from './ColorField';
import { readImageFile } from './imageFile';
import { ImageStackCard } from './ImageStackCard';
import { openTikzEditor } from './tikzEditorStore';

const BLOCK_TYPES: Array<{ type: BlockType; label: string }> = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'list', label: 'List' },
  { type: 'table', label: 'Table' },
  { type: 'block', label: 'Block' },
  { type: 'columns', label: 'Columns' },
  { type: 'image', label: 'Image' },
  { type: 'math', label: 'Math' },
  { type: 'code', label: 'Code' },
  { type: 'toc', label: 'Table of contents' },
  { type: 'tikz', label: 'TikZ drawing' },
];

const BLOCK_BADGES: Record<BlockType, string> = {
  paragraph: 'P',
  list: '•',
  table: '▦',
  block: '▣',
  columns: '⫼',
  image: '▧',
  math: '∑',
  code: '{}',
  toc: '☰',
  tikz: '◈',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

const FONT_GROUPS = [
  { label: 'TeX fonts', options: FONT_OPTIONS.filter((option) => option.source === 'tex') },
  {
    label: 'Windows system fonts',
    options: FONT_OPTIONS.filter((option) => option.source === 'system'),
  },
  { label: 'Web / Google fonts', options: FONT_OPTIONS.filter((option) => option.source === 'web') },
];

function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FontChoice | undefined;
  onChange: (next: FontChoice | undefined) => void;
}) {
  return (
    <>
      <Field label={label}>
        <select
          value={value?.family ?? ''}
          onChange={(event) => {
            const id = event.target.value;
            if (!id) {
              onChange(undefined);
            } else if (id === CUSTOM_FONT_ID) {
              onChange({ family: CUSTOM_FONT_ID, custom: value?.custom ?? '' });
            } else {
              onChange({ family: id as FontId });
            }
          }}
        >
          <option value="">Inherit from theme</option>
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM_FONT_ID}>Custom family…</option>
        </select>
      </Field>
      {value?.family === CUSTOM_FONT_ID ? (
        <Field label="Custom family name">
          <input
            value={value.custom ?? ''}
            placeholder="e.g. Bahnschrift"
            spellCheck={false}
            onChange={(event) =>
              onChange({ family: CUSTOM_FONT_ID, custom: event.target.value })
            }
          />
        </Field>
      ) : null}
    </>
  );
}

function AddBlock({
  containerId,
  side,
  hint,
}: {
  containerId: string | null;
  side?: 'left' | 'right';
  hint?: string;
}) {
  const [type, setType] = useState<BlockType>('list');
  const addBlock = useDeckStore((state) => state.addBlock);
  return (
    <div className="add-block">
      <select value={type} onChange={(event) => setType(event.target.value as BlockType)}>
        {BLOCK_TYPES.map((entry) => (
          <option key={entry.type} value={entry.type}>
            {entry.label}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-tiny" onClick={() => addBlock(type, containerId, side)}>
        {hint ?? '+ Add block'}
      </button>
    </div>
  );
}

function BlockTree({
  blocks,
  depth,
  selectedBlockId,
}: {
  blocks: Block[];
  depth: number;
  selectedBlockId: string | null;
}) {
  const selectBlock = useDeckStore((state) => state.selectBlock);
  const moveBlock = useDeckStore((state) => state.moveBlock);
  const removeBlock = useDeckStore((state) => state.removeBlock);
  return (
    <div className="block-tree">
      {blocks.map((block, index) => (
        <div key={block.id}>
          <div
            className={`block-row${block.id === selectedBlockId ? ' is-selected' : ''}`}
            style={{ marginLeft: depth * 10 }}
            onClick={() => selectBlock(block.id)}
          >
            <span className={`block-badge badge-${block.type}`}>{BLOCK_BADGES[block.type]}</span>
            <span className="block-row-label">{blockLabel(block)}</span>
            <span className="block-row-actions" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="icon-btn"
                title="Move up"
                disabled={index === 0}
                onClick={() => moveBlock(block.id, -1)}
              >
                &#9652;
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Move down"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(block.id, 1)}
              >
                &#9662;
              </button>
              <button
                type="button"
                className="icon-btn icon-btn-danger"
                title="Delete block"
                onClick={() => removeBlock(block.id)}
              >
                &#10005;
              </button>
            </span>
          </div>
          {block.type === 'block' ? (
            <>
              <div className="block-tree-label" style={{ marginLeft: (depth + 1) * 10 }}>
                Inside block
              </div>
              <BlockTree
                blocks={block.body}
                depth={depth + 1}
                selectedBlockId={selectedBlockId}
              />
              <div style={{ marginLeft: (depth + 1) * 10 }}>
                <AddBlock containerId={block.id} hint="+ Add inside" />
              </div>
            </>
          ) : null}
          {block.type === 'columns' ? (
            <>
              <div className="block-tree-label" style={{ marginLeft: (depth + 1) * 10 }}>
                Left column
              </div>
              <BlockTree
                blocks={block.left}
                depth={depth + 1}
                selectedBlockId={selectedBlockId}
              />
              <div style={{ marginLeft: (depth + 1) * 10 }}>
                <AddBlock containerId={block.id} side="left" hint="+ Add left" />
              </div>
              <div className="block-tree-label" style={{ marginLeft: (depth + 1) * 10 }}>
                Right column
              </div>
              <BlockTree
                blocks={block.right}
                depth={depth + 1}
                selectedBlockId={selectedBlockId}
              />
              <div style={{ marginLeft: (depth + 1) * 10 }}>
                <AddBlock containerId={block.id} side="right" hint="+ Add right" />
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ParagraphEditor({ block }: { block: Extract<Block, { type: 'paragraph' }> }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  return (
    <>
      <Field label="LaTeX text">
        <textarea
          rows={4}
          value={block.text}
          onChange={(event) =>
            updateBlock(
              block.id,
              (target) => (target.type === 'paragraph' ? { ...target, text: event.target.value } : target),
              `paragraph:${block.id}`,
            )
          }
        />
      </Field>
      <div className="segmented">
        <button
          type="button"
          className={!block.align || block.align === 'left' ? 'is-active' : ''}
          onClick={() =>
            updateBlock(block.id, (target) =>
              target.type === 'paragraph' ? { ...target, align: 'left' } : target,
            )
          }
        >
          Left
        </button>
        <button
          type="button"
          className={block.align === 'center' ? 'is-active' : ''}
          onClick={() =>
            updateBlock(block.id, (target) =>
              target.type === 'paragraph' ? { ...target, align: 'center' } : target,
            )
          }
        >
          Center
        </button>
        <button
          type="button"
          className={block.align === 'right' ? 'is-active' : ''}
          onClick={() =>
            updateBlock(block.id, (target) =>
              target.type === 'paragraph' ? { ...target, align: 'right' } : target,
            )
          }
        >
          Right
        </button>
      </div>
      <Field label={`First-line indent · ${block.indent ?? 0}em`}>
        <input
          type="range"
          min={0}
          max={4}
          step={0.25}
          value={block.indent ?? 0}
          onChange={(event) => {
            const indent = Number(event.target.value);
            updateBlock(
              block.id,
              (target) =>
                target.type === 'paragraph'
                  ? { ...target, indent: indent > 0 ? indent : undefined }
                  : target,
              `paragraph:${block.id}:indent`,
            );
          }}
        />
      </Field>
    </>
  );
}

function ListEditor({ block }: { block: Extract<Block, { type: 'list' }> }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const addItem = useDeckStore((state) => state.addItem);
  const updateItem = useDeckStore((state) => state.updateItem);
  const removeItem = useDeckStore((state) => state.removeItem);
  const moveItem = useDeckStore((state) => state.moveItem);
  const setItemDepth = useDeckStore((state) => state.setItemDepth);
  const selectedItemId = useDeckStore((state) => state.selectedItemId);
  const selectItem = useDeckStore((state) => state.selectItem);

  return (
    <>
      <label className="check-row">
        <input
          type="checkbox"
          checked={block.ordered}
          onChange={(event) =>
            updateBlock(block.id, (target) =>
              target.type === 'list' ? { ...target, ordered: event.target.checked } : target,
            )
          }
        />
        Numbered list
      </label>
      <div className="item-list">
        {block.items.map((item, index) => (
          <div
            key={item.id}
            className={`item-row${selectedItemId === item.id ? ' is-selected' : ''}`}
            onClick={() => selectItem(item.id)}
          >
            <button
              type="button"
              className="icon-btn"
              title="Outdent"
              disabled={item.depth === 0}
              onClick={() => setItemDepth(block.id, item.id, (item.depth - 1) as 0 | 1 | 2)}
            >
              &#8676;
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Indent"
              disabled={item.depth === 2}
              onClick={() => setItemDepth(block.id, item.id, (item.depth + 1) as 0 | 1 | 2)}
            >
              &#8677;
            </button>
            <input
              className="item-input"
              value={item.text}
              spellCheck={false}
              onChange={(event) =>
                updateItem(block.id, item.id, { text: event.target.value }, `item:${item.id}`)
              }
            />
            <button
              type="button"
              className={`icon-btn icon-btn-pause${item.pause ? ' is-active' : ''}`}
              title="Toggle \pause before this item"
              onClick={() => updateItem(block.id, item.id, { pause: !item.pause })}
            >
              &#10074;&#10074;
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Move up"
              disabled={index === 0}
              onClick={() => moveItem(block.id, item.id, -1)}
            >
              &#9652;
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Move down"
              disabled={index === block.items.length - 1}
              onClick={() => moveItem(block.id, item.id, 1)}
            >
              &#9662;
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              title="Delete item"
              onClick={() => removeItem(block.id, item.id)}
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-tiny" onClick={() => addItem(block.id)}>
        + Add item
      </button>
    </>
  );
}

function ImageEditor({ block }: { block: Extract<Block, { type: 'image' }> }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const result = await readImageFile(file);
      updateBlock(block.id, (target) =>
        target.type === 'image' ? { ...target, src: result.src, name: result.name } : target,
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not read that image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="image-preview">
        {block.src ? <img src={block.src} alt={block.name} /> : <span>No image attached</span>}
      </div>
      <div className="button-row">
        <button type="button" className="btn btn-tiny" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Reading…' : block.src ? 'Replace image' : 'Choose image'}
        </button>
        {block.src ? (
          <button
            type="button"
            className="btn btn-tiny btn-danger"
            onClick={() =>
              updateBlock(block.id, (target) =>
                target.type === 'image' ? { ...target, src: '' } : target,
              )
            }
          >
            Remove
          </button>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <Field label={`Width · ${block.widthPct}%`}>
        <input
          type="range"
          min={10}
          max={100}
          value={block.widthPct}
          onChange={(event) =>
            updateBlock(
              block.id,
              (target) =>
                target.type === 'image' ? { ...target, widthPct: Number(event.target.value) } : target,
              `image-width:${block.id}`,
            )
          }
        />
      </Field>
      <Field label="Caption">
        <input
          value={block.caption ?? ''}
          spellCheck={false}
          onChange={(event) =>
            updateBlock(
              block.id,
              (target) => (target.type === 'image' ? { ...target, caption: event.target.value } : target),
              `caption:${block.id}`,
            )
          }
        />
      </Field>
      <p className="muted small">
        Exports as <code>{block.name}</code>; download that file from the export dialog.
      </p>
    </>
  );
}

function BlockEditor({ block }: { block: Extract<Block, { type: 'block' }> }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const theme = useDeckStore((state) => state.deck.theme);
  const aspect = useDeckStore((state) => state.deck.aspect);
  const tone = TONES.find((entry) => entry.tone === block.tone) ?? TONES[0];

  const defaults = useMemo(() => {
    const { palette } = resolveTheme(theme, aspect);
    const swatches =
      block.tone === 'alert'
        ? { title: palette.blockTitleAlert, body: palette.blockBodyAlert }
        : block.tone === 'example'
          ? { title: palette.blockTitleExample, body: palette.blockBodyExample }
          : { title: palette.blockTitle, body: palette.blockBody };
    const pick = (value: string | undefined, fallback: string) =>
      isHexColor(value) ? value : fallback;
    return {
      titleBg: pick(swatches.title.bg, palette.bg),
      titleFg: pick(swatches.title.fg, palette.fg),
      bodyBg: pick(swatches.body.bg, palette.bg),
      bodyFg: pick(swatches.body.fg, palette.fg),
    };
  }, [theme, aspect, block.tone]);

  const setColor = (key: keyof BlockColorOverrides, value: string | undefined) =>
    updateBlock(
      block.id,
      (target) => {
        if (target.type !== 'block' || !target.colors) return target;
        const colors: BlockColorOverrides = { ...target.colors };
        if (value === undefined) delete colors[key];
        else colors[key] = value;
        return { ...target, colors };
      },
      `block-colors:${block.id}:${key}`,
    );

  return (
    <>
      <div className="segmented" role="group" aria-label="Block type">
        {TONES.map((entry) => (
          <button
            key={entry.tone}
            type="button"
            className={block.tone === entry.tone ? 'is-active' : ''}
            onClick={() =>
              updateBlock(block.id, (target) =>
                target.type === 'block' ? { ...target, tone: entry.tone } : target,
              )
            }
          >
            {entry.label}
          </button>
        ))}
      </div>
      <p className="muted small">
        {tone.description} Exports as <code>{`\\begin{${tone.env}}`}</code>.
      </p>
      <Field label="Block title">
        <input
          value={block.title}
          spellCheck={false}
          onChange={(event) =>
            updateBlock(
              block.id,
              (target) => (target.type === 'block' ? { ...target, title: event.target.value } : target),
              `block-title:${block.id}`,
            )
          }
        />
      </Field>
      <label className="check-row">
        <input
          type="checkbox"
          checked={block.colors !== undefined}
          onChange={(event) =>
            updateBlock(block.id, (target) =>
              target.type === 'block'
                ? { ...target, colors: event.target.checked ? {} : undefined }
                : target,
            )
          }
        />
        Override colors in a local group
      </label>
      {block.colors ? (
        <>
          <ColorField
            label="Title background"
            value={block.colors.titleBg}
            fallback={defaults.titleBg}
            onChange={(value) => setColor('titleBg', value)}
          />
          <ColorField
            label="Title text"
            value={block.colors.titleFg}
            fallback={defaults.titleFg}
            onChange={(value) => setColor('titleFg', value)}
          />
          <ColorField
            label="Body background"
            value={block.colors.bodyBg}
            fallback={defaults.bodyBg}
            onChange={(value) => setColor('bodyBg', value)}
          />
          <ColorField
            label="Body text"
            value={block.colors.bodyFg}
            fallback={defaults.bodyFg}
            onChange={(value) => setColor('bodyFg', value)}
          />
          <p className="muted small">
            Only the changed colors are emitted, inside <code>{'{ ... }'}</code> with{' '}
            <code>\setbeamercolor</code>.
          </p>
        </>
      ) : null}
    </>
  );
}

function TikzBlockEditor({ block }: { block: Extract<Block, { type: 'tikz' }> }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const patch = (value: Partial<Extract<Block, { type: 'tikz' }>>, key: string) =>
    updateBlock(
      block.id,
      (target) => (target.type === 'tikz' ? { ...target, ...value } : target),
      key,
    );

  return (
    <>
      <div
        className="tikz-panel-preview"
        style={{ aspectRatio: `${block.drawing.width} / ${block.drawing.height}` }}
      >
        <TikzSvg drawing={block.drawing} />
      </div>
      <div className="button-row">
        <button
          type="button"
          className="btn btn-tiny"
          onClick={() =>
            openTikzEditor('Edit TikZ drawing', block.drawing, (drawing) =>
              patch({ drawing }, `tikz:${block.id}`),
            )
          }
        >
          Edit drawing
        </button>
        <button
          type="button"
          className="btn btn-tiny btn-danger"
          onClick={() => patch({ drawing: emptyBlockDrawing() }, `tikz-clear:${block.id}`)}
        >
          Clear
        </button>
      </div>
      <Field label="Name">
        <input
          value={block.name}
          spellCheck={false}
          onChange={(event) => patch({ name: event.target.value }, `tikz-name:${block.id}`)}
        />
      </Field>
      <Field label={`Width · ${block.widthPct}%`}>
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          value={block.widthPct}
          onChange={(event) =>
            patch({ widthPct: Number(event.target.value) }, `tikz-width:${block.id}`)
          }
        />
      </Field>
      <Field label="Caption">
        <input
          value={block.caption ?? ''}
          spellCheck={false}
          onChange={(event) => patch({ caption: event.target.value }, `tikz-caption:${block.id}`)}
        />
      </Field>
      <p className="muted small">
        {drawingSummary(block.drawing)} · exports as a resized <code>tikzpicture</code>; double-click
        the drawing on the slide to edit it.
      </p>
    </>
  );
}

const TONES: Array<{ tone: BlockTone; label: string; env: string; description: string }> = [
  {
    tone: 'normal',
    label: 'Block',
    env: 'block',
    description:
      "Neutral, uses the theme's structure color — general content, definitions, or key points.",
  },
  {
    tone: 'alert',
    label: 'Alert',
    env: 'alertblock',
    description: 'Red or warning-style color — warnings, caveats, or important constraints.',
  },
  {
    tone: 'example',
    label: 'Example',
    env: 'exampleblock',
    description: 'Green or positive-style color — examples, illustrations, or worked cases.',
  },
];

function TableEditor({ block }: { block: Extract<Block, { type: 'table' }> }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const columns = tableColumnCount(block);
  const patch = (next: Extract<Block, { type: 'table' }>, key: string) =>
    updateBlock(block.id, (target) => (target.type === 'table' ? next : target), key);

  const updateCell = (row: number, column: number, text: string) =>
    patch(setTableCell(block, row, column, text), `table-cell:${block.id}:${row}:${column}`);

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, row: number, column: number) => {
    const matrix = parseTablePaste(event.clipboardData.getData('text/plain'));
    if (!matrix) return;
    event.preventDefault();
    patch(pasteTableCells(block, matrix, row, column), `table-paste:${block.id}`);
  };

  return (
    <>
      <div className="table-editor-scroll">
        <table className="table-edit-grid">
          <thead>
            <tr>
              <th className="table-edit-corner" aria-hidden />
              {block.align.map((align, column) => (
                <th key={column} className="table-edit-colhead">
                  <div className="table-col-tools">
                    <select
                      className="table-align-select"
                      value={align}
                      aria-label={`Column ${column + 1} alignment`}
                      title={`Column ${column + 1} alignment`}
                      onChange={(event) =>
                        patch(
                          setTableAlign(block, column, event.target.value as TableAlign),
                          `table-align:${block.id}:${column}`,
                        )
                      }
                    >
                      <option value="left">L</option>
                      <option value="center">C</option>
                      <option value="right">R</option>
                    </select>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      title="Delete column"
                      disabled={columns <= 1}
                      onClick={() =>
                        patch(removeTableColumn(block, column), `table-del-col:${block.id}`)
                      }
                    >
                      &#10005;
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={block.header && rowIndex === 0 ? 'is-header' : ''}>
                <th className="table-edit-rowhead">
                  <span className="table-row-number">{rowIndex + 1}</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    title="Delete row"
                    disabled={block.rows.length <= 1}
                    onClick={() =>
                      patch(removeTableRow(block, rowIndex), `table-del-row:${block.id}`)
                    }
                  >
                    &#10005;
                  </button>
                </th>
                {Array.from({ length: columns }, (_, column) => (
                  <td key={column}>
                    <input
                      value={row[column] ?? ''}
                      spellCheck={false}
                      aria-label={`Row ${rowIndex + 1}, column ${column + 1}`}
                      onChange={(event) => updateCell(rowIndex, column, event.target.value)}
                      onPaste={(event) => handlePaste(event, rowIndex, column)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-row">
        <button
          type="button"
          className="btn btn-tiny"
          onClick={() => patch(addTableRow(block), `table-add-row:${block.id}`)}
        >
          + Row
        </button>
        <button
          type="button"
          className="btn btn-tiny"
          onClick={() => patch(addTableColumn(block), `table-add-col:${block.id}`)}
        >
          + Column
        </button>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={block.header}
          onChange={(event) =>
            patch({ ...block, header: event.target.checked }, `table-header:${block.id}`)
          }
        />
        First row is a header
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={block.bordered === true}
          onChange={(event) =>
            patch({ ...block, bordered: event.target.checked }, `table-borders:${block.id}`)
          }
        />
        Full grid borders (instead of booktabs rules)
      </label>
      <Field label="Caption">
        <input
          value={block.caption ?? ''}
          spellCheck={false}
          onChange={(event) =>
            patch({ ...block, caption: event.target.value }, `table-caption:${block.id}`)
          }
        />
      </Field>
      <p className="muted small">
        {block.rows.length} rows × {columns} columns. Cells accept inline LaTeX; paste a
        tab-separated block from a spreadsheet into any cell to fill the grid at once. Bare{' '}
        <code>&amp;</code> and <code>%</code> are escaped in the export.
      </p>
    </>
  );
}

function SelectedBlockEditor({ block }: { block: Block }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  return (
    <section className="panel-section">
      <h3>
        <span className={`block-badge badge-${block.type}`}>{BLOCK_BADGES[block.type]}</span>
        {block.type === 'toc'
          ? 'Table of contents'
          : block.type === 'tikz'
            ? 'TikZ drawing'
            : block.type[0].toUpperCase() + block.type.slice(1)}
      </h3>
      {block.type === 'paragraph' ? <ParagraphEditor block={block} /> : null}
      {block.type === 'list' ? <ListEditor block={block} /> : null}
      {block.type === 'block' ? <BlockEditor block={block} /> : null}
      {block.type === 'columns' ? (
        <p className="muted small">
          Edit the contents of each column in the structure tree above, or add blocks to either side.
        </p>
      ) : null}
      {block.type === 'image' ? <ImageEditor block={block} /> : null}
      {block.type === 'math' ? (
        <Field label="TeX (display math)">
          <textarea
            rows={4}
            value={block.tex}
            spellCheck={false}
            onChange={(event) =>
              updateBlock(
                block.id,
                (target) => (target.type === 'math' ? { ...target, tex: event.target.value } : target),
                `math:${block.id}`,
              )
            }
          />
        </Field>
      ) : null}
      {block.type === 'table' ? <TableEditor block={block} /> : null}
      {block.type === 'code' ? (
        <>
          <Field label="Language">
            <select
              value={block.lang}
              onChange={(event) =>
                updateBlock(
                  block.id,
                  (target) => (target.type === 'code' ? { ...target, lang: event.target.value } : target),
                  `code-lang:${block.id}`,
                )
              }
            >
              {CODE_LANGUAGES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Code">
            <textarea
              rows={8}
              value={block.text}
              spellCheck={false}
              onChange={(event) =>
                updateBlock(
                  block.id,
                  (target) => (target.type === 'code' ? { ...target, text: event.target.value } : target),
                  `code:${block.id}`,
                )
              }
            />
          </Field>
          <label className="check-row">
            <input
              type="checkbox"
              checked={block.lineNumbers === true}
              onChange={(event) =>
                updateBlock(
                  block.id,
                  (target) =>
                    target.type === 'code'
                      ? { ...target, lineNumbers: event.target.checked }
                      : target,
                  `code-numbers:${block.id}`,
                )
              }
            />
            Line numbers
          </label>
          <Field label="Caption">
            <input
              value={block.caption ?? ''}
              spellCheck={false}
              onChange={(event) =>
                updateBlock(
                  block.id,
                  (target) =>
                    target.type === 'code' ? { ...target, caption: event.target.value } : target,
                  `code-caption:${block.id}`,
                )
              }
            />
          </Field>
          <p className="muted small">
            {codeLanguage(block.lang).dialect
              ? `Highlighted with listings (${codeLanguage(block.lang).dialect}).`
              : 'Printed in plain monospace; no listings dialect for this language.'}{' '}
            Frames with code compile as <code>[fragile]</code>.
          </p>
        </>
      ) : null}
      {block.type === 'toc' ? (
        <p className="muted small">
          Exports as <code>\tableofcontents</code> and lists every section slide in the deck.
        </p>
      ) : null}
      {block.type === 'tikz' ? <TikzBlockEditor block={block} /> : null}
      <div className="panel-subsection">
        <h4>Font override</h4>
        <FontPicker
          label="Block font"
          value={block.font}
          onChange={(font) =>
            updateBlock(
              block.id,
              (target) => ({ ...target, font }) as Block,
              `block-font:${block.id}`,
            )
          }
        />
        <p className="muted small">
          Applies to this block only; the export wraps it in a local font group.
        </p>
      </div>
    </section>
  );
}

function SlideEditor({ deck }: { deck: Deck }) {
  const selectedSlideId = useDeckStore((state) => state.selectedSlideId);
  const updateSlide = useDeckStore((state) => state.updateSlide);
  const setSlideLayout = useDeckStore((state) => state.setSlideLayout);
  const duplicateSlide = useDeckStore((state) => state.duplicateSlide);
  const deleteSlide = useDeckStore((state) => state.deleteSlide);
  const addBlock = useDeckStore((state) => state.addBlock);
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const selectedBlockId = useDeckStore((state) => state.selectedBlockId);
  const quickImageRef = useRef<HTMLInputElement>(null);
  const [readingQuickImage, setReadingQuickImage] = useState(false);
  const slide = deck.slides.find((entry) => entry.id === selectedSlideId);
  if (!slide) return <p className="muted">No slide selected.</p>;
  const block = findBlock(slide.body, selectedBlockId ?? '');

  const addQuickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReadingQuickImage(true);
    try {
      const result = await readImageFile(file);
      const id = addBlock('image');
      updateBlock(
        id,
        (target) =>
          target.type === 'image' ? { ...target, src: result.src, name: result.name } : target,
        `quick-image:${id}`,
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not read that image.');
    } finally {
      setReadingQuickImage(false);
    }
  };

  return (
    <>
      <section className="panel-section">
        <h3>Slide</h3>
        <Field label="Kind">
          <select
            value={slide.kind}
            onChange={(event) =>
              updateSlide(
                slide.id,
                { kind: event.target.value as 'title' | 'section' | 'frame' },
                `slide-kind:${slide.id}`,
              )
            }
          >
            <option value="title">Title page</option>
            <option value="section">Section page</option>
            <option value="frame">Content frame</option>
          </select>
        </Field>
        {slide.kind === 'title' ? (
          <p className="muted small">
            The title page is generated from the deck metadata below. Double-click its text on the
            canvas to edit it.
          </p>
        ) : null}
        {slide.kind !== 'title' ? (
          <Field label={slide.kind === 'section' ? 'Section title' : 'Frame title'}>
            <input
              value={slide.title}
              spellCheck={false}
              onChange={(event) =>
                updateSlide(slide.id, { title: event.target.value }, `slide-title:${slide.id}`)
              }
            />
          </Field>
        ) : null}
        {slide.kind === 'frame' ? (
          <>
            <Field label="Frame subtitle">
              <input
                value={slide.subtitle ?? ''}
                spellCheck={false}
                onChange={(event) =>
                  updateSlide(slide.id, { subtitle: event.target.value }, `slide-subtitle:${slide.id}`)
                }
              />
            </Field>
            <Field label="Content layout">
              <select
                value={slide.layout}
                onChange={(event) =>
                  setSlideLayout(slide.id, event.target.value as 'normal' | 'two-column')
                }
              >
                <option value="normal">Single column</option>
                <option value="two-column">Two columns</option>
              </select>
            </Field>
          </>
        ) : null}
        {slide.kind !== 'title' ? (
          <>
            <FontPicker
              label={slide.kind === 'section' ? 'Section font' : 'Content font'}
              value={slide.font}
              onChange={(font) => updateSlide(slide.id, { font }, `slide-font:${slide.id}`)}
            />
            <p className="muted small">
              Overrides the theme face for this slide&apos;s{' '}
              {slide.kind === 'section' ? 'section page' : 'body text'} only.
            </p>
          </>
        ) : null}
        <div className="button-row">
          <button type="button" className="btn btn-tiny" onClick={() => duplicateSlide(slide.id)}>
            Duplicate slide
          </button>
          <button
            type="button"
            className="btn btn-tiny btn-danger"
            disabled={deck.slides.length <= 1}
            onClick={() => {
              if (window.confirm('Delete this slide?')) deleteSlide(slide.id);
            }}
          >
            Delete slide
          </button>
        </div>
      </section>

      <ImageStackCard
        title="Slide images"
        hint="Positioned image layers drawn above this slide's content and template foregrounds. They apply to this slide only."
        layers={slide.images}
        prefix="fs"
        emptyLabel="No image layers on this slide yet."
        inherited={false}
        inheritedLabel=""
        onChange={(images) =>
          updateSlide(slide.id, { images }, `slide-images:${slide.id}`)
        }
      />

      {slide.kind === 'frame' ? (
        <>
          <section className="panel-section">
            <h3>Structure</h3>
            <BlockTree
              blocks={slide.body}
              depth={0}
              selectedBlockId={selectedBlockId}
            />
            {slide.body.length === 0 ? <p className="muted small">No blocks yet.</p> : null}
            <AddBlock containerId={null} />
            <div className="button-row">
              <button type="button" className="btn btn-tiny" onClick={() => addBlock('list')}>
                + Quick list
              </button>
              <button type="button" className="btn btn-tiny" onClick={() => addBlock('paragraph')}>
                + Quick paragraph
              </button>
              <button type="button" className="btn btn-tiny" onClick={() => addBlock('code')}>
                + Quick code
              </button>
              <button type="button" className="btn btn-tiny" onClick={() => addBlock('table')}>
                + Quick table
              </button>
              <button
                type="button"
                className="btn btn-tiny"
                disabled={readingQuickImage}
                onClick={() => quickImageRef.current?.click()}
              >
                {readingQuickImage ? 'Reading…' : '+ Quick image'}
              </button>
            </div>
            <input
              ref={quickImageRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void addQuickImage(event)}
            />
          </section>
          {block ? <SelectedBlockEditor block={block} /> : null}
        </>
      ) : null}

      <DeckFields />
    </>
  );
}

function DeckFields() {
  const deck = useDeckStore((state) => state.deck);
  const updateMeta = useDeckStore((state) => state.updateMeta);
  const fields: Array<[keyof DeckMeta, string]> = [
    ['title', 'Presentation title'],
    ['subtitle', 'Subtitle'],
    ['author', 'Author'],
    ['institute', 'Institute'],
    ['date', 'Date'],
  ];
  return (
    <section className="panel-section">
      <h3>Deck metadata</h3>
      {fields.map(([field, label]) => (
        <Field key={field} label={label}>
          <input
            value={deck.meta[field]}
            spellCheck={false}
            onChange={(event) => updateMeta({ [field]: event.target.value }, `meta:${field}`)}
          />
        </Field>
      ))}
    </section>
  );
}

export function Inspector() {
  const deck = useDeckStore((state) => state.deck);
  return (
    <div className="inspector">
      <SlideEditor deck={deck} />
    </div>
  );
}
