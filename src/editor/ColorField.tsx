import { useEffect, useState } from 'react';
import { isHexColor } from '../themes/colorMath';

export function ColorField({
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
