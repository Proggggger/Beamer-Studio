import type { CSSProperties } from 'react';
import { useDeckStore } from '../model/store';
import type { Deck, Slide } from '../model/types';
import type { ResolvedTheme } from '../themes/resolve';
import {
  backgroundPositionCss,
  backgroundSizeCss,
  resolveSlideBackground,
} from '../themes/backgrounds';
import { mix, TRANSPARENT } from '../themes/colorMath';
import { BlockList } from './BlockView';
import { EditableText } from './EditableText';
import { FrameChrome, frameGeometry } from './SlideChrome';
import { TitlePage } from './TitlePage';

export interface SlideCanvasProps {
  deck: Deck;
  slide: Slide;
  slideIndex: number;
  theme: ResolvedTheme;
  editable?: boolean;
  selectedBlockId?: string | null;
  selectedItemId?: string | null;
}

function SectionPage({
  deck,
  slide,
  slideIndex,
  theme,
  editable,
}: {
  deck: Deck;
  slide: Slide;
  slideIndex: number;
  theme: ResolvedTheme;
  editable: boolean;
}) {
  const updateSlide = useDeckStore((state) => state.updateSlide);
  const sections = deck.slides.filter((entry) => entry.kind === 'section');
  const number = sections.findIndex((entry) => entry.id === slide.id) + 1;
  const { palette, font, spec, layout, page } = theme;
  const geometry = frameGeometry(theme);
  const boxed = palette.titlelike.bg !== TRANSPARENT;
  const rounded = spec.inner === 'rounded';
  // Rounded boxes draw 4bp beyond the text column, as beamer's block templates do.
  const bleed = rounded ? page.w * 0.0088 : 0;
  const bandWidth = geometry.contentRight - geometry.contentLeft + bleed * 2;
  const sectionFont = font.base * 1.3;
  const bandStyle: CSSProperties = {
    width: bandWidth,
    marginLeft: -bleed,
    background: boxed ? palette.titlelike.bg : 'transparent',
    color: palette.titlelike.fg,
    borderRadius: rounded ? font.base * 0.3 : 0,
    boxShadow:
      boxed && rounded && layout.blockShadow
        ? `0 ${font.base * 0.12}px ${font.base * 0.4}px rgba(0,0,0,0.32)`
        : 'none',
    padding: `${font.base * 0.95}px ${font.base * 1.2}px`,
  };

  return (
    <div className="bx-section-page" data-slide-id={slide.id}>
      <FrameChrome deck={deck} slideIndex={slideIndex} theme={theme} />
      <div
        className="bx-section-body"
        style={{
          top: geometry.headRows,
          left: geometry.titleLeft,
          right: page.w - geometry.titleRight,
          bottom: geometry.footerHeight,
        }}
      >
        <div className="bx-section-spacer" style={{ flex: 2 }} />
        <div className="bx-section-inner">
          <div className="bx-section-name" style={{ color: palette.fg, fontSize: sectionFont }}>
            Section {number > 0 ? number : ''}
          </div>
          <div className="bx-section-band" style={bandStyle}>
            <div
              className="bx-section-title"
              style={{ color: palette.titlelike.fg, fontSize: sectionFont }}
            >
              <EditableText
                editable={editable}
                value={slide.title}
                multiline
                placeholder="Section title"
                onChange={(title) => updateSlide(slide.id, { title }, `slide-title:${slide.id}`)}
              />
            </div>
          </div>
        </div>
        <div className="bx-section-spacer" style={{ flex: 3 }} />
      </div>
    </div>
  );
}

function FramePage({
  deck,
  slide,
  slideIndex,
  theme,
  editable,
  selectedBlockId,
  selectedItemId,
}: SlideCanvasProps & { editable: boolean }) {
  const updateSlide = useDeckStore((state) => state.updateSlide);
  const geometry = frameGeometry(theme);
  const { palette, font, spec } = theme;
  const barVisible = palette.frametitle.bg !== TRANSPARENT;
  const gradientBars = spec.outer === 'smoothbars' || spec.outer === 'shadow';
  const barBackground = barVisible
    ? gradientBars
      ? `linear-gradient(to bottom, ${palette.frametitle.bg}, ${mix(palette.frametitle.bg, '#000000', 84)})`
      : palette.frametitle.bg
    : 'transparent';
  const titlePadding = geometry.titlePadding;
  const titleColor = palette.frametitle.fg;
  const subtitleDelta = slide.subtitle ? theme.page.h * 0.045 : 0;
  const context = {
    deck,
    theme,
    editable,
    selectedBlockId: editable ? selectedBlockId ?? null : null,
    selectedItemId: editable ? selectedItemId ?? null : null,
  };

  return (
    <div className="bx-frame-page" data-slide-id={slide.id}>
      <FrameChrome deck={deck} slideIndex={slideIndex} theme={theme} />
      <div
        className={`bx-frame-title${barVisible ? ' has-bar' : ''}${
          spec.shadow && barVisible ? ' has-shadow' : ''
        }`}
        style={{
          top: geometry.titleTop,
          left: geometry.titleLeft,
          width: geometry.titleRight - geometry.titleLeft,
          height: geometry.titleHeight + subtitleDelta,
          background: barBackground,
          color: titleColor,
          paddingLeft: titlePadding,
          paddingRight: titlePadding,
          textAlign: spec.frametitleAlign,
          alignItems: 'center',
        }}
      >
        <div className="bx-frame-title-text" style={{ width: '100%' }}>
          <div
            className="bx-frame-title-main"
            style={{ fontSize: slide.subtitle ? font.title * 0.72 : font.title * 0.86 }}
          >
            <EditableText
              editable={editable}
              value={slide.title}
              multiline
              placeholder="Frame title"
              onChange={(title) => updateSlide(slide.id, { title }, `slide-title:${slide.id}`)}
            />
          </div>
          {slide.subtitle ? (
            <div
              className="bx-frame-subtitle"
              style={{ color: palette.framesubtitleFg, fontSize: font.small }}
            >
              <EditableText
                editable={editable}
                value={slide.subtitle}
                placeholder="Frame subtitle"
                onChange={(subtitle) =>
                  updateSlide(slide.id, { subtitle }, `slide-subtitle:${slide.id}`)
                }
              />
            </div>
          ) : null}
        </div>
      </div>
      <div
        className="bx-content"
        style={{
          top: geometry.contentTop + subtitleDelta,
          left: geometry.contentLeft,
          width: geometry.contentRight - geometry.contentLeft,
          height: geometry.contentBottom - geometry.contentTop - subtitleDelta,
        }}
      >
        {slide.body.length === 0 ? (
          editable ? (
            <div className="bx-empty-frame">
              This frame is empty. Add a block from the inspector on the right.
            </div>
          ) : null
        ) : (
          <BlockList blocks={slide.body} context={context} />
        )}
      </div>
      {spec.inner === 'inmargin' ? (
        <div
          className="bx-inmargin-gutter"
          style={{ background: palette.structure, width: geometry.gutter }}
        />
      ) : null}
    </div>
  );
}

export function SlideCanvas({
  deck,
  slide,
  slideIndex,
  theme,
  editable = false,
  selectedBlockId = null,
  selectedItemId = null,
}: SlideCanvasProps) {
  const background = resolveSlideBackground(deck.theme.backgrounds, slide.kind);
  return (
    <div
      className={`bx-page bx-kind-${slide.kind}${background ? ' has-background' : ''}`}
      style={theme.cssVars as CSSProperties}
      data-slide-id={slide.id}
      data-template={theme.spec.name}
    >
      {background ? (
        <div
          className="bx-slide-bg"
          aria-hidden
          style={{
            backgroundImage: `url("${background.image.src}")`,
            backgroundSize: backgroundSizeCss(background.image),
            backgroundPosition: backgroundPositionCss(background.image.position),
            backgroundRepeat: 'no-repeat',
            opacity: background.image.opacity / 100,
          }}
        />
      ) : null}
      {slide.kind === 'title' ? (
        <TitlePage deck={deck} theme={theme} editable={editable} />
      ) : slide.kind === 'section' ? (
        <SectionPage
          deck={deck}
          slide={slide}
          slideIndex={slideIndex}
          theme={theme}
          editable={editable}
        />
      ) : (
        <FramePage
          deck={deck}
          slide={slide}
          slideIndex={slideIndex}
          theme={theme}
          editable={editable}
          selectedBlockId={selectedBlockId}
          selectedItemId={selectedItemId}
        />
      )}
    </div>
  );
}

export function ScaledSlide({
  scale,
  ...props
}: SlideCanvasProps & { scale: number }) {
  const { page } = props.theme;
  return (
    <div
      className="bx-scale"
      style={{ width: page.w * scale, height: page.h * scale }}
    >
      <div className="bx-scale-inner" style={{ transform: `scale(${scale})` }}>
        <SlideCanvas {...props} />
      </div>
    </div>
  );
}
