// src/store/mapStore.ts
//
// Zustand store = single source of truth runtime (mục 2.3 spec).
// SQLite chỉ là persistence layer: đọc 1 lần lúc mở map, ghi mỗi khi store
// thay đổi với debounce 500ms (KHÔNG ghi liên tục theo từng frame kéo node).

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  CrossLink,
  FREE_PLAN_LIMITS,
  LayoutType,
  MindMapDoc,
  MindMapNode,
} from "../types/mindmap";
import { applyLayout } from "../services/layoutEngine";
import { updateRelStyleField } from "../utils/relStyle";
import { loadMapDoc, persistMapDoc } from "../db/mapRepository";

const PERSIST_DEBOUNCE_MS = 500;

interface MapState {
  doc: MindMapDoc | null;
  selectedNodeIds: string[];
  selectedCrossLinkId: string | null;
  isFree: boolean; // true nếu user đang ở gói Free (ảnh hưởng giới hạn node)

  loadMap: (mapId: string) => Promise<void>;
  selectNode: (id: string, additive?: boolean) => void;
  clearSelection: () => void;

  addChildNode: (parentId: string | null, title: string) => string | null;
  updateNodeTitle: (id: string, title: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  moveSubtree: (rootId: string, dx: number, dy: number) => void;
  deleteNode: (id: string) => void;
  toggleCollapsed: (id: string) => void;

  setNodeRelStyleField: (nodeId: string, field: any, value: any) => void;

  addCrossLink: (fromId: string, toId: string) => void;
  deleteCrossLink: (id: string) => void;

  runLayout: (layoutType: LayoutType, rootId?: string) => void;

  _schedulePersist: () => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useMapStore = create<MapState>((set, get) => ({
  doc: null,
  selectedNodeIds: [],
  selectedCrossLinkId: null,
  isFree: true,

  loadMap: async (mapId: string) => {
    const doc = await loadMapDoc(mapId);
    set({ doc, selectedNodeIds: [], selectedCrossLinkId: null });
  },

  selectNode: (id, additive = false) => {
    set((s) => {
      if (additive) {
        const exists = s.selectedNodeIds.includes(id);
        return {
          selectedNodeIds: exists
            ? s.selectedNodeIds.filter((x) => x !== id)
            : [...s.selectedNodeIds, id],
          selectedCrossLinkId: null,
        };
      }
      return { selectedNodeIds: [id], selectedCrossLinkId: null };
    });
  },

  clearSelection: () => set({ selectedNodeIds: [], selectedCrossLinkId: null }),

  addChildNode: (parentId, title) => {
    const { doc, isFree } = get();
    if (!doc) return null;

    if (isFree && doc.nodes.length >= FREE_PLAN_LIMITS.maxNodesPerMap) {
      // Caller (UI) nên hiển thị cảnh báo giới hạn gói Free (mục 9 spec).
      return null;
    }

    const parent = parentId ? doc.nodes.find((n) => n.id === parentId) : null;
    const newNode: MindMapNode = {
      id: uuidv4(),
      mapId: doc.id,
      parentId: parentId,
      title,
      x: parent ? parent.x + 200 : 0,
      y: parent ? parent.y : 0,
      w: null,
      h: null,
      color: parent?.color ?? "indigo",
      icon: null,
      collapsed: false,
      relStyle: null,
      sortOrder: doc.nodes.filter((n) => n.parentId === parentId).length,
    };

    set({ doc: { ...doc, nodes: [...doc.nodes, newNode], updatedAt: Date.now() } });
    get()._schedulePersist();
    return newNode.id;
  },

  updateNodeTitle: (id, title) => {
    const { doc } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        nodes: doc.nodes.map((n) => (n.id === id ? { ...n, title } : n)),
        updatedAt: Date.now(),
      },
    });
    get()._schedulePersist();
  },

  updateNodePosition: (id, x, y) => {
    const { doc } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        nodes: doc.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
        updatedAt: Date.now(),
      },
    });
    get()._schedulePersist();
  },

  moveSubtree: (rootId, dx, dy) => {
    const { doc } = get();
    if (!doc) return;

    const idsToMove = new Set<string>();
    function collect(id: string) {
      idsToMove.add(id);
      doc.nodes.filter((n) => n.parentId === id).forEach((c) => collect(c.id));
    }
    collect(rootId);

    set({
      doc: {
        ...doc,
        nodes: doc.nodes.map((n) =>
          idsToMove.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
        ),
        updatedAt: Date.now(),
      },
    });
    get()._schedulePersist();
  },

  deleteNode: (id) => {
    const { doc } = get();
    if (!doc) return;

    const idsToDelete = new Set<string>();
    function collect(nid: string) {
      idsToDelete.add(nid);
      doc.nodes.filter((n) => n.parentId === nid).forEach((c) => collect(c.id));
    }
    collect(id);

    set({
      doc: {
        ...doc,
        nodes: doc.nodes.filter((n) => !idsToDelete.has(n.id)),
        crossLinks: doc.crossLinks.filter(
          (cl) => !idsToDelete.has(cl.fromId) && !idsToDelete.has(cl.toId)
        ),
        updatedAt: Date.now(),
      },
      selectedNodeIds: [],
    });
    get()._schedulePersist();
  },

  toggleCollapsed: (id) => {
    const { doc } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        nodes: doc.nodes.map((n) =>
          n.id === id ? { ...n, collapsed: !n.collapsed } : n
        ),
      },
    });
    get()._schedulePersist();
  },

  // Dùng updateRelStyleField — KHÔNG BAO GIỜ spread DEFAULT_RELATION_STYLE
  // vào đây (xem mục 3.3.1 spec + src/utils/relStyle.ts).
  setNodeRelStyleField: (nodeId, field, value) => {
    const { doc } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        nodes: doc.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, relStyle: updateRelStyleField(n.relStyle, field, value) }
            : n
        ),
        updatedAt: Date.now(),
      },
    });
    get()._schedulePersist();
  },

  addCrossLink: (fromId, toId) => {
    const { doc } = get();
    if (!doc) return;
    const newLink: CrossLink = {
      id: uuidv4(),
      mapId: doc.id,
      fromId,
      toId,
      label: null,
      color: null,
      cpx: null,
      cpy: null,
      relStyle: null,
    };
    set({
      doc: { ...doc, crossLinks: [...doc.crossLinks, newLink], updatedAt: Date.now() },
    });
    get()._schedulePersist();
  },

  deleteCrossLink: (id) => {
    const { doc } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        crossLinks: doc.crossLinks.filter((cl) => cl.id !== id),
        updatedAt: Date.now(),
      },
      selectedCrossLinkId: null,
    });
    get()._schedulePersist();
  },

  runLayout: (layoutType, rootId) => {
    const { doc } = get();
    if (!doc) return;
    const updatedNodes = applyLayout(doc.nodes, layoutType, rootId);
    set({
      doc: {
        ...doc,
        nodes: updatedNodes,
        layoutType: rootId ? doc.layoutType : layoutType,
        updatedAt: Date.now(),
      },
    });
    get()._schedulePersist();
  },

  _schedulePersist: () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      const { doc } = get();
      if (doc) {
        await persistMapDoc(doc);
      }
    }, PERSIST_DEBOUNCE_MS);
  },
}));
