import { useRef, useState, type ReactNode } from 'react';
import type { BackgroundImageSettings } from '../model/types';
import {
  BACKGROUND_MODES,
  BACKGROUND_POSITIONS,
  newBackground,
  newTikzLayer,
} from '../themes/backgrounds';
import { emptyLayerDrawing } from '../tikz/drawing';
import { TikzSvg } from '../tikz/TikzSvg';
import { openTikzEditor } from './tikzEditorStore';
import { readImageFile } from './imageFile';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function ImageStackCard({
  title,
  hint,
  layers,
  prefix,
  emptyLabel,
  inherited,
  inheritedLabel,
  resetLabel,
  onReset,
  onChange,
}: {
  title: string;
  hint: string;
  layers: BackgroundImageSettings[];
  prefix: 'bg' | 'fg' | 'fs';
  emptyLabel: string;
  inherited: boolean;
  inheritedLabel: string;
  resetLabel?: string;
  onReset?: () => void;
  onChange: (layers: BackgroundImageSettings[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = layers.find((layer) => layer.id === selectedId) ?? layers[0];

  const add = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await readImageFile(file);
      const layer = newBackground(result.src, result.name, prefix);
      setSelectedId(layer.id);
      onChange([...layers, layer]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not read that image.');
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<BackgroundImageSettings>) => {
    if (!selected) return;
    onChange(layers.map((layer) => (layer.id === selected.id ? { ...layer, ...patch } : layer)));
  };

  const addTikz = () => {
    openTikzEditor('New TikZ layer', emptyLayerDrawing(), (drawing) => {
      const layer = newTikzLayer(drawing, prefix);
      setSelectedId(layer.id);
      onChange([...layers, layer]);
    });
  };

  const editTikz = (layer: BackgroundImageSettings) => {
    openTikzEditor('Edit TikZ layer', layer.drawing ?? emptyLayerDrawing(), (drawing) =>
      onChange(layers.map((entry) => (entry.id === layer.id ? { ...entry, drawing } : entry))),
    );
  };

  const remove = (id: string) => {
    const next = layers.filter((layer) => layer.id !== id);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    onChange(next);
  };

  const move = (id: string, delta: number) => {
    const from = layers.findIndex((layer) => layer.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= layers.length) return;
    const next = [...layers];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const modeLabel = (id: BackgroundImageSettings['mode']) =>
    BACKGROUND_MODES.find((entry) => entry.id === id)?.label ?? id;
  const positionLabel = (id: BackgroundImageSettings['position']) =>
    BACKGROUND_POSITIONS.find((entry) => entry.id === id)?.label ?? id;

  return (
    <section className="panel-section bg-card">
      <h3>{title}</h3>
      <p className="panel-hint">{hint}</p>
      {layers.length > 0 ? (
        <>
          <div className="bg-layers">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                className={`bg-layer${selected?.id === layer.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(layer.id)}
              >
                <div className="bg-layer-thumb">
                  {layer.kind === 'tikz' && layer.drawing ? (
                    <TikzSvg drawing={layer.drawing} className="bg-layer-svg" />
                  ) : (
                    <img src={layer.src} alt="" />
                  )}
                </div>
                <div className="bg-layer-text">
                  <span className="bg-name" title={layer.name}>
                    {layer.name}
                  </span>
                  <span className="bg-layer-meta">
                    {positionLabel(layer.position)} · {modeLabel(layer.mode)} · {layer.opacity}%
                    {layer.rotation !== 0 ? ` · ${layer.rotation}°` : ''}
                  </span>
                </div>
                <div className="bg-layer-actions" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => move(layer.id, -1)}
                  >
                    &#9652;
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={index === layers.length - 1}
                    onClick={() => move(layer.id, 1)}
                  >
                    &#9662;
                  </button>
                  <button type="button" title="Remove layer" onClick={() => remove(layer.id)}>
                    &#10005;
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="panel-hint bg-stack-hint">
            Layers draw in order; the last image sits on top. Offsets are a percentage of the page,
            and rotation turns each layer around its anchor.
          </p>
          {selected ? (
            <>
              <Field label={`Opacity · ${selected.opacity}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={selected.opacity}
                  onChange={(event) => update({ opacity: Number(event.target.value) })}
                />
              </Field>
              <Field label="Size">
                <select
                  value={selected.mode}
                  onChange={(event) =>
                    update({ mode: event.target.value as BackgroundImageSettings['mode'] })
                  }
                >
                  {BACKGROUND_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </Field>
              {selected.mode === 'scale' ? (
                <Field label={`Image width · ${selected.scale}%`}>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={1}
                    value={selected.scale}
                    onChange={(event) => update({ scale: Number(event.target.value) })}
                  />
                </Field>
              ) : null}
              <Field label="Anchor">
                <select
                  value={selected.position}
                  onChange={(event) =>
                    update({ position: event.target.value as BackgroundImageSettings['position'] })
                  }
                >
                  {BACKGROUND_POSITIONS.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Horizontal offset · ${selected.offsetX}%`}>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={selected.offsetX}
                  onChange={(event) => update({ offsetX: Number(event.target.value) })}
                />
              </Field>
              <Field label={`Vertical offset · ${selected.offsetY}%`}>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={selected.offsetY}
                  onChange={(event) => update({ offsetY: Number(event.target.value) })}
                />
              </Field>
              <Field label={`Rotation · ${selected.rotation}°`}>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={selected.rotation}
                  onChange={(event) => update({ rotation: Number(event.target.value) })}
                />
              </Field>
              {selected.kind === 'tikz' ? (
                <button type="button" className="btn btn-tiny" onClick={() => editTikz(selected)}>
                  Edit drawing
                </button>
              ) : null}
            </>
          ) : null}
          <div className="bg-row">
            <button type="button" className="btn btn-tiny" onClick={() => fileRef.current?.click()}>
              {busy ? 'Reading…' : 'Add image'}
            </button>
            <button type="button" className="btn btn-tiny" onClick={addTikz}>
              Add TikZ
            </button>
            {onReset && resetLabel ? (
              <button type="button" className="btn btn-tiny" onClick={onReset}>
                {resetLabel}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="panel-hint">{inherited ? inheritedLabel : emptyLabel}</p>
          <div className="bg-row">
            <button type="button" className="btn btn-tiny" onClick={() => fileRef.current?.click()}>
              {busy ? 'Reading…' : 'Choose image'}
            </button>
            <button type="button" className="btn btn-tiny" onClick={addTikz}>
              TikZ drawing
            </button>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void add(file);
        }}
      />
    </section>
  );
}
