import { useRef, type ChangeEvent } from 'react';
import { useDeckStore } from '../model/store';
import { downloadProject, readProjectFile } from '../model/projectIO';

export function Toolbar() {
  const deck = useDeckStore((state) => state.deck);
  const past = useDeckStore((state) => state.past);
  const future = useDeckStore((state) => state.future);
  const updateMeta = useDeckStore((state) => state.updateMeta);
  const undo = useDeckStore((state) => state.undo);
  const redo = useDeckStore((state) => state.redo);
  const newDeck = useDeckStore((state) => state.newDeck);
  const loadSampleDeck = useDeckStore((state) => state.loadSampleDeck);
  const replaceDeck = useDeckStore((state) => state.replaceDeck);
  const setShowExport = useDeckStore((state) => state.setShowExport);
  const setShowImport = useDeckStore((state) => state.setShowImport);
  const fileRef = useRef<HTMLInputElement>(null);

  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = await readProjectFile(file);
      replaceDeck(parsed);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not open that project file.');
    }
  };

  const startNew = () => {
    if (window.confirm('Start a new presentation? The current deck will be replaced.')) {
      newDeck();
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo">B</span>
        <span className="toolbar-name">Beamer Studio</span>
      </div>
      <input
        className="toolbar-title"
        value={deck.meta.title}
        onChange={(event) => updateMeta({ title: event.target.value }, 'meta:title')}
        aria-label="Presentation title"
        spellCheck={false}
      />
      <div className="toolbar-group">
        <button type="button" className="btn" onClick={startNew} title="New presentation">
          New
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (window.confirm('Load the sample presentation? The current deck will be replaced.')) {
              loadSampleDeck();
            }
          }}
          title="Load the sample deck"
        >
          Sample
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => fileRef.current?.click()}
          title="Open a .beamer.json project"
        >
          Open
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => downloadProject(deck)}
          title="Save the project as JSON"
        >
          Save
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={openFile}
        />
        <button
          type="button"
          className="btn"
          onClick={() => setShowImport(true)}
          title="Import a Beamer .tex file"
        >
          Import .tex
        </button>
      </div>
      <div className="toolbar-group">
        <button
          type="button"
          className="btn btn-icon"
          onClick={undo}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          &#8630;
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          &#8631;
        </button>
      </div>
      <div className="toolbar-spacer" />
      <button type="button" className="btn btn-primary" onClick={() => setShowExport(true)}>
        Export LaTeX
      </button>
    </header>
  );
}
