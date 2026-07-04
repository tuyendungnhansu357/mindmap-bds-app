// src/components/canvas/ArrowMarker.tsx
//
// Mục 6.2 spec:
// - markerUnits="userSpaceOnUse" bắt buộc
// - Defs phải ở SVG root level (KHÔNG lồng trong <G transform>)
//   Chromium/WebView không resolve url(#id) nếu marker nằm trong transformed group

import React from "react";
import { Defs, Marker, Path, Circle, Polygon } from "react-native-svg";
import { ArrowHeadType } from "../../types/mindmap";

export interface MarkerSpec {
  id: string;
  type: ArrowHeadType;
  color: string;
  size: number; // lineWidth tại vị trí marker, dùng để scale
}

function ArrowPath({
  type,
  color,
  size,
}: {
  type: ArrowHeadType;
  color: string;
  size: number;
}) {
  const s = Math.max(size, 2);
  switch (type) {
    case "arrow":
    case "open-arrow":
      // mũi tên mở (không fill)
      return (
        <Path
          d={`M 0 ${-s} L ${s * 2} 0 L 0 ${s}`}
          stroke={color}
          strokeWidth={s * 0.6}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    case "filled-arrow":
      // mũi tên đặc
      return (
        <Polygon
          points={`0,${-s} ${s * 2},0 0,${s}`}
          fill={color}
          stroke="none"
        />
      );
    case "stop":
      // thanh dừng (|)
      return (
        <Path
          d={`M 0 ${-s * 1.2} L 0 ${s * 1.2}`}
          stroke={color}
          strokeWidth={s * 0.8}
          strokeLinecap="round"
        />
      );
    case "open-circle":
      return (
        <Circle
          cx={s}
          cy={0}
          r={s}
          stroke={color}
          strokeWidth={s * 0.5}
          fill="none"
        />
      );
    case "filled-circle":
      return <Circle cx={s} cy={0} r={s} fill={color} />;
    case "open-diamond":
      return (
        <Polygon
          points={`0,0 ${s},${-s} ${s * 2},0 ${s},${s}`}
          stroke={color}
          strokeWidth={s * 0.5}
          fill="none"
        />
      );
    case "filled-diamond":
      return (
        <Polygon
          points={`0,0 ${s},${-s} ${s * 2},0 ${s},${s}`}
          fill={color}
          stroke="none"
        />
      );
    default:
      return null;
  }
}

/**
 * Render tất cả <marker> defs cần thiết cho bản đồ hiện tại.
 * Phải được đặt TRỰC TIẾP trong <Defs> ở cấp root <Svg>, KHÔNG lồng
 * trong <G transform> — đây là nguyên tắc bắt buộc từ mục 6.1 spec.
 */
export function ArrowMarkerDefs({ specs }: { specs: MarkerSpec[] }) {
  if (specs.length === 0) return null;
  return (
    <Defs>
      {specs.map((spec) => {
        if (spec.type === "none") return null;
        const s = Math.max(spec.size, 2);
        const refX = spec.type.includes("circle") || spec.type.includes("diamond")
          ? s * 2
          : s * 2;
        return (
          <Marker
            key={spec.id}
            id={spec.id}
            markerUnits="userSpaceOnUse"
            markerWidth={s * 4}
            markerHeight={s * 4}
            refX={refX}
            refY={0}
            orient="auto"
            viewBox={`${-s} ${-s * 1.5} ${s * 4} ${s * 3}`}
          >
            <ArrowPath type={spec.type} color={spec.color} size={s} />
          </Marker>
        );
      })}
    </Defs>
  );
}

/**
 * Tạo marker ID duy nhất từ (type, color, size) để tái sử dụng cùng marker
 * cho nhiều edge có cùng style — tránh tạo marker trùng lặp.
 */
export function markerId(
  type: ArrowHeadType,
  color: string,
  size: number
): string {
  if (type === "none") return "";
  const safeColor = color.replace(/[^a-z0-9]/gi, "");
  return `mk_${type}_${safeColor}_${Math.round(size)}`;
}
