import { useEffect, useState } from 'react';
import { DesignPanel } from './editor/DesignPanel';
import { ExportDialog } from './editor/ExportDialog';
import { ImportDialog } from './editor/ImportDialog';
import { Inspector } from './editor/Inspector';
import { PreviewPane } from './editor/PreviewPane';
import { SlideRail } from './editor/SlideRail';
import { TikzEditorHost } from './editor/TikzEditor';
import { Toolbar } from './editor/Toolbar';
import { downloadProject } from './model/projectIO';
import { saveDeck } from './model/persistence';
import { useDeckStore } from './model/store';

export function App() {
  const rightTab = useDeckStore((state) => state.rightTab);
  const setRightTab = useDeckStore((state) => state.setRightTab);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let timer = 0;
    const unsubscribe = useDeckStore.subscribe((state, previous) => {
      if (state.deck === previous.deck) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        saveDeck(state.deck);
        setSavedAt(Date.now());
      }, 300);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !typing) {
        event.preventDefault();
        if (event.shiftKey) useDeckStore.getState().redo();
        else useDeckStore.getState().undo();
      } else if (key === 'y' && !typing) {
        event.preventDefault();
        useDeckStore.getState().redo();
      } else if (key === 's') {
        event.preventDefault();
        downloadProject(useDeckStore.getState().deck);
      } else if (key === 'e' && !typing) {
        event.preventDefault();
        useDeckStore.getState().setShowExport(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <SlideRail />
        <PreviewPane />
        <aside className="side-panel">
          <div className="side-tabs">
            <button
              type="button"
              className={rightTab === 'design' ? 'is-active' : ''}
              onClick={() => setRightTab('design')}
            >
              Design
            </button>
            <button
              type="button"
              className={rightTab === 'edit' ? 'is-active' : ''}
              onClick={() => setRightTab('edit')}
            >
              Slide
            </button>
          </div>
          <div className="side-body">
            {rightTab === 'design' ? <DesignPanel /> : <Inspector />}
          </div>
          <div className="side-foot">
            {savedAt ? 'Saved to this browser' : 'Autosave enabled'}
          </div>
        </aside>
      </div>
      <div className="statusbar">
        <span>Double-click any text on the slide to edit its LaTeX source.</span>
        <span className="statusbar-keys">Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+S save project</span>
      </div>
      <ExportDialog />
      <ImportDialog />
      <TikzEditorHost />
    </div>
  );
}
