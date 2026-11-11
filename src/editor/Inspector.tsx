import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { blockLabel, findBlock } from '../model/blockOps';
import { useDeckStore } from '../model/store';
import type { Block, BlockType, Deck, DeckMeta } from '../model/types';
import { readImageFile } from './imageFile';

const BLOCK_TYPES: Array<{ type: BlockType; label: string }> = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'list', label: 'List' },
  { type: 'block', label: 'Block' },
  { type: 'columns', label: 'Columns' },
  { type: 'image', label: 'Image' },
  { type: 'math', label: 'Math' },
  { type: 'code', label: 'Code' },
  { type: 'toc', label: 'Table of contents' },
];

const BLOCK_BADGES: Record<BlockType, string> = {
  paragraph: 'P',
  list: '•',
  block: '▣',
  columns: '⫼',
  image: '▧',
  math: '∑',
  code: '{}',
  toc: '☰',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
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

function SelectedBlockEditor({ block }: { block: Block }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  return (
    <section className="panel-section">
      <h3>
        <span className={`block-badge badge-${block.type}`}>{BLOCK_BADGES[block.type]}</span>
        {block.type === 'toc' ? 'Table of contents' : block.type[0].toUpperCase() + block.type.slice(1)}
      </h3>
      {block.type === 'paragraph' ? <ParagraphEditor block={block} /> : null}
      {block.type === 'list' ? <ListEditor block={block} /> : null}
      {block.type === 'block' ? (
        <>
          <Field label="Tone">
            <select
              value={block.tone}
              onChange={(event) =>
                updateBlock(block.id, (target) =>
                  target.type === 'block'
                    ? { ...target, tone: event.target.value as 'normal' | 'alert' | 'example' }
                    : target,
                )
              }
            >
              <option value="normal">Block</option>
              <option value="alert">Alert block</option>
              <option value="example">Example block</option>
            </select>
          </Field>
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
        </>
      ) : null}
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
      {block.type === 'code' ? (
        <>
          <Field label="Language">
            <input
              value={block.lang}
              spellCheck={false}
              onChange={(event) =>
                updateBlock(
                  block.id,
                  (target) => (target.type === 'code' ? { ...target, lang: event.target.value } : target),
                  `code-lang:${block.id}`,
                )
              }
            />
          </Field>
          <Field label="Code (verbatim)">
            <textarea
              rows={7}
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
        </>
      ) : null}
      {block.type === 'toc' ? (
        <p className="muted small">
          Exports as <code>\tableofcontents</code> and lists every section slide in the deck.
        </p>
      ) : null}
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
  const selectedBlockId = useDeckStore((state) => state.selectedBlockId);
  const slide = deck.slides.find((entry) => entry.id === selectedSlideId);
  if (!slide) return <p className="muted">No slide selected.</p>;
  const block = findBlock(slide.body, selectedBlockId ?? '');

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
            </div>
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
