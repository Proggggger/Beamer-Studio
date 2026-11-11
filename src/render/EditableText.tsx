import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Inline } from './inline';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  style?: CSSProperties;
  onSelect?: () => void;
  render?: (value: string) => ReactNode;
}

export function EditableText({
  value,
  onChange,
  editable,
  className,
  multiline = false,
  placeholder,
  style,
  onSelect,
  render,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [editing]);

  const beginEdit = () => {
    if (!editable) return;
    setDraft(value);
    setEditing(true);
    onSelect?.();
  };

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key === 'Enter' && (!multiline || !event.shiftKey)) {
      event.preventDefault();
      commit();
      event.currentTarget.blur();
    }
  };

  if (editing) {
    return (
      <textarea
        ref={inputRef}
        className={`bx-edit-input ${className ?? ''}`}
        style={style}
        value={draft}
        rows={multiline ? Math.max(2, draft.split('\n').length) : 1}
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onInput={(event) => {
          const target = event.currentTarget;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        aria-label={placeholder ?? 'Edit LaTeX text'}
      />
    );
  }

  return (
    <span
      className={`bx-editable ${className ?? ''}`}
      style={style}
      onDoubleClick={(event) => {
        if (!editable) return;
        event.stopPropagation();
        beginEdit();
      }}
      onClick={(event) => {
        if (onSelect) {
          event.stopPropagation();
          onSelect();
        }
      }}
      title={editable ? 'Double-click to edit LaTeX source' : undefined}
    >
      {value ? (
        render ? (
          render(value)
        ) : (
          <Inline text={value} />
        )
      ) : (
        <span className="bx-placeholder">{placeholder ?? ' '}</span>
      )}
    </span>
  );
}
