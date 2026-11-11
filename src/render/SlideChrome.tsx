import type { CSSProperties } from 'react';
import type { Deck } from '../model/types';
import type { Palette, Swatch } from '../themes/colorthemes';
import type { ResolvedTheme } from '../themes/resolve';
import { mix, TRANSPARENT } from '../themes/colorMath';

export interface FrameGeometry {
  headRows: number;
  titleTop: number;
  titleLeft: number;
  titleRight: number;
  titleHeight: number;
  titlePadding: number;
  contentTop: number;
  contentLeft: number;
  contentRight: number;
  contentBottom: number;
  footerHeight: number;
  navBottom: number;
  gutter: number;
}

interface SectionEntry {
  index: number;
  title: string;
}

export function frameGeometry(theme: ResolvedTheme): FrameGeometry {
  const { page, layout, spec } = theme;
  const w = page.w;
  const h = page.h;
  const margin = layout.margin;

  let headRows = 0;
  if (spec.outer === 'tree' || spec.outer === 'smoothtree') headRows = h * 0.076;

  const titleTop = spec.outer === 'none' || spec.inner === 'inmargin' ? h * 0.035 : headRows;
  const titleHeight = layout.titleH;

  let titleLeft = 0;
  let titleRight = w;
  if (spec.sidebar) {
    if (spec.sidebar.side === 'left') titleLeft = layout.sidebarWidth;
    else titleRight = w - layout.sidebarWidth;
  } else if (spec.inner === 'inmargin') {
    titleLeft = layout.inmarginWidth;
  }

  const footerVisible =
    (spec.outer === 'infolines' ||
      spec.outer === 'split' ||
      spec.outer === 'shadow' ||
      spec.outer === 'smoothbars' ||
      (spec.outer === 'miniframes' && spec.miniframes?.footline !== 'none')) &&
    !spec.sidebar;
  const footerHeight = footerVisible ? layout.footH : 0;
  const navBottom = footerHeight > 0 ? footerHeight + h * 0.012 : h * 0.018;

  // beamerouterthemeinfolines sets `text margin left/right=1em`; every other
  // outer theme keeps the default 1cm margin.
  const contentMargin = spec.outer === 'infolines' ? w * 0.02875 : margin;
  let contentLeft = contentMargin;
  let contentRight = w - contentMargin;
  let contentTop = titleTop + titleHeight + h * 0.025;
  let contentBottom = h - (footerVisible ? footerHeight : h * 0.09);

  if (spec.inner === 'inmargin') {
    contentLeft = layout.inmarginWidth + margin * 0.35;
    contentTop = titleTop + titleHeight + h * 0.01;
  } else if (spec.sidebar) {
    contentLeft = (spec.sidebar.side === 'left' ? layout.sidebarWidth : 0) + margin * 0.8;
    contentRight = w - (spec.sidebar.side === 'right' ? layout.sidebarWidth : 0) - margin * 0.8;
    contentTop = titleTop + titleHeight + h * 0.02;
    contentBottom = h - h * 0.09;
  }

  return {
    headRows,
    titleTop,
    titleLeft,
    titleRight,
    titleHeight,
    // Infothemes place the frame title 0.3cm from the bar edge.
    titlePadding:
      spec.outer === 'infolines'
        ? w * 0.01875
        : spec.inner === 'inmargin'
          ? margin * 0.35
          : margin * 0.65,
    contentTop,
    contentLeft,
    contentRight,
    contentBottom,
    footerHeight,
    navBottom,
    gutter: layout.inmarginWidth,
  };
}

function cellBackground(swatch: Swatch, fallback: string, palette: Palette): string {
  if (swatch.bg !== TRANSPARENT) return swatch.bg;
  return fallback === 'structure' ? palette.structure : fallback;
}

function sectionsOf(deck: Deck, slideIndex: number): {
  list: SectionEntry[];
  current: SectionEntry | null;
} {
  const list: SectionEntry[] = [];
  deck.slides.forEach((slide, index) => {
    if (slide.kind === 'section') list.push({ index, title: slide.title || 'Section' });
  });
  const past = list.filter((entry) => entry.index < slideIndex);
  return { list, current: past.length > 0 ? past[past.length - 1] : null };
}

function Headline({
  deck,
  theme,
  slideIndex,
  style,
}: {
  deck: Deck;
  theme: ResolvedTheme;
  slideIndex: number;
  style: CSSProperties;
}) {
  const { spec, palette } = theme;
  const { current } = sectionsOf(deck, slideIndex);

  if (spec.outer === 'tree' || spec.outer === 'smoothtree') {
    const topBg = cellBackground(palette.paletteQuaternary, '#000000', palette);
    const secondBg = cellBackground(palette.paletteSecondary, mix(palette.structure, '#000000', 75), palette);
    const gradient =
      spec.outer === 'smoothtree'
        ? `linear-gradient(to bottom, ${mix(topBg, '#ffffff', 30)}, ${topBg})`
        : topBg;
    const rowPad = spec.sidebar ? theme.layout.sidebarWidth + theme.layout.margin * 0.6 : theme.layout.margin * 0.2;
    return (
      <div className="bx-headline bx-headline-tree" style={style} aria-hidden>
        <div
          className="bx-tree-row bx-tree-title"
          style={{
            background: gradient,
            color: palette.paletteQuaternary.fg,
            height: '50%',
            paddingLeft: rowPad,
            paddingRight: theme.layout.margin * 0.6,
          }}
        >
          <span className="bx-tree-short">{deck.meta.title}</span>
          {deck.meta.subtitle ? <span className="bx-tree-subtitle">{deck.meta.subtitle}</span> : null}
        </div>
        <div
          className="bx-tree-row bx-tree-section"
          style={{
            background: secondBg,
            color: palette.paletteSecondary.fg,
            height: '50%',
            paddingLeft: rowPad,
            paddingRight: theme.layout.margin * 0.6,
          }}
        >
          <span>{current ? current.title : ''}</span>
        </div>
      </div>
    );
  }

  return null;
}

function Footline({
  deck,
  theme,
  frameIndex,
  style,
}: {
  deck: Deck;
  theme: ResolvedTheme;
  frameIndex: number;
  style: CSSProperties;
}) {
  const { spec, palette } = theme;
  const page = `${frameIndex}/${deck.slides.length}`;

  if (spec.outer === 'split' || spec.outer === 'shadow') {
    return (
      <div className="bx-footline bx-footline-split" style={style} aria-hidden>
        <div
          className="bx-foot-cell"
          style={{
            flex: 0.4,
            background: cellBackground(palette.paletteQuaternary, '#000000', palette),
            color: palette.paletteQuaternary.fg,
          }}
        >
          <span>{deck.meta.author}</span>
          <span className="bx-foot-page">{page}</span>
        </div>
        <div
          className="bx-foot-cell"
          style={{
            flex: 0.6,
            background: cellBackground(palette.palettePrimary, palette.structure, palette),
            color: palette.palettePrimary.fg,
          }}
        >
          <span>
            {deck.meta.title}
            {deck.meta.subtitle ? ` · ${deck.meta.subtitle}` : ''}
          </span>
        </div>
      </div>
    );
  }

  if (spec.outer === 'miniframes') {
    const variant = spec.miniframes?.footline ?? 'authorinstitutetitle';
    if (variant === 'none') return null;
    const cells: Array<{ text: string; swatch: Swatch; fallback: string }> = [];
    if (variant === 'authorinstitute' || variant === 'authorinstitutetitle') {
      cells.push({ text: deck.meta.author, swatch: palette.palettePrimary, fallback: palette.structure });
    }
    if (variant === 'authorinstitute' || variant === 'authorinstitutetitle' || variant === 'institutetitle') {
      cells.push({
        text: deck.meta.institute,
        swatch: palette.paletteSecondary,
        fallback: mix(palette.structure, '#000000', 75),
      });
    }
    if (variant === 'authorinstitutetitle' || variant === 'institutetitle') {
      cells.push({
        text: deck.meta.title,
        swatch: palette.paletteTertiary,
        fallback: mix(palette.structure, '#000000', 50),
      });
    }
    return (
      <div className="bx-footline" style={style} aria-hidden>
        {cells.map((cell, index) => (
          <div
            key={index}
            className="bx-foot-cell"
            style={{
              flex: 1,
              background: cellBackground(cell.swatch, cell.fallback, palette),
              color: cell.swatch.bg === TRANSPARENT ? '#ffffff' : cell.swatch.fg,
            }}
          >
            {cell.text}
          </div>
        ))}
        <div
          className="bx-foot-cell bx-foot-page-cell"
          style={{
            flex: 0.25,
            background: cellBackground(palette.paletteQuaternary, '#000000', palette),
            color: palette.paletteQuaternary.fg,
          }}
        >
          {page}
        </div>
      </div>
    );
  }

  return (
    <div className="bx-footline" style={style} aria-hidden>
      <div
        className="bx-foot-cell"
        style={{
          flex: 1,
          background: cellBackground(palette.palettePrimary, palette.structure, palette),
          color: palette.palettePrimary.fg,
        }}
      >
        <span>{deck.meta.author}</span>
        <span className="bx-foot-institute">{deck.meta.institute}</span>
      </div>
      <div
        className="bx-foot-cell"
        style={{
          flex: 1,
          background: cellBackground(palette.paletteSecondary, mix(palette.structure, '#000000', 75), palette),
          color: palette.paletteSecondary.fg,
        }}
      >
        {deck.meta.title}
      </div>
      <div
        className="bx-foot-cell"
        style={{
          flex: 0.6,
          background: cellBackground(palette.paletteTertiary, mix(palette.structure, '#000000', 50), palette),
          color: palette.paletteTertiary.fg,
        }}
      >
        <span>{deck.meta.date}</span>
        <span className="bx-foot-page">{page}</span>
      </div>
    </div>
  );
}

function Sidebar({
  deck,
  theme,
  slideIndex,
}: {
  deck: Deck;
  theme: ResolvedTheme;
  slideIndex: number;
}) {
  const { spec, palette, layout } = theme;
  if (!spec.sidebar) return null;
  const { list, current } = sectionsOf(deck, slideIndex);
  const background = palette.sidebar.bg === TRANSPARENT ? palette.bg : palette.sidebar.bg;
  const fg = palette.sidebar.bg === TRANSPARENT ? palette.fg : palette.sidebar.fg;
  const headBg = palette.sidebarPrimary;
  const headFg = palette.sidebarSecondary;
  const sidePosition: CSSProperties =
    spec.sidebar.side === 'left' ? { left: 0 } : { right: 0 };

  return (
    <div
      className={`bx-sidebar is-${spec.sidebar.side}`}
      style={{
        width: layout.sidebarWidth,
        background,
        color: fg,
        ...sidePosition,
      }}
      aria-hidden
    >
      {spec.sidebar.head ? (
        <div
          className="bx-sidebar-head"
          style={{ height: layout.sidebarHeadH, background: headBg, color: headFg }}
        >
          <div className="bx-sidebar-kicker">{deck.meta.title}</div>
          <div className="bx-sidebar-author">{deck.meta.author}</div>
        </div>
      ) : (
        <div className="bx-sidebar-head" style={{ background: 'transparent', height: layout.sidebarHeadH * 0.8 }}>
          <div className="bx-sidebar-kicker">{deck.meta.title}</div>
          <div className="bx-sidebar-author">{deck.meta.author}</div>
        </div>
      )}
      <div className="bx-sidebar-sections">
        {list.map((entry) => (
          <div
            key={entry.index}
            className={entry.index === current?.index ? 'bx-sidebar-section is-current' : 'bx-sidebar-section'}
            style={{
              background:
                entry.index === current?.index
                  ? palette.sidebarTertiary
                  : 'transparent',
              color:
                entry.index === current?.index
                  ? palette.sidebarQuaternary
                  : fg,
            }}
          >
            {entry.title}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavSymbols({ theme, bottom }: { theme: ResolvedTheme; bottom: number }) {
  if (!theme.layout.navigationSymbols) return null;
  return (
    <div className="bx-nav" style={{ bottom, color: theme.cssVars['--nav-color'] }} aria-hidden>
      <span className="bx-nav-symbol">&#9666;</span>
      <span className="bx-nav-symbol">&#9656;</span>
      <span className="bx-nav-symbol">&#8635;</span>
      <span className="bx-nav-symbol">&#8962;</span>
      <span className="bx-nav-symbol">&#9652;</span>
      <span className="bx-nav-symbol">&#9662;</span>
    </div>
  );
}

export function FrameChrome({
  deck,
  slideIndex,
  theme,
}: {
  deck: Deck;
  slideIndex: number;
  theme: ResolvedTheme;
}) {
  const geometry = frameGeometry(theme);

  return (
    <>
      {theme.spec.sidebar ? (
        <Sidebar deck={deck} theme={theme} slideIndex={slideIndex} />
      ) : (
        <>
          {geometry.headRows > 0 ? (
            <Headline
              deck={deck}
              theme={theme}
              slideIndex={slideIndex}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: geometry.headRows }}
            />
          ) : null}
          {geometry.footerHeight > 0 ? (
            <Footline
              deck={deck}
              theme={theme}
              frameIndex={slideIndex + 1}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: geometry.footerHeight,
              }}
            />
          ) : null}
        </>
      )}
      <NavSymbols theme={theme} bottom={geometry.navBottom} />
    </>
  );
}

export function PageNav({ theme }: { theme: ResolvedTheme }) {
  return <NavSymbols theme={theme} bottom={theme.page.h * 0.018} />;
}
