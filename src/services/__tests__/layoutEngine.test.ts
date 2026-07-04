// src/services/__tests__/layoutEngine.test.ts

import { applyLayout } from "../layoutEngine";
import { MindMapNode } from "../../types/mindmap";

function makeNode(partial: Partial<MindMapNode> & { id: string }): MindMapNode {
  return {
    mapId: "m1",
    parentId: null,
    title: "n",
    x: 0,
    y: 0,
    w: null,
    h: null,
    color: "blue",
    icon: null,
    collapsed: false,
    relStyle: null,
    sortOrder: 0,
    ...partial,
  };
}

describe("applyLayout", () => {
  it("free layout giữ nguyên vị trí thủ công", () => {
    const nodes = [makeNode({ id: "a", x: 123, y: 456 })];
    const result = applyLayout(nodes, "free");
    expect(result[0].x).toBe(123);
    expect(result[0].y).toBe(456);
  });

  it("horizontal layout đặt con sang phải của cha", () => {
    const nodes = [
      makeNode({ id: "root", parentId: null }),
      makeNode({ id: "c1", parentId: "root", sortOrder: 0 }),
      makeNode({ id: "c2", parentId: "root", sortOrder: 1 }),
    ];
    const result = applyLayout(nodes, "horizontal");
    const root = result.find((n) => n.id === "root")!;
    const c1 = result.find((n) => n.id === "c1")!;
    const c2 = result.find((n) => n.id === "c2")!;
    expect(c1.x).toBeGreaterThan(root.x);
    expect(c2.x).toBeGreaterThan(root.x);
    expect(c1.y).not.toBe(c2.y);
  });

  it("vertical layout đặt con xuống dưới cha", () => {
    const nodes = [
      makeNode({ id: "root", parentId: null }),
      makeNode({ id: "c1", parentId: "root" }),
    ];
    const result = applyLayout(nodes, "vertical");
    const root = result.find((n) => n.id === "root")!;
    const c1 = result.find((n) => n.id === "c1")!;
    expect(c1.y).toBeGreaterThan(root.y);
  });

  it("không phải pure mutate input array gốc", () => {
    const nodes = [makeNode({ id: "a", parentId: null })];
    const original = { ...nodes[0] };
    applyLayout(nodes, "vertical");
    expect(nodes[0]).toEqual(original);
  });

  it("subtree layout (rootId) chỉ ảnh hưởng nhánh con của rootId", () => {
    const nodes = [
      makeNode({ id: "r1", parentId: null, x: 0, y: 0 }),
      makeNode({ id: "r1c1", parentId: "r1" }),
      makeNode({ id: "other", parentId: null, x: 999, y: 999 }),
    ];
    const result = applyLayout(nodes, "vertical", "r1");
    const other = result.find((n) => n.id === "other")!;
    expect(other.x).toBe(999);
    expect(other.y).toBe(999);
  });

  it("radial layout: con có khoảng cách khác 0 so với root (toả ra ngoài)", () => {
    const nodes = [
      makeNode({ id: "root", parentId: null }),
      makeNode({ id: "c1", parentId: "root" }),
      makeNode({ id: "c2", parentId: "root" }),
    ];
    const result = applyLayout(nodes, "radial");
    const root = result.find((n) => n.id === "root")!;
    const c1 = result.find((n) => n.id === "c1")!;
    const dist = Math.hypot(c1.x - root.x, c1.y - root.y);
    expect(dist).toBeGreaterThan(0);
  });

  it("matrix layout xếp tất cả node vào lưới hợp lệ (không trùng toạ độ)", () => {
    const nodes = [
      makeNode({ id: "a" }),
      makeNode({ id: "b" }),
      makeNode({ id: "c" }),
      makeNode({ id: "d" }),
    ];
    const result = applyLayout(nodes, "matrix");
    const coords = result.map((n) => `${n.x},${n.y}`);
    expect(new Set(coords).size).toBe(coords.length);
  });
});
