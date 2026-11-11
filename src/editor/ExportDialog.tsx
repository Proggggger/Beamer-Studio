import { useEffect, useMemo, useState } from 'react';
import { useDeckStore } from '../model/store';
import { dataUrlToBlob, downloadBlob, downloadText, slugify } from '../export/download';
import { collectImages, toLatex } from '../export/toLatex';
import { fontOption } from '../themes/fonts';
import { languageOption } from '../themes/languages';

export function ExportDialog() {
  const deck = useDeckStore((state) => state.deck);
  const showExport = useDeckStore((state) => state.showExport);
  const setShowExport = useDeckStore((state) => state.setShowExport);
  const [copied, setCopied] = useState(false);
  const tex = useMemo(() => toLatex(deck), [deck]);
  const images = useMemo(() => collectImages(deck), [deck]);
  const filename = `${slugify(deck.meta.title)}.tex`;
  const font = fontOption(deck.theme.fontFamily);
  const mainLanguage = languageOption(deck.document.mainLanguage);
  const extraLanguages = deck.document.otherLanguages.map((id) => languageOption(id).label);

  useEffect(() => {
    if (!showExport) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowExport(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showExport, setShowExport]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!showExport) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tex);
    } catch {
      const area = document.createElement('textarea');
      area.value = tex;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowExport(false);
      }}
    >
      <div className="modal export-modal" role="dialog" aria-modal="true" aria-label="Export LaTeX">
        <header className="modal-head">
          <div>
            <h2>Export LaTeX</h2>
            <p className="muted small">
              {deck.slides.length} slides · {tex.split('\n').length} lines · {filename}
            </p>
            <p className="muted small">
              XeLaTeX · {font.label} · {deck.document.fontSize}pt · {mainLanguage.label}
              {extraLanguages.length > 0 ? ` + ${extraLanguages.join(', ')}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn close-btn"
            onClick={() => setShowExport(false)}
            aria-label="Close"
          >
            &#10005;
          </button>
        </header>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={copy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => downloadText(filename, tex, 'application/x-tex;charset=utf-8')}
          >
            Download .tex
          </button>
        </div>
        <pre className="code-view" tabIndex={0}>
          <code>{tex}</code>
        </pre>
        {images.length > 0 ? (
          <section className="export-images">
            <h3>Referenced image files</h3>
            <p className="muted small">
              The .tex file references these names. Download them next to the .tex file before
              compiling.
            </p>
            <div className="export-image-list">
              {images.map((image) => (
                <div className="export-image-row" key={`${image.block.id}-${image.name}`}>
                  <img src={image.dataUrl} alt={image.name} />
                  <span className="export-image-name">{image.name}</span>
                  <button
                    type="button"
                    className="btn btn-tiny"
                    onClick={() => {
                      const blob = dataUrlToBlob(image.dataUrl);
                      downloadBlob(image.name, blob, blob.type || 'application/octet-stream');
                    }}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <footer className="modal-foot muted small">
          Compile with <code>xelatex {filename}</code> (the file starts with a{' '}
          <code>% !TeX program = xelatex</code> comment). It uses fontspec and polyglossia, so
          compile it with XeLaTeX rather than pdfLaTeX; the chosen font must be installed.
        </footer>
      </div>
    </div>
  );
}
