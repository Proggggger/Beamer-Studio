import type { CSSProperties } from 'react';
import { useDeckStore } from '../model/store';
import type { Deck, DeckMeta } from '../model/types';
import type { ResolvedTheme } from '../themes/resolve';
import { TRANSPARENT } from '../themes/colorMath';
import { EditableText } from './EditableText';
import { PageNav } from './SlideChrome';

interface TitlePageProps {
  deck: Deck;
  theme: ResolvedTheme;
  editable: boolean;
}

export function TitlePage({ deck, theme, editable }: TitlePageProps) {
  const updateMeta = useDeckStore((state) => state.updateMeta);
  const { palette, font, page, spec } = theme;
  const boxed = palette.titlelike.bg !== TRANSPARENT;
  const inmargin = spec.inner === 'inmargin';
  const boxRadius = spec.inner === 'rounded' ? `${page.w * 0.014}px` : '0';
  const boxBg = boxed ? palette.titlelike.bg : 'transparent';
  const boxFg = palette.titlelike.fg;
  const titleColor = boxed ? boxFg : palette.titlelike.fg;

  const editMeta = (field: keyof DeckMeta, multiline = false) => (
    <EditableText
      editable={editable}
      value={deck.meta[field]}
      multiline={multiline}
      placeholder={field}
      onChange={(value) => updateMeta({ [field]: value }, `meta:${field}`)}
    />
  );

  const boxStyle: CSSProperties = {
    background: boxBg,
    color: boxFg,
    borderRadius: boxRadius,
    padding: boxed ? `${page.h * 0.055}px ${page.w * 0.05}px` : '0',
    boxShadow:
      boxed && spec.shadow ? `0 ${font.base * 0.12}px ${font.base * 0.4}px rgba(0,0,0,0.32)` : 'none',
    maxWidth: page.w * 0.9,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      className={`bx-title-page${boxed ? ' is-boxed' : ''}${inmargin ? ' is-inmargin' : ''}`}
      style={{ background: palette.bg, color: palette.fg }}
    >
      <div className="bx-title-page-inner">
        <div className="bx-title-stack" style={boxStyle}>
          <div className="bx-title" style={{ color: titleColor, fontSize: font.title * 0.88 }}>
            {editMeta('title', true)}
          </div>
          <div
            className="bx-title-subtitle"
            style={{ color: boxed ? boxFg : palette.titlelike.fg, fontSize: font.subtitle }}
          >
            {editMeta('subtitle', true)}
          </div>
        </div>
        <div className="bx-title-meta">
          <div className="bx-title-author" style={{ fontSize: font.base * 0.95 }}>
            {editMeta('author')}
          </div>
          <div className="bx-title-institute" style={{ fontSize: font.small }}>
            {editMeta('institute')}
          </div>
          <div className="bx-title-date" style={{ fontSize: font.base * 0.85 }}>
            {editMeta('date')}
          </div>
        </div>
      </div>
      <PageNav theme={theme} />
    </div>
  );
}
