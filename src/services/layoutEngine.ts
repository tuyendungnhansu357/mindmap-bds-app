// src/services/layoutEngine.ts
//
// Pure function, không phụ thuộc DOM/React Native — có thể unit test bằng
// Jest độc lập (mục 5 spec). Hợp đồng:
//
//   applyLayout(nodes, layoutType, rootId?) -> nodes đã cập nhật x, y
//
// rootId nếu có -> chỉ layout nhánh con của rootId (applySubtreeLayout ở
// bản web), các node ngoài nhánh giữ nguyên vị trí.

import { LayoutType, MindMapNode } from "../types/mindmap";

const DEFAULT_NODE_W = 160;
const DEFAULT_NODE_H = 48;
const H_GAP = 60; // khoảng cách ngang giữa các tầng
const V_GAP = 24; // khoảng cách dọc giữa các node anh em

interface TreeNode {
  node: MindMapNode;
  children: TreeNode[];
}

function buildForest(nodes: MindMapNode[], rootId?: string): TreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string | null, MindMapNode[]>();

  for (const n of nodes) {
    const key = n.parentId;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(n);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function build(n: MindMapNode): TreeNode {
    const kids = (childrenOf.get(n.id) ?? []).map(build);
    return { node: n, children: kids };
  }

  if (rootId) {
    const root = byId.get(rootId);
    if (!root) return [];
    return [build(root)];
  }

  const topLevel = childrenOf.get(null) ?? [];
  return topLevel.map(build);
}

function flatten(tree: TreeNode[]): MindMapNode[] {
  const out: MindMapNode[] = [];
  function walk(t: TreeNode) {
    out.push(t.node);
    t.children.forEach(walk);
  }
  tree.forEach(walk);
  return out;
}

function nodeH(n: MindMapNode): number {
  return n.h ?? DEFAULT_NODE_H;
}
function nodeW(n: MindMapNode): number {
  return n.w ?? DEFAULT_NODE_W;
}

// ---------- Horizontal: gốc bên trái, con toả sang phải theo tầng ----------
function layoutHorizontal(forest: TreeNode[], originX: number, originY: number): void {
  let cursorY = originY;

  function place(t: TreeNode, depth: number): number {
    const x = originX + depth * (nodeW(t.node) + H_GAP);
    if (t.children.length === 0) {
      t.node.x = x;
      t.node.y = cursorY;
      cursorY += nodeH(t.node) + V_GAP;
      return t.node.y;
    }
    const childYs = t.children.map((c) => place(c, depth + 1));
    const centerY = (childYs[0] + childYs[childYs.length - 1]) / 2;
    t.node.x = x;
    t.node.y = centerY;
    return centerY;
  }

  for (const root of forest) {
    place(root, 0);
  }
}

// ---------- Vertical: gốc trên cùng, con xuống dưới theo tầng ----------
function layoutVertical(forest: TreeNode[], originX: number, originY: number): void {
  let cursorX = originX;

  function place(t: TreeNode, depth: number): number {
    const y = originY + depth * (nodeH(t.node) + V_GAP);
    if (t.children.length === 0) {
      t.node.y = y;
      t.node.x = cursorX;
      cursorX += nodeW(t.node) + H_GAP;
      return t.node.x;
    }
    const childXs = t.children.map((c) => place(c, depth + 1));
    const centerX = (childXs[0] + childXs[childXs.length - 1]) / 2;
    t.node.y = y;
    t.node.x = centerX;
    return centerX;
  }

  for (const root of forest) {
    place(root, 0);
  }
}

// ---------- List: tất cả node xếp dọc 1 cột, thụt lề theo depth ----------
function layoutList(forest: TreeNode[], originX: number, originY: number): void {
  let cursorY = originY;
  function place(t: TreeNode, depth: number) {
    t.node.x = originX + depth * 24;
    t.node.y = cursorY;
    cursorY += nodeH(t.node) + 8;
    t.children.forEach((c) => place(c, depth + 1));
  }
  forest.forEach((r) => place(r, 0));
}

// ---------- TopDown: giống Vertical nhưng tầng cách đều, không lệch tâm con ----------
function layoutTopDown(forest: TreeNode[], originX: number, originY: number): void {
  layoutVertical(forest, originX, originY);
}

// ---------- Linear: 1 hàng ngang duy nhất theo thứ tự duyệt cây ----------
function layoutLinear(forest: TreeNode[], originX: number, originY: number): void {
  let cursorX = originX;
  function place(t: TreeNode) {
    t.node.x = cursorX;
    t.node.y = originY;
    cursorX += nodeW(t.node) + H_GAP;
    t.children.forEach(place);
  }
  forest.forEach(place);
}

// ---------- Radial: gốc ở tâm, con toả tròn theo tầng ----------
function layoutRadial(forest: TreeNode[], originX: number, originY: number): void {
  const RING_GAP = 140;

  function countLeaves(t: TreeNode): number {
    if (t.children.length === 0) return 1;
    return t.children.reduce((s, c) => s + countLeaves(c), 0);
  }

  function place(t: TreeNode, depth: number, angleStart: number, angleEnd: number) {
    const angle = (angleStart + angleEnd) / 2;
    const radius = depth * RING_GAP;
    t.node.x = originX + radius * Math.cos(angle);
    t.node.y = originY + radius * Math.sin(angle);

    if (t.children.length === 0) return;
    const totalLeaves = countLeaves(t);
    let cursor = angleStart;
    for (const child of t.children) {
      const span = ((angleEnd - angleStart) * countLeaves(child)) / totalLeaves;
      place(child, depth + 1, cursor, cursor + span);
      cursor += span;
    }
  }

  // gốc đặt ở tâm (depth 0), các root toả đều quanh 360 độ
  const twoPi = Math.PI * 2;
  const slice = twoPi / Math.max(forest.length, 1);
  forest.forEach((root, i) => {
    place(root, 1, i * slice, (i + 1) * slice);
    root.node.x = originX;
    root.node.y = originY;
  });
}

// ---------- Matrix: lưới hàng/cột đều nhau theo thứ tự duyệt cây (BFS) ----------
function layoutMatrix(forest: TreeNode[], originX: number, originY: number): void {
  const all = flatten(forest);
  const cols = Math.ceil(Math.sqrt(all.length || 1));
  const cellW = DEFAULT_NODE_W + H_GAP;
  const cellH = DEFAULT_NODE_H + V_GAP;

  all.forEach((n, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    n.x = originX + col * cellW;
    n.y = originY + row * cellH;
  });
}

/**
 * Tính vị trí (x, y) cho từng node theo layoutType đã chọn.
 * Nếu rootId được truyền vào, chỉ layout nhánh con của rootId (subtree
 * layout) — các node khác trong map giữ nguyên vị trí cũ.
 */
export function applyLayout(
  nodes: MindMapNode[],
  layoutType: LayoutType,
  rootId?: string
): MindMapNode[] {
  if (layoutType === "free") {
    // Free Form: giữ nguyên vị trí thủ công, không tính toán gì.
    return nodes;
  }

  // Làm việc trên bản sao để giữ nguyên tính "pure function".
  const cloned = nodes.map((n) => ({ ...n }));
  const forest = buildForest(cloned, rootId);
  if (forest.length === 0) return cloned;

  const originNode = rootId
    ? cloned.find((n) => n.id === rootId)
    : undefined;
  const originX = originNode?.x ?? 0;
  const originY = originNode?.y ?? 0;

  switch (layoutType) {
    case "horizontal":
      layoutHorizontal(forest, originX, originY);
      break;
    case "vertical":
      layoutVertical(forest, originX, originY);
      break;
    case "list":
      layoutList(forest, originX, originY);
      break;
    case "topdown":
      layoutTopDown(forest, originX, originY);
      break;
    case "linear":
      layoutLinear(forest, originX, originY);
      break;
    case "radial":
      layoutRadial(forest, originX, originY);
      break;
    case "matrix":
      layoutMatrix(forest, originX, originY);
      break;
    default:
      break;
  }

  return cloned;
}

/** Layout cho 1 nhánh cụ thể — alias tường minh theo tên hàm trong spec/bản web. */
export function applySubtreeLayout(
  nodes: MindMapNode[],
  layoutType: LayoutType,
  rootId: string
): MindMapNode[] {
  return applyLayout(nodes, layoutType, rootId);
}
