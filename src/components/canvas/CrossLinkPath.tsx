// src/components/canvas/CrossLinkPath.tsx

import React, { memo } from "react";
import { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { CrossLink, MindMapNode } from "../../types/mindmap";
import { effectiveStyle } from "../../utils/relStyle";
import { rectEdgePt } from "../../utils/geometry";
import { buildTaperPolygon, isTaperDash } from "../../utils/taperPath";
import { markerId } from "./ArrowMarker";

const DEFAULT_W = 160;
const DEFAULT_H = 48;

function hw(n: MindMapNode) { return (n.w ?? DEFAULT_W) / 2; }
function hh(n: MindMapNode) { return (n.h ?? DEFAULT_H) / 2; }

interface Props {
  link: CrossLink;
  fromNode: MindMapNode;
  toNode: MindMapNode;
  selected: boolean;
  onTap: (id: string) => void;
  onControlPointDrag: (id: string, cpx: number, cpy: number) => void;
}

function CrossLinkPathInner({
  link,
  fromNode,
  toNode,
  selected,
  onTap,
  onControlPointDrag,
}: Props) {
  const style = effectiveStyle(link.relStyle);
  const lineWidth = style.width ?? 1.5;
  const color = link.color ?? style.color ?? "#a78bfa";

  const fromPt = rectEdgePt(
    fromNode.x, fromNode.y, hw(fromNode), hh(fromNode), toNode.x, toNode.y
  );
  const toPt = rectEdgePt(
    toNode.x, toNode.y, hw(toNode), hh(toNode), fromNode.x, fromNode.y
  );

  // Control point mặc định: trung điểm offset lên trên
  const defaultCpx = (fromPt.x + toPt.x) / 2;
  const defaultCpy = (fromPt.y + toPt.y) / 2 - 60;
  const cpx = link.cpx ?? defaultCpx;
  const cpy = link.cpy ?? defaultCpy;

  const d = `M ${fromPt.x} ${fromPt.y} Q ${cpx} ${cpy} ${toPt.x} ${toPt.y}`;

  const markerStartId = style.arrowStart !== "none"
    ? markerId(style.arrowStart, color, lineWidth)
    : undefined;
  const markerEndId = style.arrowEnd !== "none"
    ? markerId(style.arrowEnd, color, lineWidth)
    : undefined;

  // Lấy mẫu quadratic bezier cho taper
  const samplePoints = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    const u = 1 - t;
    return {
      x: u * u * fromPt.x + 2 * u * t * cpx + t * t * toPt.x,
      y: u * u * fromPt.y + 2 * u * t * cpy + t * t * toPt.y,
    };
  });

  return (
    <G>
      {isTaperDash(style.dashId) ? (
        <Path
          d={buildTaperPolygon(samplePoints, lineWidth * 1.5, 0.5, "auto-tapered")}
          fill={color}
          stroke="none"
          onPress={() => onTap(link.id)}
        />
      ) : (
        <Path
          d={d}
          stroke={color}
          strokeWidth={lineWidth}
          fill="none"
          strokeDasharray={style.dashId === "dashed-thin" ? "6 4" : undefined}
          markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
          markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
          onPress={() => onTap(link.id)}
        />
      )}

      {/* Label ở giữa đường cong */}
      {link.label && (
        <SvgText
          x={(fromPt.x + 2 * cpx + toPt.x) / 4}
          y={(fromPt.y + 2 * cpy + toPt.y) / 4 - 8}
          fontSize={11}
          fill={color}
          textAnchor="middle"
        >
          {link.label}
        </SvgText>
      )}

      {/* Control point handle (chỉ hiện khi selected) */}
      {selected && (
        <>
          {/* Đường nét từ 2 node tới control point */}
          <Path
            d={`M ${fromPt.x} ${fromPt.y} L ${cpx} ${cpy} L ${toPt.x} ${toPt.y}`}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3 3"
            fill="none"
            opacity={0.5}
          />
          {/* Control point circle — draggable */}
          <Circle
            cx={cpx}
            cy={cpy}
            r={8}
            fill={color}
            opacity={0.9}
            onPress={() => {}}
          />
        </>
      )}
    </G>
  );
}

export const CrossLinkPath = memo(CrossLinkPathInner, (prev, next) => {
  return (
    prev.link.id === next.link.id &&
    prev.link.cpx === next.link.cpx &&
    prev.link.cpy === next.link.cpy &&
    prev.link.relStyle === next.link.relStyle &&
    prev.link.color === next.link.color &&
    prev.link.label === next.link.label &&
    prev.selected === next.selected &&
    prev.fromNode.x === next.fromNode.x &&
    prev.fromNode.y === next.fromNode.y &&
    prev.toNode.x === next.toNode.x &&
    prev.toNode.y === next.toNode.y
  );
});
