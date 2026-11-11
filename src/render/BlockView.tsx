import type { MouseEvent } from 'react';
import { useDeckStore } from '../model/store';
import type { Block, Deck, ImageBlock, ListBlock } from '../model/types';
import type { ResolvedTheme } from '../themes/resolve';
import { EditableText } from './EditableText';
import { Inline, MathView } from './inline';

interface RenderContext {
  deck: Deck;
  theme: ResolvedTheme;
  editable: boolean;
  selectedBlockId: string | null;
  selectedItemId: string | null;
}

interface BlockViewProps extends RenderContext {
  block: Block;
}

function selectHandler(id: string, editable: boolean, selectBlock: (id: string | null) => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    if (editable) selectBlock(id);
  };
}

function ListView({ list, context }: { list: ListBlock; context: RenderContext }) {
  const updateItem = useDeckStore((state) => state.updateItem);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  const selectItem = useDeckStore((state) => state.selectItem);
  const counters = [0, 0, 0];
  const labels = list.items.map((item) => {
    counters[item.depth] += 1;
    for (let depth = item.depth + 1; depth < 3; depth += 1) counters[depth] = 0;
    return counters[item.depth];
  });

  return (
    <div className={`bx-list${list.ordered ? ' is-ordered' : ''}`}>
      {list.items.map((item, index) => (
        <div
          key={item.id}
          className={`bx-item depth-${item.depth}${
            context.selectedItemId === item.id ? ' is-selected' : ''
          }${item.pause ? ' is-paused' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            if (!context.editable) return;
            selectBlock(list.id);
            selectItem(item.id);
          }}
        >
          {list.ordered ? (
            <span className="bx-enum">{labels[index]}.</span>
          ) : (
            <span
              className={`bx-bullet bx-bullet-${context.theme.layout.bullet} depth-${item.depth}`}
              aria-hidden
            />
          )}
          <EditableText
            editable={context.editable}
            value={item.text}
            className="bx-item-text"
            onChange={(text) =>
              updateItem(list.id, item.id, { text }, `item:${item.id}`)
            }
            onSelect={() => {
              selectBlock(list.id);
              selectItem(item.id);
            }}
          />
          {item.pause ? <span className="bx-pause-tag">\pause</span> : null}
        </div>
      ))}
      {list.items.length === 0 ? <div className="bx-empty">Empty list</div> : null}
    </div>
  );
}

function ToneBlock({ block, context }: { block: Extract<Block, { type: 'block' }>; context: RenderContext }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  const titleBg =
    block.tone === 'alert'
      ? context.theme.cssVars['--block-alert-bg']
      : block.tone === 'example'
        ? context.theme.cssVars['--block-example-bg']
        : context.theme.cssVars['--block-title-bg'];
  const titleFg =
    block.tone === 'alert'
      ? context.theme.cssVars['--block-alert-fg']
      : block.tone === 'example'
        ? context.theme.cssVars['--block-example-fg']
        : context.theme.cssVars['--block-title-fg'];
  const bodyBg =
    block.tone === 'alert'
      ? context.theme.cssVars['--block-alert-body-bg']
      : block.tone === 'example'
        ? context.theme.cssVars['--block-example-body-bg']
        : context.theme.cssVars['--block-body-bg'];
  const bodyFg =
    block.tone === 'alert'
      ? context.theme.cssVars['--block-alert-body-fg']
      : block.tone === 'example'
        ? context.theme.cssVars['--block-example-body-fg']
        : context.theme.cssVars['--block-body-fg'];
  const radius = context.theme.layout.blockShape === 'rounded' ? '0.3em' : '0';
  const shadow = context.theme.layout.blockShadow
    ? '0 0.12em 0.35em rgba(0,0,0,0.4)'
    : 'none';

  return (
    <div
      className={`bx-theme-block tone-${block.tone}${
        context.selectedBlockId === block.id ? ' is-selected' : ''
      }`}
      style={{ borderRadius: radius, boxShadow: shadow }}
      onClick={selectHandler(block.id, context.editable, selectBlock)}
      data-block-id={block.id}
    >
      <div
        className="bx-theme-block-title"
        style={{ background: titleBg, color: titleFg, borderRadius: `${radius} ${radius} 0 0` }}
      >
        <EditableText
          editable={context.editable}
          value={block.title}
          onChange={(title) =>
            updateBlock(
              block.id,
              (target) => (target.type === 'block' ? { ...target, title } : target),
              `block-title:${block.id}`,
            )
          }
          onSelect={() => selectBlock(block.id)}
        />
      </div>
      <div
        className="bx-theme-block-body"
        style={{ background: bodyBg, color: bodyFg, borderRadius: `0 0 ${radius} ${radius}` }}
      >
        <BlockList blocks={block.body} context={context} />
      </div>
    </div>
  );
}

function ColumnsView({
  block,
  context,
}: {
  block: Extract<Block, { type: 'columns' }>;
  context: RenderContext;
}) {
  const selectBlock = useDeckStore((state) => state.selectBlock);
  return (
    <div
      className={`bx-columns${context.selectedBlockId === block.id ? ' is-selected' : ''}`}
      onClick={selectHandler(block.id, context.editable, selectBlock)}
      data-block-id={block.id}
    >
      <div className="bx-column">
        <BlockList blocks={block.left} context={context} />
      </div>
      <div className="bx-column">
        <BlockList blocks={block.right} context={context} />
      </div>
    </div>
  );
}

function ImageView({ block, context }: { block: ImageBlock; context: RenderContext }) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  return (
    <div
      className={`bx-image-block${context.selectedBlockId === block.id ? ' is-selected' : ''}`}
      onClick={selectHandler(block.id, context.editable, selectBlock)}
      data-block-id={block.id}
    >
      {block.src ? (
        <img
          src={block.src}
          alt={block.name}
          style={{ width: `${Math.max(10, Math.min(100, block.widthPct))}%` }}
          draggable={false}
        />
      ) : (
        <div className="bx-image-placeholder" style={{ width: `${block.widthPct}%` }}>
          <span className="bx-image-icon">&#128247;</span>
          <span>Image placeholder</span>
          <small>Upload a picture in the inspector</small>
        </div>
      )}
      {block.caption !== undefined ? (
        <EditableText
          editable={context.editable}
          value={block.caption}
          className="bx-image-caption"
          placeholder="Caption"
          onChange={(caption) =>
            updateBlock(
              block.id,
              (target) => (target.type === 'image' ? { ...target, caption } : target),
              `caption:${block.id}`,
            )
          }
          onSelect={() => selectBlock(block.id)}
        />
      ) : null}
    </div>
  );
}

function MathBlockView({
  block,
  context,
}: {
  block: Extract<Block, { type: 'math' }>;
  context: RenderContext;
}) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  return (
    <div
      className={`bx-math-block${context.selectedBlockId === block.id ? ' is-selected' : ''}`}
      onClick={selectHandler(block.id, context.editable, selectBlock)}
      data-block-id={block.id}
    >
      <EditableText
        editable={context.editable}
        value={block.tex}
        multiline
        className="bx-math-source"
        render={(value) => <MathView tex={value} displayMode />}
        onChange={(tex) =>
          updateBlock(
            block.id,
            (target) => (target.type === 'math' ? { ...target, tex } : target),
            `math:${block.id}`,
          )
        }
        onSelect={() => selectBlock(block.id)}
      />
    </div>
  );
}

function CodeBlockView({
  block,
  context,
}: {
  block: Extract<Block, { type: 'code' }>;
  context: RenderContext;
}) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  return (
    <div
      className={`bx-code-block${context.selectedBlockId === block.id ? ' is-selected' : ''}`}
      onClick={selectHandler(block.id, context.editable, selectBlock)}
      data-block-id={block.id}
    >
      <EditableText
        editable={context.editable}
        value={block.text}
        multiline
        className="bx-code-source"
        render={(value) => (
          <pre className="bx-code">
            <code>{value}</code>
          </pre>
        )}
        onChange={(text) =>
          updateBlock(
            block.id,
            (target) => (target.type === 'code' ? { ...target, text } : target),
            `code:${block.id}`,
          )
        }
        onSelect={() => selectBlock(block.id)}
      />
    </div>
  );
}

function TocView({ block, context }: { block: Extract<Block, { type: 'toc' }>; context: RenderContext }) {
  const selectBlock = useDeckStore((state) => state.selectBlock);
  const sections = context.deck.slides.filter((slide) => slide.kind === 'section');
  return (
    <div
      className={`bx-toc${context.selectedBlockId === block.id ? ' is-selected' : ''}`}
      onClick={selectHandler(block.id, context.editable, selectBlock)}
      data-block-id={block.id}
    >
      {sections.length === 0 ? (
        <div className="bx-empty">Add section slides to build a table of contents</div>
      ) : (
        sections.map((section, index) => (
          <div className="bx-toc-entry" key={section.id}>
            <span className="bx-toc-number">{index + 1}</span>
            <span>
              <Inline text={section.title} />
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function BlockView({ block, ...context }: BlockViewProps) {
  const updateBlock = useDeckStore((state) => state.updateBlock);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  const selected = context.editable && context.selectedBlockId === block.id;
  const baseClass = `bx-block bx-block-${block.type}${selected ? ' is-selected' : ''}`;

  switch (block.type) {
    case 'paragraph':
      return (
        <div
          className={baseClass}
          onClick={selectHandler(block.id, context.editable, selectBlock)}
          data-block-id={block.id}
        >
          <EditableText
            editable={context.editable}
            value={block.text}
            multiline
            placeholder="Paragraph"
            className={`bx-paragraph${block.align === 'center' ? ' is-center' : ''}`}
            onChange={(text) =>
              updateBlock(
                block.id,
                (target) => (target.type === 'paragraph' ? { ...target, text } : target),
                `paragraph:${block.id}`,
              )
            }
            onSelect={() => selectBlock(block.id)}
          />
        </div>
      );
    case 'list':
      return (
        <div
          className={baseClass}
          onClick={selectHandler(block.id, context.editable, selectBlock)}
          data-block-id={block.id}
        >
          <ListView list={block} context={context} />
        </div>
      );
    case 'block':
      return <ToneBlock block={block} context={context} />;
    case 'columns':
      return <ColumnsView block={block} context={context} />;
    case 'image':
      return <ImageView block={block} context={context} />;
    case 'math':
      return <MathBlockView block={block} context={context} />;
    case 'code':
      return <CodeBlockView block={block} context={context} />;
    case 'toc':
      return <TocView block={block} context={context} />;
  }
}

export function BlockList({ blocks, context }: { blocks: Block[]; context: RenderContext }) {
  return (
    <div className="bx-blocks">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} {...context} />
      ))}
    </div>
  );
}
