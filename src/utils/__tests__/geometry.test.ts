// src/utils/__tests__/geometry.test.ts

import { rectEdgePt } from "../geometry";

describe("rectEdgePt", () => {
  it("trả về điểm trên cạnh phải khi target nằm thẳng bên phải", () => {
    const p = rectEdgePt(0, 0, 50, 20, 200, 0);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(0);
  });

  it("trả về điểm trên cạnh trên khi target nằm thẳng phía trên", () => {
    const p = rectEdgePt(0, 0, 50, 20, 0, -200);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-20);
  });

  it("trả về điểm trên góc gần đúng khi target nằm chéo 45 độ với rect vuông", () => {
    const p = rectEdgePt(0, 0, 50, 50, 200, 200);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(50);
  });

  it("không trả về toạ độ tâm node khi target khác tâm", () => {
    const p = rectEdgePt(100, 100, 50, 20, 300, 100);
    expect(p).not.toEqual({ x: 100, y: 100 });
  });
});
