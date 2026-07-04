// src/components/canvas/EdgePath.tsx
//
// Render 1 edge cha-con theo relStyle. Xử lý:
// - 4 connector shapes: curved, orthogonal, orthogonal-round, straight
// - Stroke-dasharray theo dashId (solid, dashed, cable...)
// - Taper polygon khi dashId là tapered/reverse-tapered/auto-tapered (mục 6.3)
// - Marker mũi tên tại điểm giao cạnh node (rectEdgePt, mục 3.3.3)

import React, { memo } from "react";
import { Path } from "react-native-svg";
import { MindMapNode, DEFAULT_RELATION_STYLE } from "../../types/mindmap";
import { effectiveStyle } from "../../utils/relStyle";
import { rectEdgePt, Point } from "../../utils/geometry";
import { buildTaperPolygon, isTaperDash } from "../../utils/taperPath";
import { markerId } from "./ArrowMarker";

const DEFAULT_W = 160;
const DEFAULT_H = 48;
const DEFAULT_LINE_WIDTH = 2;

function halfW(n: MindMapNode): number {
  return (n.w ?? DEFAULT_W) / 2;
}
function halfH(n: MindMapNode): number {
  return (n.h ?? DEFAULT_H) / 2;
}

function getDashArray(dashId: string, width: number): string | undefined {
  const w = Math.max(width, 1);
  switch (dashId) {
    case "solid":
    case "thin-solid":
      return undefined;
    case "dashed-thin":
      return `${w * 4} ${w * 3}`;
    case "cable":
      return `${w * 8} ${w * 2}`;
    case "wide-dash":
      return `${w * 12} ${w * 4}`;
    case "double":
      return undefined; // double dùng 2 path chồng nhau — xử lý riêng
    case "dashed-double":
      return `${w * 6} ${w * 3}`;
    default:
      return undefined;
  }
}

// Lấy mẫu điểm trên đường cong bezier (dùng cho taper polygon)
function sampleCubicBezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  steps = 30
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
      y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
    });
  }
  return pts;
}

// Xây dựng SVG path data cho các connector shapes
function buildPathD(
  fromPt: Point,
  toPt: Point,
  parentX: number,
  parentY: number,
  shape: string
): { d: string; samplePoints: Point[] } {
  const fx = fromPt.x;
  const fy = fromPt.y;
  const tx = toPt.x;
  const ty = toPt.y;

  switch (shape) {
    case "straight":
      return {
        d: `M ${fx} ${fy} L ${tx} ${ty}`,
        samplePoints: [fromPt, toPt],
      };

    case "orthogonal": {
      const midX = (fx + tx) / 2;
      const d = `M ${fx} ${fy} H ${midX} V ${ty} H ${tx}`;
      return {
        d,
        samplePoints: [
          fromPt,
          { x: midX, y: fy },
          { x: midX, y: ty },
          toPt,
        ],
      };
    }

    case "orthogonal-round": {
      const midX = (fx + tx) / 2;
      const r = 12;
      // Rounded elbows dùng arc
      const d =
        `M ${fx} ${fy} H ${midX - r} Q ${midX} ${fy} ${midX} ${fy + (ty > fy ? r : -r)} ` +
        `V ${ty - (ty > fy ? r : -r)} Q ${midX} ${ty} ${midX + r} ${ty} H ${tx}`;
      return {
        d,
        samplePoints: [
          fromPt,
          { x: midX, y: fy },
          { x: midX, y: ty },
          toPt,
        ],
      };
    }

    case "curved":
    default: {
      const dx = tx - fx;
      const cp1: Point = { x: fx + dx * 0.5, y: fy };
      const cp2: Point = { x: tx - dx * 0.5, y: ty };
      return {
        d: `M ${fx} ${fy} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${tx} ${ty}`,
        samplePoints: sampleCubicBezier(fromPt, cp1, cp2, toPt),
      };
    }
  }
}

interface Props {
  child: MindMapNode;
  parent: MindMapNode;
  onTap?: () => void;
}

function EdgePathInner({ child, parent, onTap }: Props) {
  const style = effectiveStyle(child.relStyle);
  const lineWidth = style.width ?? DEFAULT_LINE_WIDTH;
  const color = style.color ?? "#818cf8";

  // Điểm xuất phát: cạnh node cha (rectEdgePt về phía con) — mục 3.3.3
  const fromPt = rectEdgePt(
    parent.x, parent.y, halfW(parent), halfH(parent), child.x, child.y
  );
  // Điểm đến: cạnh node con (rectEdgePt về phía cha)
  const toPt = rectEdgePt(
    child.x, child.y, halfW(child), halfH(child), parent.x, parent.y
  );

  const { d, samplePoints } = buildPathD(fromPt, toPt, parent.x, parent.y, style.shape);

  // Marker IDs
  const markerStartId = style.arrowStart !== "none"
    ? markerId(style.arrowStart, color, lineWidth)
    : undefined;
  const markerEndId = style.arrowEnd !== "none"
    ? markerId(style.arrowEnd, color, lineWidth)
    : undefined;

  const commonStrokeProps = {
    stroke: color,
    strokeWidth: lineWidth,
    fill: "none",
    markerStart: markerStartId ? `url(#${markerStartId})` : undefined,
    markerEnd: markerEndId ? `url(#${markerEndId})` : undefined,
    onPress: onTap,
  };

  // Taper polygon (mục 6.3)
  if (isTaperDash(style.dashId)) {
    const taperDir =
      style.dashId === "auto-tapered"
        ? "auto-tapered"
        : style.dashId === "reverse-tapered"
        ? "reverse-tapered"
        : "tapered";
    const polyD = buildTaperPolygon(samplePoints, lineWidth * 1.5, 0.5, taperDir);
    return (
      <Path
        d={polyD}
        fill={color}
        stroke="none"
        onPress={onTap}
      />
    );
  }

  const dashArray = getDashArray(style.dashId, lineWidth);

  return (
    <Path
      {...commonStrokeProps}
      d={d}
      strokeDasharray={dashArray}
    />
  );
}

export const EdgePath = memo(EdgePathInner, (prev, next) => {
  return (
    prev.child.id === next.child.id &&
    prev.child.x === next.child.x &&
    prev.child.y === next.child.y &&
    prev.child.relStyle === next.child.relStyle &&
    prev.parent.x === next.parent.x &&
    prev.parent.y === next.parent.y &&
    prev.parent.w === next.parent.w &&
    prev.parent.h === next.parent.h
  );
});
