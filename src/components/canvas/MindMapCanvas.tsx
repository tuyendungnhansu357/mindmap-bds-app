// src/components/canvas/MindMapCanvas.tsx
//
// Pan/zoom: Reanimated shared values → useAnimatedProps → AnimatedG transform string
// Đây là pattern đúng khi dùng react-native-svg + reanimated:
// - KHÔNG dùng Animated.View bên trong <Svg> (View không phải SVG element)
// - Dùng Animated.createAnimatedComponent(G) + useAnimatedProps
// - ArrowMarkerDefs ở <Svg> root ngoài AnimatedG (mục 6.1 spec)

import React, { useCallback, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { G } from "react-native-svg";

import { MindMapDoc, MindMapNode } from "../../types/mindmap";
import { effectiveStyle } from "../../utils/relStyle";
import { ArrowMarkerDefs, markerId, MarkerSpec } from "./ArrowMarker";
import { CrossLinkPath } from "./CrossLinkPath";
import { EdgePath } from "./EdgePath";
import { NodeActionBubble } from "./NodeActionBubble";
import { NodeShape } from "./NodeShape";
import { useMapStore } from "../../store/mapStore";

// AnimatedG chạy trên UI thread — core của pan/zoom 60fps
const AnimatedG = Animated.createAnimatedComponent(G);

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4.0;
const NODE_CULL_THRESHOLD = 300;
const CULL_PAD = 200;

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
  const {
    selectedNodeIds,
    selectedCrossLinkId,
    selectNode,
    clearSelection,
  } = useMapStore();

  // Shared values — mutate trên UI thread
  const tx = useSharedValue(SCREEN_W / 4);
  const ty = useSharedValue(SCREEN_H / 4);
  const sc = useSharedValue(1);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedSC = useSharedValue(1);

  // AnimatedProps → transform string trên SVG G element
  // Chạy hoàn toàn trên UI thread nhờ Reanimated worklet
  const animatedGroupProps = useAnimatedProps(() => ({
    transform: `translate(${tx.value}, ${ty.value}) scale(${sc.value})`,
  }));

  // ---------------------------------------------------------------
  // Gestures
  // ---------------------------------------------------------------
  const pinch = Gesture.Pinch()
    .onBegin(() => { savedSC.value = sc.value; })
    .onUpdate((e) => {
      sc.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, savedSC.value * e.scale));
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onBegin(() => {
      savedTX.value = tx.value;
      savedTY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = savedTX.value + e.translationX;
      ty.value = savedTY.value + e.translationY;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  // ---------------------------------------------------------------
  // Node map
  // ---------------------------------------------------------------
  const nodeMap = useMemo(() => {
    const m = new Map<string, MindMapNode>();
    doc.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [doc.nodes]);

  // ---------------------------------------------------------------
  // Viewport culling (chỉ khi > NODE_CULL_THRESHOLD)
  // Dùng JS-side values (lag 1 frame so UI thread OK cho culling)
  // ---------------------------------------------------------------
  const visibleNodes = useMemo(() => {
    if (doc.nodes.length <= NODE_CULL_THRESHOLD) return doc.nodes;
    const s = sc.value || 1;
    const l = (-tx.value - CULL_PAD) / s;
    const t = (-ty.value - CULL_PAD) / s;
    const r = (SCREEN_W - tx.value + CULL_PAD) / s;
    const b = (SCREEN_H - ty.value + CULL_PAD) / s;
    return doc.nodes.filter((n) => n.x >= l && n.x <= r && n.y >= t && n.y <= b);
  }, [doc.nodes]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );

  const visibleCrossLinks = useMemo(
    () => doc.crossLinks.filter(
      (cl) => visibleNodeIds.has(cl.fromId) || visibleNodeIds.has(cl.toId)
    ),
    [doc.crossLinks, visibleNodeIds]
  );

  // ---------------------------------------------------------------
  // Arrow marker specs
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------
  const handleNodeTap = useCallback((id: string) => selectNode(id), [selectNode]);
  const handleLongPress = useCallback((id: string) => selectNode(id), [selectNode]);
  const handleBgTap = useCallback(() => clearSelection(), [clearSelection]);

  const selectedNode =
    selectedNodeIds.length === 1 ? nodeMap.get(selectedNodeIds[0]) : undefined;

  // Bubble coords (JS-side, 1-frame lag chấp nhận được cho UI overlay)
  const bubbleX = selectedNode ? selectedNode.x * sc.value + tx.value : 0;
  const bubbleY = selectedNode ? selectedNode.y * sc.value + ty.value : 0;

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View style={styles.root} onTouchEnd={handleBgTap}>
          <Svg
            width={SCREEN_W}
            height={SCREEN_H}
            style={StyleSheet.absoluteFill}
          >
            {/*
              ArrowMarkerDefs: PHẢI ở SVG root, NGOÀI AnimatedG transform
              Chromium/Skia không resolve url(#id) nếu marker lồng trong
              transformed group (bài học xương máu từ bản web, mục 6.1 spec)
            */}
            <ArrowMarkerDefs specs={markerSpecs} />

            {/*
              AnimatedG: nhận transform string từ useAnimatedProps.
              Chạy trên UI thread — pan/zoom 60fps không block JS.
            */}
            <AnimatedG animatedProps={animatedGroupProps}>

              {/* Layer 1: Cross-links (dưới cùng) */}
              {visibleCrossLinks.map((cl) => {
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
                    onTap={(id) =>
                      useMapStore.setState({
                        selectedCrossLinkId: id,
                        selectedNodeIds: [],
                      })
                    }
                    onControlPointDrag={onCrossLinkControlDrag}
                  />
                );
              })}

              {/* Layer 2: Edge cha-con */}
              {visibleNodes
                .filter((n) => n.parentId)
                .map((child) => {
                  const parent = nodeMap.get(child.parentId!);
                  if (!parent || parent.collapsed) return null;
                  return <EdgePath key={child.id} child={child} parent={parent} />;
                })}

              {/* Layer 3: Nodes (render SAU CÙNG — luôn nổi trên edge) */}
              {visibleNodes.map((n) => {
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

            </AnimatedG>
          </Svg>
        </View>
      </GestureDetector>

      {/* Layer 4: NodeActionBubble — RN View, ngoài SVG */}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
});
