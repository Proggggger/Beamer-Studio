import { useMemo, useState } from 'react';
import { useDeckStore } from '../model/store';
import { SlideCanvas } from '../render/SlideCanvas';
import { useFitScale } from '../render/useFitScale';
import { resolveTheme } from '../themes/resolve';

export function PreviewPane() {
  const deck = useDeckStore((state) => state.deck);
  const selectedSlideId = useDeckStore((state) => state.selectedSlideId);
  const selectedBlockId = useDeckStore((state) => state.selectedBlockId);
  const selectedItemId = useDeckStore((state) => state.selectedItemId);
  const selectBlock = useDeckStore((state) => state.selectBlock);
  const theme = useMemo(() => resolveTheme(deck.theme, deck.aspect), [deck.theme, deck.aspect]);
  const { ref, scale: fitScale } = useFitScale(theme.page.w, theme.page.h, 28);
  const [zoom, setZoom] = useState(1);
  const slideIndex = deck.slides.findIndex((slide) => slide.id === selectedSlideId);
  const slide = slideIndex >= 0 ? deck.slides[slideIndex] : undefined;
  const scale = fitScale * zoom;

  return (
    <main className="preview-pane">
      <div className="preview-status">
        <span>
          {slideIndex >= 0 ? `Slide ${slideIndex + 1} of ${deck.slides.length}` : 'No slide'}
        </span>
        <span className="preview-theme">
          {deck.theme.template} · {deck.theme.colorTheme} · {deck.aspect === '169' ? '16:9' : '4:3'}
        </span>
      </div>
      <div className="preview-stage" ref={ref}>
        {slide ? (
          <div
            className="preview-canvas"
            style={{ width: theme.page.w * scale, height: theme.page.h * scale }}
            onClick={() => selectBlock(null)}
          >
            <div
              className="preview-scaler"
              style={{ transform: `scale(${scale})`, width: theme.page.w, height: theme.page.h }}
            >
              <SlideCanvas
                deck={deck}
                slide={slide}
                slideIndex={slideIndex}
                theme={theme}
                editable
                selectedBlockId={selectedBlockId}
                selectedItemId={selectedItemId}
              />
            </div>
          </div>
        ) : (
          <div className="preview-empty">Select a slide to start editing.</div>
        )}
      </div>
      <div className="preview-controls">
        <button
          type="button"
          className="btn btn-icon"
          title="Zoom out"
          onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))}
        >
          &minus;
        </button>
        <button type="button" className="btn btn-chip" onClick={() => setZoom(1)} title="Fit to window">
          Fit · {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="btn btn-icon"
          title="Zoom in"
          onClick={() => setZoom((value) => Math.min(2, Math.round((value + 0.1) * 10) / 10))}
        >
          +
        </button>
      </div>
    </main>
  );
}
