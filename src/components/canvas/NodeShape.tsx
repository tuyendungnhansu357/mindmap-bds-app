// src/components/canvas/NodeShape.tsx
//
// Render 1 node dưới dạng rounded-rect SVG. Memo'd để chỉ re-render khi
// field ảnh hưởng visual thay đổi (mục 7 spec: kỹ thuật tối ưu render).

import React, { memo } from "react";
import { G, Rect, Text as SvgText } from "react-native-svg";
import { MindMapNode, ColorPaletteEntry, COLOR_PALETTE } from "../../types/mindmap";

const DEFAULT_W = 160;
const DEFAULT_H = 48;
const CORNER_RADIUS = 10;

function getPaletteEntry(colorId: string): ColorPaletteEntry {
  return (
    COLOR_PALETTE.find((c) => c.id === colorId) ?? {
      id: "indigo",
      bg: "#312e81",
      border: "#818cf8",
      text: "#e0e7ff",
    }
  );
}

interface Props {
  node: MindMapNode;
  selected: boolean;
  onTap: (id: string) => void;
  onLongPress: (id: string) => void;
  onDoubleTap: (id: string) => void;
}

function NodeShapeInner({ node, selected, onTap, onLongPress, onDoubleTap }: Props) {
  const w = node.w ?? DEFAULT_W;
  const h = node.h ?? DEFAULT_H;
  const palette = getPaletteEntry(node.color);

  const fontSize = Math.max(11, Math.min(15, w / 12));
  const maxChars = Math.floor(w / (fontSize * 0.6)) - 1;
  const displayTitle =
    node.title.length > maxChars
      ? node.title.slice(0, maxChars) + "…"
      : node.title;

  // Nếu node có con và không bị collapsed, hiển thị nút ▼ ở cạnh phải
  // (logic hasChildren được xử lý ở MindMapCanvas trước khi pass props).
  return (
    <G
      x={node.x - w / 2}
      y={node.y - h / 2}
      onPress={() => onTap(node.id)}
      onLongPress={() => onLongPress(node.id)}
      //@ts-ignore - double tap event
      onDoublePress={() => onDoubleTap(node.id)}
    >
      {/* Viền nổi nếu được chọn */}
      {selected && (
        <Rect
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          rx={CORNER_RADIUS + 3}
          ry={CORNER_RADIUS + 3}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          opacity={0.8}
        />
      )}

      {/* Background */}
      <Rect
        width={w}
        height={h}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
        fill={palette.bg}
        stroke={selected ? "#ffffff" : palette.border}
        strokeWidth={selected ? 2 : 1.5}
      />

      {/* Icon nếu có */}
      {node.icon && (
        <SvgText
          x={8}
          y={h / 2}
          fontSize={fontSize + 2}
          textAnchor="start"
          alignmentBaseline="central"
        >
          {node.icon}
        </SvgText>
      )}

      {/* Title */}
      <SvgText
        x={node.icon ? 28 : w / 2}
        y={h / 2}
        fontSize={fontSize}
        fill={palette.text}
        textAnchor={node.icon ? "start" : "middle"}
        alignmentBaseline="central"
        fontFamily="System"
      >
        {displayTitle}
      </SvgText>
    </G>
  );
}

// Shallow compare các field ảnh hưởng visual
export const NodeShape = memo(NodeShapeInner, (prev, next) => {
  return (
    prev.node.id === next.node.id &&
    prev.node.title === next.node.title &&
    prev.node.x === next.node.x &&
    prev.node.y === next.node.y &&
    prev.node.w === next.node.w &&
    prev.node.h === next.node.h &&
    prev.node.color === next.node.color &&
    prev.node.icon === next.node.icon &&
    prev.node.collapsed === next.node.collapsed &&
    prev.selected === next.selected
  );
});
