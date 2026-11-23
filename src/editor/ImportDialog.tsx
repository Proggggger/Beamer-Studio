import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useDeckStore } from '../model/store';
import { importBeamer, type ImportResult } from '../import/fromLatex';

export function ImportDialog() {
  const showImport = useDeckStore((state) => state.showImport);
  const setShowImport = useDeckStore((state) => state.setShowImport);
  const replaceDeck = useDeckStore((state) => state.replaceDeck);
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showImport) return;
    setSource('');
    setFileName('');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowImport(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showImport, setShowImport]);

  const parsed = useMemo((): { result: ImportResult | null; error: string | null } => {
    if (!source.trim()) return { result: null, error: null };
    try {
      return { result: importBeamer(source), error: null };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Could not parse the LaTeX source.',
      };
    }
  }, [source]);

  if (!showImport) return null;

  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setSource(await file.text());
      setFileName(file.name);
    } catch {
      window.alert('Could not read that file.');
    }
  };

  const runImport = () => {
    if (!parsed.result) return;
    replaceDeck(parsed.result.deck);
    setShowImport(false);
  };

  const warnings = parsed.result?.warnings ?? [];
  const slideCount = parsed.result?.deck.slides.length ?? 0;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowImport(false);
      }}
    >
      <div className="modal import-modal" role="dialog" aria-modal="true" aria-label="Import LaTeX">
        <header className="modal-head">
          <div>
            <h2>Import Beamer LaTeX</h2>
            <p className="muted small">
              Paste a `.tex` file or open one from disk. The parser maps common Beamer structure
              onto editor blocks; anything it cannot model is reported below and kept as plain
              content where possible.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn close-btn"
            onClick={() => setShowImport(false)}
            aria-label="Close"
          >
            &#10005;
          </button>
        </header>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Open .tex file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".tex,.latex,.ltx,text/x-tex,text/plain"
            hidden
            onChange={openFile}
          />
          {fileName ? <span className="muted small import-file-name">{fileName}</span> : null}
        </div>
        <textarea
          className="import-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={'\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}{Title}\n  \\begin{itemize}\n  \\item First point\n  \\end{itemize}\n\\end{frame}\n\\end{document}'}
          spellCheck={false}
          aria-label="LaTeX source"
        />
        <div className="import-status">
          {parsed.error ? (
            <p className="import-error">{parsed.error}</p>
          ) : parsed.result ? (
            <p className="muted small">
              {slideCount} slide{slideCount === 1 ? '' : 's'} detected ·{' '}
              {warnings.length === 0
                ? 'no warnings'
                : `${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
            </p>
          ) : (
            <p className="muted small">Paste source above to preview what will be imported.</p>
          )}
        </div>
        {warnings.length > 0 ? (
          <ul className="import-warnings">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <footer className="modal-foot import-foot">
          <p className="muted small">
            Importing replaces the current deck and clears undo history. Images become
            placeholders; reattach the files from the image inspector afterwards.
          </p>
          <div className="import-buttons">
            <button type="button" className="btn" onClick={() => setShowImport(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={runImport}
              disabled={!parsed.result}
            >
              Import into editor
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
