// src/utils/geometry.ts

export interface Point {
  x: number;
  y: number;
}

/**
 * Tính điểm giao của tia nối tâm (cx,cy) -> (targetX,targetY) với cạnh
 * hình chữ nhật có tâm (cx,cy), nửa-rộng halfWidth, nửa-cao halfHeight.
 *
 * QUAN TRỌNG (mục 3.3.3 / 6.2 spec): marker mũi tên PHẢI dùng điểm này,
 * không phải toạ độ tâm node, nếu không marker sẽ bị node che khuất.
 */
export function rectEdgePt(
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  targetX: number,
  targetY: number
): Point {
  const dx = targetX - cx;
  const dy = targetY - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  // Tham số t sao cho điểm (cx + t*dx, cy + t*dy) nằm trên biên rect.
  const tx = dx !== 0 ? halfWidth / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? halfHeight / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);

  return {
    x: cx + dx * t,
    y: cy + dy * t,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Vector pháp tuyến đơn vị (normal) của đoạn thẳng a->b, dùng cho taper offset (mục 6.3). */
export function normalVector(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // xoay 90 độ
  return { x: -dy / len, y: dx / len };
}
