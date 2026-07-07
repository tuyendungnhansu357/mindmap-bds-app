// MindMapCanvas - Simple version using PanResponder (no reanimated/gesture-handler)
// Tránh crash trên thiết bị thực do reanimated worklet issues

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Dimensions, PanResponder, StyleSheet, View } from "react-native";
import Svg, { G } from "react-native-svg";

import { MindMapDoc, MindMapNode } from "../../types/mindmap";
import { effectiveStyle } from "../../utils/relStyle";
import { ArrowMarkerDefs, markerId, MarkerSpec } from "./ArrowMarker";
import { CrossLinkPath } from "./CrossLinkPath";
import { EdgePath } from "./EdgePath";
import { NodeActionBubble } from "./NodeActionBubble";
import { NodeShape } from "./NodeShape";
import { useMapStore } from "../../store/mapStore";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

interface Props {
  doc: MindMapDoc;
  onAddChild: (parentId: string) => void;
  onDeleteNode: (id: string) => void;
  onEditTitle: (id: string) => void;
  onChangeColor: (id: string) => void;
  onChangeIcon: (id: string) => void;
  onCrossLinkControlDrag: (id: string, cpx: number, cpy: number) => void;
}

export function MindMapCanvas({
  doc,
  onAddChild,
  onDeleteNode,
  onEditTitle,
  onChangeColor,
  onChangeIcon,
  onCrossLinkControlDrag,
}: Props) {
  const { selectedNodeIds, selectedCrossLinkId, selectNode, clearSelection } = useMapStore();

  // Pan/zoom state (JS thread, simple setState)
  const [tx, setTx] = useState(SCREEN_W / 4);
  const [ty, setTy] = useState(SCREEN_H / 4);
  const [scale, setScale] = useState(1);

  const panRef = useRef({ startTx: 0, startTy: 0, startDist: 0, startScale: 1 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        panRef.current.startTx = tx;
        panRef.current.startTy = ty;
        panRef.current.startScale = scale;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          panRef.current.startDist = Math.hypot(dx, dy);
        }
      },
      onPanResponderMove: (e, gs) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          // Pinch zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);
          const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
            panRef.current.startScale * (dist / (panRef.current.startDist || 1))
          ));
          setScale(newScale);
        } else {
          // Pan
          setTx(panRef.current.startTx + gs.dx);
          setTy(panRef.current.startTy + gs.dy);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const nodeMap = useMemo(() => {
    const m = new Map<string, MindMapNode>();
    doc.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [doc.nodes]);

  const markerSpecs = useMemo((): MarkerSpec[] => {
    const specMap = new Map<string, MarkerSpec>();
    const collect = (rs: ReturnType<typeof effectiveStyle>, extraColor?: string | null) => {
      const lw = rs.width ?? 2;
      const color = extraColor ?? rs.color ?? "#818cf8";
      for (const type of [rs.arrowStart, rs.arrowEnd] as const) {
        if (type === "none") continue;
        const id = markerId(type, color, lw);
        if (!specMap.has(id)) specMap.set(id, { id, type, color, size: lw });
      }
    };
    doc.nodes.filter((n) => n.parentId).forEach((n) => collect(effectiveStyle(n.relStyle)));
    doc.crossLinks.forEach((cl) => collect(effectiveStyle(cl.relStyle), cl.color));
    return Array.from(specMap.values());
  }, [doc.nodes, doc.crossLinks]);

  const handleNodeTap = useCallback((id: string) => selectNode(id), [selectNode]);
  const handleLongPress = useCallback((id: string) => selectNode(id), [selectNode]);

  const selectedNode = selectedNodeIds.length === 1 ? nodeMap.get(selectedNodeIds[0]) : undefined;
  const bubbleX = selectedNode ? selectedNode.x * scale + tx : 0;
  const bubbleY = selectedNode ? selectedNode.y * scale + ty : 0;

  const transform = `translate(${tx}, ${ty}) scale(${scale})`;

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <ArrowMarkerDefs specs={markerSpecs} />
        <G transform={transform}>
          {/* Layer 1: Cross-links */}
          {doc.crossLinks.map((cl) => {
            const from = nodeMap.get(cl.fromId);
            const to = nodeMap.get(cl.toId);
            if (!from || !to) return null;
            return (
              <CrossLinkPath
                key={cl.id}
                link={cl}
                fromNode={from}
                toNode={to}
                selected={selectedCrossLinkId === cl.id}
                onTap={(id) => useMapStore.setState({ selectedCrossLinkId: id, selectedNodeIds: [] })}
                onControlPointDrag={onCrossLinkControlDrag}
              />
            );
          })}

          {/* Layer 2: Edges */}
          {doc.nodes.filter((n) => n.parentId).map((child) => {
            const parent = nodeMap.get(child.parentId!);
            if (!parent || parent.collapsed) return null;
            return <EdgePath key={child.id} child={child} parent={parent} />;
          })}

          {/* Layer 3: Nodes */}
          {doc.nodes.map((n) => {
            if (n.parentId) {
              const parent = nodeMap.get(n.parentId);
              if (parent?.collapsed) return null;
            }
            return (
              <NodeShape
                key={n.id}
                node={n}
                selected={selectedNodeIds.includes(n.id)}
                onTap={handleNodeTap}
                onLongPress={handleLongPress}
                onDoubleTap={onEditTitle}
              />
            );
          })}
        </G>
      </Svg>

      {selectedNode && (
        <NodeActionBubble
          x={bubbleX}
          y={bubbleY}
          onAddChild={() => onAddChild(selectedNode.id)}
          onDelete={() => onDeleteNode(selectedNode.id)}
          onEditTitle={() => onEditTitle(selectedNode.id)}
          onChangeColor={() => onChangeColor(selectedNode.id)}
          onChangeIcon={() => onChangeIcon(selectedNode.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
});
