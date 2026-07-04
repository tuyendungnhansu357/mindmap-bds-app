// src/utils/taperPath.ts
//
// Mục 6.3 spec: khi dashId thuộc nhóm taper (tapered/reverse-tapered/
// auto-tapered), KHÔNG vẽ bằng stroke-width cố định mà vẽ <Path> dạng
// polygon kín, offset 2 cạnh theo normal vector dọc theo TỪNG ĐOẠN của
// path đã chọn (cong/vuông góc/thẳng) — không nối thẳng 4 góc.

import { LineDashId } from "../types/mindmap";
import { Point } from "./geometry";
import { normalVector } from "./geometry";

export type TaperDirection = "tapered" | "reverse-tapered" | "auto-tapered";

/**
 * polylinePoints: dãy điểm rời rạc đã được lấy mẫu (sample) dọc theo path
 * thực tế (cong/vuông góc/thẳng) — caller (EdgePath/CrossLinkPath) chịu
 * trách nhiệm sample đủ dày trước khi gọi hàm này.
 *
 * startWidth/endWidth: độ rộng nét tại đầu/cuối path.
 */
export function buildTaperPolygon(
  polylinePoints: Point[],
  startWidth: number,
  endWidth: number,
  direction: TaperDirection
): string {
  if (polylinePoints.length < 2) return "";

  const n = polylinePoints.length;
  const topSide: Point[] = [];
  const bottomSide: Point[] = [];

  for (let i = 0; i < n; i++) {
    const p = polylinePoints[i];
    // Normal tại điểm i: trung bình normal của đoạn trước và đoạn sau
    // (mượt hơn so với chỉ dùng 1 đoạn).
    const segPrev = i > 0 ? normalVector(polylinePoints[i - 1], p) : null;
    const segNext = i < n - 1 ? normalVector(p, polylinePoints[i + 1]) : null;
    const normal = averageNormal(segPrev, segNext);

    const t = i / (n - 1); // 0 -> 1 dọc theo path
    const halfWidth = widthAt(t, startWidth, endWidth, direction) / 2;

    topSide.push({ x: p.x + normal.x * halfWidth, y: p.y + normal.y * halfWidth });
    bottomSide.push({ x: p.x - normal.x * halfWidth, y: p.y - normal.y * halfWidth });
  }

  const all = [...topSide, ...bottomSide.reverse()];
  return (
    `M ${all[0].x} ${all[0].y} ` +
    all
      .slice(1)
      .map((p) => `L ${p.x} ${p.y}`)
      .join(" ") +
    " Z"
  );
}

function averageNormal(a: Point | null, b: Point | null): Point {
  if (a && b) {
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }
  return a ?? b ?? { x: 0, y: 0 };
}

function widthAt(
  t: number,
  startWidth: number,
  endWidth: number,
  direction: TaperDirection
): number {
  switch (direction) {
    case "tapered":
      // rộng ở đầu, thon dần về cuối
      return startWidth + (0 - startWidth) * t === 0
        ? startWidth * (1 - t)
        : startWidth * (1 - t) + 0.01;
    case "reverse-tapered":
      // thon ở đầu, rộng dần về cuối
      return endWidth * t + 0.01;
    case "auto-tapered":
      // rộng ở giữa, thon ở 2 đầu
      return startWidth * Math.sin(Math.PI * t) + 0.01;
    default:
      return startWidth;
  }
}

export function isTaperDash(dashId: LineDashId): boolean {
  return (
    dashId === "tapered" || dashId === "reverse-tapered" || dashId === "auto-tapered"
  );
}
