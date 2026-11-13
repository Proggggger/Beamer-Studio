import { useMemo, useState, type ReactNode } from 'react';
import { useDeckStore } from '../model/store';
import { COLOR_GALLERY_SLIDE, GALLERY_SLIDE } from '../model/defaults';
import type {
  BackgroundImageSettings,
  CustomColors,
  FontId,
  FontSizePt,
  LanguageId,
  SlideImageStacks,
} from '../model/types';
import { COLOR_THEME_NAMES, THEME_NAMES, THEME_SPECS, themeSpec } from '../themes/beamerThemes';
import {
  EMPTY_BACKGROUNDS,
  EMPTY_FOREGROUNDS,
} from '../themes/backgrounds';
import { TRANSPARENT } from '../themes/colorMath';
import { FONT_OPTIONS, FONT_SIZES, CUSTOM_FONT_ID, resolveFont } from '../themes/fonts';
import { LANGUAGE_OPTIONS, languageOption, languageScripts } from '../themes/languages';
import { resolveTheme } from '../themes/resolve';
import { ScaledSlide } from '../render/SlideCanvas';
import { ColorField } from './ColorField';
import { ImageStackCard } from './ImageStackCard';

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
              deck={{ version: 1, meta: { title: 'Title', subtitle: 'Subtitle', author: '', institute: '', date: '' }, aspect, theme: { ...theme, template: name, custom: { enabled: false }, backgrounds: { ...EMPTY_BACKGROUNDS }, foregrounds: { ...EMPTY_FOREGROUNDS } }, document, slides: [GALLERY_SLIDE] }}
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
        const previewTheme = {
          ...theme,
          colorTheme: name,
          custom: { enabled: false },
          backgrounds: { ...EMPTY_BACKGROUNDS },
          foregrounds: { ...EMPTY_FOREGROUNDS },
        };
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
  const font = resolveFont(theme.fontFamily, theme.customFont);
  const fontGroups = [
    { label: 'TeX fonts', options: FONT_OPTIONS.filter((option) => option.source === 'tex') },
    { label: 'Windows system fonts', options: FONT_OPTIONS.filter((option) => option.source === 'system') },
    { label: 'Web / Google fonts', options: FONT_OPTIONS.filter((option) => option.source === 'web') },
  ];
  const neededScripts = languageScripts([document.mainLanguage, ...document.otherLanguages]);
  const needsScriptFont = neededScripts.has('greek') || neededScripts.has('cyrillic');
  const scriptCapable = FONT_OPTIONS.filter((option) =>
    (option.scripts ?? []).some((script) => neededScripts.has(script)),
  );
  const otherFonts = FONT_OPTIONS.filter((option) => !scriptCapable.includes(option));
  const coverageLabel = (option: (typeof FONT_OPTIONS)[number]) =>
    (option.scripts ?? [])
      .filter((script) => neededScripts.has(script))
      .map((script) => (script === 'greek' ? 'Greek' : 'Cyrillic'))
      .join(' + ');

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
            {fontGroups.map((group) => (
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
        {theme.fontFamily === CUSTOM_FONT_ID ? (
          <Field label="Custom font family">
            <input
              value={theme.customFont}
              placeholder="e.g. Bahnschrift"
              spellCheck={false}
              onChange={(event) => updateTheme({ customFont: event.target.value }, 'customFont')}
            />
          </Field>
        ) : null}
        <p className="panel-hint">
          {theme.fontFamily === CUSTOM_FONT_ID && !theme.customFont.trim()
            ? 'Type the exact family name fontspec knows; the export falls back to Latin Modern when it is not installed.'
            : `${font.tex}${font.monoTex ? ` + ${font.monoTex}` : ''} via fontspec in the export; the preview uses it when installed here.`}
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
          <p className="panel-hint">
            Ticked languages switch fonts in the export; Greek and Cyrillic text also needs its
            language ticked here to get the matching font markup.
          </p>
        </div>
        {needsScriptFont ? (
          <>
            <Field label="Greek / Cyrillic font">
              <select
                value={document.scriptFont}
                onChange={(event) =>
                  updateDocument({
                    scriptFont: event.target.value as FontId | 'auto',
                  })
                }
              >
                <option value="auto">Automatic — follow the main font</option>
                <optgroup label="Supports the active script">
                  {scriptCapable.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} · {coverageLabel(option)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other fonts (may lack the glyphs)">
                  {otherFonts.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
            <p className="panel-hint">
              Declared for Greek and Cyrillic text in the export. Automatic uses the main
              font when it supports the script, otherwise a same-style fallback.
            </p>
          </>
        ) : null}
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

const IMAGE_SLOTS: Array<{
  slot: keyof SlideImageStacks;
  title: string;
}> = [
  { slot: 'all', title: 'All frames' },
  { slot: 'title', title: 'Title page' },
  { slot: 'section', title: 'Section pages' },
];

type ImageSurface = 'background' | 'foreground';

function ImageStacksPanel() {
  const theme = useDeckStore((state) => state.deck.theme);
  const updateTheme = useDeckStore((state) => state.updateTheme);
  const [surface, setSurface] = useState<ImageSurface>('background');
  const isBackground = surface === 'background';
  const stacks = isBackground ? theme.backgrounds : theme.foregrounds;
  const noun = isBackground ? 'background' : 'foreground';
  const placement = isBackground ? 'behind' : 'above';

  return (
    <>
      <div className="segmented" role="group" aria-label="Template image surface">
        <button
          type="button"
          className={isBackground ? 'is-active' : ''}
          onClick={() => setSurface('background')}
        >
          Background
        </button>
        <button
          type="button"
          className={!isBackground ? 'is-active' : ''}
          onClick={() => setSurface('foreground')}
        >
          Foreground
        </button>
      </div>
      <p className="panel-hint bg-intro">
        {isBackground
          ? 'Backgrounds sit behind the slide content in the preview and the XeLaTeX export.'
          : 'Foregrounds sit above the slide content and can cover it — useful for logos, watermarks and decorative marks.'}{' '}
        Each slot is a stack: add several images (a backdrop and a logo, for example) and later
        layers draw on top. Title and section pages can override the shared stack.
      </p>
      {IMAGE_SLOTS.map(({ slot, title }) => {
        const apply = (layers: BackgroundImageSettings[]) =>
          updateTheme(
            isBackground
              ? { backgrounds: { ...stacks, [slot]: layers } }
              : { foregrounds: { ...stacks, [slot]: layers } },
            `${surface}:${slot}`,
          );
        return (
          <ImageStackCard
            key={slot}
            title={title}
            hint={
              slot === 'all'
                ? `Drawn ${placement} every slide unless the title or section page overrides it.`
                : `Adds a dedicated ${noun} stack for these pages, or reuses the shared one.`
            }
            layers={stacks[slot]}
            inherited={slot !== 'all' && stacks[slot].length === 0 && stacks.all.length > 0}
            emptyLabel={`No ${noun} image.`}
            inheritedLabel={`No override — using the shared ${noun} stack.`}
            prefix={isBackground ? 'bg' : 'fg'}
            resetLabel={slot === 'all' ? undefined : 'Use shared layers'}
            onReset={slot === 'all' ? undefined : () => apply([])}
            onChange={apply}
          />
        );
      })}
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
        <button
          type="button"
          className={designTab === 'images' ? 'is-active' : ''}
          onClick={() => setDesignTab('images')}
        >
          Images
        </button>
      </div>
      {designTab === 'template' ? <TemplateGallery /> : null}
      {designTab === 'colors' ? <ColorGallery /> : null}
      {designTab === 'layout' ? <LayoutSettings /> : null}
      {designTab === 'images' ? <ImageStacksPanel /> : null}
    </div>
  );
}
