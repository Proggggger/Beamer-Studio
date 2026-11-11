import { useMemo } from 'react';
import { useDeckStore } from '../model/store';
import type { SlideKind } from '../model/types';
import { Inline } from '../render/inline';
import { ScaledSlide } from '../render/SlideCanvas';
import { resolveTheme } from '../themes/resolve';

const THUMB_WIDTH = 168;

export function SlideRail() {
  const deck = useDeckStore((state) => state.deck);
  const selectedSlideId = useDeckStore((state) => state.selectedSlideId);
  const selectSlide = useDeckStore((state) => state.selectSlide);
  const addSlide = useDeckStore((state) => state.addSlide);
  const duplicateSlide = useDeckStore((state) => state.duplicateSlide);
  const deleteSlide = useDeckStore((state) => state.deleteSlide);
  const moveSlide = useDeckStore((state) => state.moveSlide);
  const theme = useMemo(
    () => resolveTheme(deck.theme, deck.aspect, deck.document.fontSize),
    [deck.theme, deck.aspect, deck.document.fontSize],
  );
  const scale = THUMB_WIDTH / theme.page.w;

  const add = (kind: SlideKind) => addSlide(kind);

  return (
    <aside className="rail">
      <div className="rail-head">
        <span>Slides</span>
        <span className="rail-count">{deck.slides.length}</span>
      </div>
      <div className="rail-add">
        <button type="button" className="btn btn-tiny" onClick={() => add('title')}>
          + Title
        </button>
        <button type="button" className="btn btn-tiny" onClick={() => add('section')}>
          + Section
        </button>
        <button type="button" className="btn btn-tiny" onClick={() => add('frame')}>
          + Frame
        </button>
      </div>
      <div className="rail-list">
        {deck.slides.map((slide, index) => {
          const selected = slide.id === selectedSlideId;
          const rawCaption =
            slide.kind === 'title'
              ? ''
              : slide.kind === 'section'
                ? slide.title || 'Untitled'
                : slide.title || 'Untitled frame';
          const caption =
            slide.kind === 'title'
              ? 'Title page'
              : slide.kind === 'section'
                ? `Section · ${rawCaption}`
                : rawCaption;
          return (
            <div
              key={slide.id}
              className={`rail-item${selected ? ' is-selected' : ''}`}
              onClick={() => selectSlide(slide.id)}
            >
              <div className="rail-thumb">
                <ScaledSlide
                  deck={deck}
                  slide={slide}
                  slideIndex={index}
                  theme={theme}
                  scale={scale}
                />
                <span className={`rail-kind kind-${slide.kind}`}>
                  {slide.kind === 'title' ? 'T' : slide.kind === 'section' ? 'S' : index + 1}
                </span>
                <div className="rail-actions" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="rail-action"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveSlide(slide.id, -1)}
                  >
                    &#9652;
                  </button>
                  <button
                    type="button"
                    className="rail-action"
                    title="Move down"
                    disabled={index === deck.slides.length - 1}
                    onClick={() => moveSlide(slide.id, 1)}
                  >
                    &#9662;
                  </button>
                  <button
                    type="button"
                    className="rail-action"
                    title="Duplicate slide"
                    onClick={() => duplicateSlide(slide.id)}
                  >
                    &#10697;
                  </button>
                  <button
                    type="button"
                    className="rail-action rail-action-danger"
                    title="Delete slide"
                    disabled={deck.slides.length <= 1}
                    onClick={() => {
                      if (window.confirm(`Delete "${caption}"?`)) deleteSlide(slide.id);
                    }}
                  >
                    &#10005;
                  </button>
                </div>
              </div>
              <div className="rail-caption" title={caption}>
                {slide.kind === 'title' ? (
                  caption
                ) : slide.kind === 'section' ? (
                  <>
                    Section · <Inline text={rawCaption} />
                  </>
                ) : (
                  <Inline text={rawCaption} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
