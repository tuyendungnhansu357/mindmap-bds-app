// src/store/undoStore.ts
//
// Undo/redo đơn giản theo snapshot toàn bộ MindMapDoc. Với giới hạn 1000
// node (mục 7 spec) cách này đủ nhanh và an toàn hơn nhiều so với patch-diff.

import { create } from "zustand";
import { MindMapDoc } from "../types/mindmap";
import { useMapStore } from "./mapStore";

const MAX_HISTORY = 50;

interface UndoState {
  past: MindMapDoc[];
  future: MindMapDoc[];
  pushSnapshot: (doc: MindMapDoc) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

function clone(doc: MindMapDoc): MindMapDoc {
  return JSON.parse(JSON.stringify(doc));
}

export const useUndoStore = create<UndoState>((set, get) => ({
  past: [],
  future: [],

  pushSnapshot: (doc) => {
    set((s) => ({
      past: [...s.past, clone(doc)].slice(-MAX_HISTORY),
      future: [],
    }));
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;
    const current = useMapStore.getState().doc;
    const previous = past[past.length - 1];
    set((s) => ({
      past: s.past.slice(0, -1),
      future: current ? [clone(current), ...s.future] : s.future,
    }));
    useMapStore.setState({ doc: previous });
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;
    const current = useMapStore.getState().doc;
    const next = future[0];
    set((s) => ({
      future: s.future.slice(1),
      past: current ? [...s.past, clone(current)] : s.past,
    }));
    useMapStore.setState({ doc: next });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));
