import { useMemo, type ReactNode } from 'react';
import { useDeckStore } from '../model/store';
import { COLOR_GALLERY_SLIDE, GALLERY_SLIDE } from '../model/defaults';
import type { CustomColors, FontId, FontSizePt, LanguageId } from '../model/types';
import { COLOR_THEME_NAMES, THEME_NAMES, THEME_SPECS, themeSpec } from '../themes/beamerThemes';
import { TRANSPARENT } from '../themes/colorMath';
import { FONT_OPTIONS, FONT_SIZES, fontOption } from '../themes/fonts';
import { LANGUAGE_OPTIONS, languageOption } from '../themes/languages';
import { resolveTheme } from '../themes/resolve';
import { ScaledSlide } from '../render/SlideCanvas';
import { ColorField } from './ColorField';

const COLOR_KEYS: Array<{ key: keyof Omit<CustomColors, 'enabled'>; label: string }> = [
  { key: 'structure', label: 'Structure / accent' },
  { key: 'primaryBar', label: 'Title bars' },
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Body text' },
  { key: 'alert', label: 'Alert text' },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function TemplateGallery() {
  const theme = useDeckStore((state) => state.deck.theme);
  const aspect = useDeckStore((state) => state.deck.aspect);
  const document = useDeckStore((state) => state.deck.document);
  const setTemplate = useDeckStore((state) => state.setTemplate);
  const previews = useMemo(
    () =>
      THEME_NAMES.map((name) => {
        const spec = THEME_SPECS[name];
        const resolved = resolveTheme(
          {
            ...theme,
            template: name,
            colorTheme: spec.colorThemes[0],
            custom: { enabled: false },
            blockShadow: spec.shadow,
          },
          aspect,
          document.fontSize,
        );
        return { name, spec, resolved };
      }),
    [theme, aspect, document.fontSize],
  );

  return (
    <div className="template-gallery">
      {previews.map(({ name, spec, resolved }) => {
        const scale = 142 / resolved.page.w;
        return (
          <button
            key={name}
            type="button"
            className={`template-card${name === theme.template ? ' is-active' : ''}`}
            onClick={() => setTemplate(name)}
            title={`${name} · ${spec.outer} outer · ${spec.inner} inner`}
          >
            <ScaledSlide
              deck={{ version: 1, meta: { title: 'Title', subtitle: 'Subtitle', author: '', institute: '', date: '' }, aspect, theme: { ...theme, template: name, custom: { enabled: false } }, document, slides: [GALLERY_SLIDE] }}
              slide={GALLERY_SLIDE}
              slideIndex={0}
              theme={resolved}
              scale={scale}
            />
            <span className="template-name">{name}</span>
            <span className="template-meta">
              {spec.outer} · {spec.inner}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ColorGallery() {
  const deck = useDeckStore((state) => state.deck);
  const theme = deck.theme;
  const aspect = deck.aspect;
  const fontSize = deck.document.fontSize;
  const setColorTheme = useDeckStore((state) => state.setColorTheme);
  const updateCustom = useDeckStore((state) => state.updateCustom);
  const resetCustom = useDeckStore((state) => state.resetCustom);
  const resolved = useMemo(() => resolveTheme(theme, aspect, fontSize), [theme, aspect, fontSize]);
  const previews = useMemo(
    () =>
      COLOR_THEME_NAMES.map((name) => {
        const previewTheme = { ...theme, colorTheme: name, custom: { enabled: false } };
        return {
          name,
          deck: { ...deck, theme: previewTheme },
          resolved: resolveTheme(previewTheme, aspect, fontSize),
        };
      }),
    [deck, theme, aspect, fontSize],
  );
  const custom = theme.custom;
  const fallbacks = {
    structure: resolved.palette.structure,
    primaryBar:
      resolved.palette.palettePrimary.bg !== TRANSPARENT
        ? resolved.palette.palettePrimary.bg
        : resolved.palette.structure,
    background: resolved.palette.bg,
    foreground: resolved.palette.fg,
    alert: resolved.palette.alert,
  };

  return (
    <>
      <div className="color-gallery">
        {previews.map(({ name, deck: previewDeck, resolved: previewTheme }) => {
          const scale = 96 / previewTheme.page.w;
          return (
            <button
              key={name}
              type="button"
              className={`color-card${name === theme.colorTheme ? ' is-active' : ''}`}
              onClick={() => setColorTheme(name)}
            >
              <ScaledSlide
                deck={previewDeck}
                slide={COLOR_GALLERY_SLIDE}
                slideIndex={0}
                theme={previewTheme}
                scale={scale}
              />
              <span className="color-name">{name}</span>
            </button>
          );
        })}
      </div>

      <section className="panel-section">
        <h3>Custom colors</h3>
        <label className="check-row">
          <input
            type="checkbox"
            checked={custom.enabled}
            onChange={(event) => updateCustom({ enabled: event.target.checked })}
          />
          Override the theme palette
        </label>
        <div className={custom.enabled ? 'custom-colors' : 'custom-colors is-disabled'}>
          {COLOR_KEYS.map(({ key, label }) => (
            <ColorField
              key={key}
              label={label}
              value={custom[key]}
              fallback={fallbacks[key]}
              onChange={(value) => updateCustom({ [key]: value }, `custom:${key}`)}
            />
          ))}
          <button type="button" className="btn btn-tiny" onClick={resetCustom} disabled={!custom.enabled}>
            Reset all custom colors
          </button>
        </div>
      </section>
    </>
  );
}

function LayoutSettings() {
  const deck = useDeckStore((state) => state.deck);
  const theme = deck.theme;
  const document = deck.document;
  const setAspect = useDeckStore((state) => state.setAspect);
  const updateTheme = useDeckStore((state) => state.updateTheme);
  const updateDocument = useDeckStore((state) => state.updateDocument);
  const spec = themeSpec(theme.template);
  const font = fontOption(theme.fontFamily);
  const sansFonts = FONT_OPTIONS.filter((option) => option.kind === 'sans');
  const serifFonts = FONT_OPTIONS.filter((option) => option.kind === 'serif');

  const setMainLanguage = (id: LanguageId) =>
    updateDocument({
      mainLanguage: id,
      otherLanguages: document.otherLanguages.filter((entry) => entry !== id),
    });

  const toggleOtherLanguage = (id: LanguageId) =>
    updateDocument({
      otherLanguages: document.otherLanguages.includes(id)
        ? document.otherLanguages.filter((entry) => entry !== id)
        : [...document.otherLanguages, id],
    });

  return (
    <>
      <section className="panel-section">
        <h3>Slide size</h3>
        <div className="segmented">
          <button
            type="button"
            className={deck.aspect === '169' ? 'is-active' : ''}
            onClick={() => setAspect('169')}
          >
            16:9 widescreen
          </button>
          <button
            type="button"
            className={deck.aspect === '43' ? 'is-active' : ''}
            onClick={() => setAspect('43')}
          >
            4:3 classic
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h3>Typography</h3>
        <Field label="Font family">
          <select
            value={theme.fontFamily}
            onChange={(event) => updateTheme({ fontFamily: event.target.value as FontId })}
          >
            <optgroup label="Sans serif">
              {sansFonts.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Serif">
              {serifFonts.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <p className="panel-hint">
          {font.tex} + {font.monoTex ?? 'Latin Modern Mono'} via fontspec in the export.
        </p>
        <Field label="Base font size">
          <select
            value={document.fontSize}
            onChange={(event) =>
              updateDocument({ fontSize: Number(event.target.value) as FontSizePt })
            }
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}pt
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Font scale · ${Math.round(theme.fontScale * 100)}%`}>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={theme.fontScale}
            onChange={(event) => updateTheme({ fontScale: Number(event.target.value) }, 'fontScale')}
          />
        </Field>
      </section>

      <section className="panel-section">
        <h3>Language</h3>
        <Field label="Main language">
          <select
            value={document.mainLanguage}
            onChange={(event) => setMainLanguage(event.target.value as LanguageId)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="panel-hint">
          Set with polyglossia: \setmainlanguage{'{'}
          {languageOption(document.mainLanguage).tex}
          {'}'}.
        </p>
        <div className="field">
          <span className="field-label">Additional languages</span>
          <div className="lang-list">
            {LANGUAGE_OPTIONS.filter((option) => option.id !== document.mainLanguage).map(
              (option) => (
                <label key={option.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={document.otherLanguages.includes(option.id)}
                    onChange={() => toggleOtherLanguage(option.id)}
                  />
                  {option.label}
                </label>
              ),
            )}
          </div>
        </div>
        <p className="panel-hint">
          Greek and Cyrillic scripts pick a fallback face that carries the glyphs.
        </p>
      </section>

      <section className="panel-section">
        <h3>Beamer details</h3>
        <Field label="Bullet shape">
          <select
            value={theme.bulletShape}
            onChange={(event) =>
              updateTheme({ bulletShape: event.target.value as typeof theme.bulletShape })
            }
          >
            <option value="theme">Theme default</option>
            <option value="ball">Ball</option>
            <option value="triangle">Triangle</option>
            <option value="circle">Circle</option>
            <option value="square">Square</option>
          </select>
        </Field>
        <Field label="Block shape">
          <select
            value={theme.blockShape}
            onChange={(event) =>
              updateTheme({ blockShape: event.target.value as typeof theme.blockShape })
            }
          >
            <option value="theme">Theme default</option>
            <option value="rounded">Rounded</option>
            <option value="rectangle">Rectangle</option>
          </select>
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={theme.blockShadow}
            onChange={(event) => updateTheme({ blockShadow: event.target.checked })}
          />
          Block shadows
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={theme.navigationSymbols}
            onChange={(event) => updateTheme({ navigationSymbols: event.target.checked })}
          />
          Navigation symbols
        </label>
      </section>

      <section className="panel-section">
        <h3>Active composition</h3>
        <dl className="composition">
          <dt>Template</dt>
          <dd>{theme.template}</dd>
          <dt>Outer</dt>
          <dd>{spec.outer}</dd>
          <dt>Inner</dt>
          <dd>{spec.inner}</dd>
          <dt>Bundled colors</dt>
          <dd>{spec.colorThemes.join(' + ')}</dd>
          <dt>Extra color</dt>
          <dd>{theme.colorTheme}</dd>
        </dl>
      </section>
    </>
  );
}

export function DesignPanel() {
  const designTab = useDeckStore((state) => state.designTab);
  const setDesignTab = useDeckStore((state) => state.setDesignTab);
  return (
    <div className="design-panel">
      <div className="panel-tabs">
        <button
          type="button"
          className={designTab === 'template' ? 'is-active' : ''}
          onClick={() => setDesignTab('template')}
        >
          Template
        </button>
        <button
          type="button"
          className={designTab === 'colors' ? 'is-active' : ''}
          onClick={() => setDesignTab('colors')}
        >
          Colors
        </button>
        <button
          type="button"
          className={designTab === 'layout' ? 'is-active' : ''}
          onClick={() => setDesignTab('layout')}
        >
          Layout
        </button>
      </div>
      {designTab === 'template' ? <TemplateGallery /> : null}
      {designTab === 'colors' ? <ColorGallery /> : null}
      {designTab === 'layout' ? <LayoutSettings /> : null}
    </div>
  );
}
