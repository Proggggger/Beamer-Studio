import { create } from 'zustand';
import type { TikzDrawing } from '../model/types';

interface TikzEditorRequest {
  id: number;
  title: string;
  drawing: TikzDrawing;
  onSave: (drawing: TikzDrawing) => void;
}

interface TikzEditorStore {
  request: TikzEditorRequest | null;
  open: (request: Omit<TikzEditorRequest, 'id'>) => void;
  close: () => void;
}

let sequence = 0;

export const useTikzEditorStore = create<TikzEditorStore>((set) => ({
  request: null,
  open: (request) => {
    sequence += 1;
    set({ request: { ...request, id: sequence } });
  },
  close: () => set({ request: null }),
}));

export function openTikzEditor(
  title: string,
  drawing: TikzDrawing,
  onSave: (drawing: TikzDrawing) => void,
): void {
  useTikzEditorStore.getState().open({ title, drawing, onSave });
}
