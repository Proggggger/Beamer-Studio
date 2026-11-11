import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useDeckStore } from '../model/store';
import { COLOR_GALLERY_SLIDE, GALLERY_SLIDE } from '../model/defaults';
import type { CustomColors } from '../model/types';
import { COLOR_THEME_NAMES, THEME_NAMES, THEME_SPECS, themeSpec } from '../themes/beamerThemes';
import { TRANSPARENT, isHexColor } from '../themes/colorMath';
import { resolveTheme } from '../themes/resolve';
import { ScaledSlide } from '../render/SlideCanvas';

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

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (value: string | undefined) => void;
}) {
  const effective = value ?? fallback;
  const [draft, setDraft] = useState(effective);

  useEffect(() => {
    setDraft(effective);
  }, [effective]);

  return (
    <div className="color-field">
      <span className="field-label">{label}</span>
      <div className="color-field-controls">
        <input
          type="color"
          value={isHexColor(draft) ? draft : fallback}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(event.target.value);
          }}
          aria-label={`${label} color`}
        />
        <input
          className="hex-input"
          value={draft}
          spellCheck={false}
          onChange={(event) => {
            setDraft(event.target.value);
            if (isHexColor(event.target.value)) onChange(event.target.value);
          }}
          onBlur={() => setDraft(value ?? fallback)}
        />
        <button
          type="button"
          className="icon-btn"
          title="Reset this color"
          disabled={!value}
          onClick={() => onChange(undefined)}
        >
          &#8635;
        </button>
      </div>
    </div>
  );
}

function TemplateGallery() {
  const theme = useDeckStore((state) => state.deck.theme);
  const aspect = useDeckStore((state) => state.deck.aspect);
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
        );
        return { name, spec, resolved };
      }),
    [theme, aspect],
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
              deck={{ version: 1, meta: { title: 'Title', subtitle: 'Subtitle', author: '', institute: '', date: '' }, aspect, theme: { ...theme, template: name, custom: { enabled: false } }, slides: [GALLERY_SLIDE] }}
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
  const setColorTheme = useDeckStore((state) => state.setColorTheme);
  const updateCustom = useDeckStore((state) => state.updateCustom);
  const resetCustom = useDeckStore((state) => state.resetCustom);
  const resolved = useMemo(() => resolveTheme(theme, aspect), [theme, aspect]);
  const previews = useMemo(
    () =>
      COLOR_THEME_NAMES.map((name) => {
        const previewTheme = { ...theme, colorTheme: name, custom: { enabled: false } };
        return {
          name,
          deck: { ...deck, theme: previewTheme },
          resolved: resolveTheme(previewTheme, aspect),
        };
      }),
    [deck, theme, aspect],
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
          const scale = 120 / previewTheme.page.w;
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
  const setAspect = useDeckStore((state) => state.setAspect);
  const updateTheme = useDeckStore((state) => state.updateTheme);
  const spec = themeSpec(theme.template);

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
            onChange={(event) =>
              updateTheme({ fontFamily: event.target.value as 'sans' | 'serif' })
            }
          >
            <option value="sans">Sans (Latin Modern Sans)</option>
            <option value="serif">Serif (Computer Modern)</option>
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
