// app/editor/[mapId].tsx
//
// Màn hình vẽ mindmap chính. Bottom Sheet thay cho sidebar (mục 4.3 spec).
// 3 trạng thái: ẩn / 1/3 màn hình / full màn hình (vuốt lên).

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { captureRef } from "react-native-view-shot";

import { MindMapCanvas } from "../../src/components/canvas/MindMapCanvas";
import { NodeStylePanel } from "../../src/components/panels/NodeStylePanel";
import { LinkStylePanel } from "../../src/components/panels/LinkStylePanel";
import { AIGeneratorPanel } from "../../src/components/panels/AIGeneratorPanel";
import { useMapStore } from "../../src/store/mapStore";
import { useUndoStore } from "../../src/store/undoStore";
import { useSettingsStore } from "../../src/store/settingsStore";
import {
  exportPng,
  exportPdf,
  exportJson,
  exportMarkdown,
} from "../../src/services/exportService";
import { COLOR_PALETTE, FREE_PLAN_LIMITS } from "../../src/types/mindmap";

const SNAP_POINTS = ["10%", "35%", "85%"];

export default function EditorScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const navigation = useNavigation();
  const canvasRef = useRef<View>(null);

  const {
    doc,
    loadMap,
    selectedNodeIds,
    selectedCrossLinkId,
    addChildNode,
    updateNodeTitle,
    deleteNode,
    setNodeRelStyleField,
    runLayout,
    isFree,
  } = useMapStore();

  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoStore();
  const { plan } = useSettingsStore();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [editTitleModal, setEditTitleModal] = useState<{ id: string; value: string } | null>(null);
  const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null);
  const [addingCrossLink, setAddingCrossLink] = useState(false);
  const [crossLinkFrom, setCrossLinkFrom] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (mapId) loadMap(mapId);
  }, [mapId]);

  useEffect(() => {
    if (doc) navigation.setOptions({ title: doc.title });
  }, [doc?.title]);

  // Push undo snapshot trước mỗi thao tác destructive
  const withUndo = useCallback(
    (fn: () => void) => {
      if (doc) pushSnapshot(doc);
      fn();
    },
    [doc, pushSnapshot]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      if (isFree && doc && doc.nodes.length >= FREE_PLAN_LIMITS.maxNodesPerMap) {
        Alert.alert("Giới hạn Free", `Tối đa ${FREE_PLAN_LIMITS.maxNodesPerMap} node. Nâng cấp Pro để tiếp tục.`);
        return;
      }
      withUndo(() => {
        const newId = addChildNode(parentId, "Node mới");
        if (!newId) return;
        // Mở sheet để edit tên ngay
        setEditTitleModal({ id: newId, value: "Node mới" });
      });
    },
    [addChildNode, withUndo, doc, isFree]
  );

  const handleEditTitle = useCallback((id: string) => {
    const node = doc?.nodes.find((n) => n.id === id);
    if (node) setEditTitleModal({ id, value: node.title });
  }, [doc]);

  const handleDeleteNode = useCallback((id: string) => {
    Alert.alert("Xoá node", "Xoá node này và toàn bộ nhánh con?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: () => withUndo(() => deleteNode(id)),
      },
    ]);
  }, [deleteNode, withUndo]);

  const handleChangeColor = useCallback((id: string) => {
    setColorPickerNodeId(id);
  }, []);

  const handleCrossLinkControlDrag = useCallback(
    (id: string, cpx: number, cpy: number) => {
      // Update cross-link control point
      if (!doc) return;
      const updated = {
        ...doc,
        crossLinks: doc.crossLinks.map((cl) =>
          cl.id === id ? { ...cl, cpx, cpy } : cl
        ),
      };
      useMapStore.setState({ doc: updated });
    },
    [doc]
  );

  const handleExport = async (format: "png" | "pdf" | "json" | "md") => {
    setExportMenuOpen(false);
    if (!doc) return;
    try {
      if (format === "json") {
        await exportJson(doc);
      } else if (format === "md") {
        await exportMarkdown(doc);
      } else {
        if (!canvasRef.current) return;
        const uri = await captureRef(canvasRef, { format: "png", quality: 0.9 });
        if (format === "png") await exportPng(uri, doc.title);
        else await exportPdf(uri, doc.title);
      }
    } catch (e: any) {
      Alert.alert("Lỗi export", e.message);
    }
  };

  const handleLayout = (type: string) => {
    if (!doc) return;
    withUndo(() => runLayout(type as any));
  };

  // Xác định nội dung panel theo ngữ cảnh (mục 4.3 spec)
  const selectedNode =
    selectedNodeIds.length === 1
      ? doc?.nodes.find((n) => n.id === selectedNodeIds[0])
      : undefined;
  const selectedLink =
    selectedCrossLinkId
      ? doc?.crossLinks.find((cl) => cl.id === selectedCrossLinkId)
      : undefined;

  const renderPanelContent = () => {
    if (selectedNode) {
      return (
        <NodeStylePanel
          node={selectedNode}
          onStyleChange={(field, value) =>
            setNodeRelStyleField(selectedNode.id, field, value)
          }
        />
      );
    }
    if (selectedLink) {
      return <LinkStylePanel link={selectedLink} />;
    }
    // Không chọn gì — hiện AI Generator + Layout + Export
    return (
      <View style={styles.defaultPanel}>
        <AIGeneratorPanel
          selectedNodeId={selectedNodeIds[0] ?? null}
          mapId={doc?.id ?? ""}
        />
        <Text style={styles.panelSectionTitle}>Layout</Text>
        <View style={styles.layoutRow}>
          {(["free", "horizontal", "vertical", "radial", "list", "matrix"] as const).map(
            (lt) => (
              <TouchableOpacity
                key={lt}
                style={styles.layoutChip}
                onPress={() => handleLayout(lt)}
              >
                <Text style={styles.layoutChipText}>{lt}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <Text style={styles.panelSectionTitle}>Export</Text>
        <View style={styles.exportRow}>
          {(["png", "pdf", "json", "md"] as const).map((f) => (
            <TouchableOpacity key={f} style={styles.exportChip} onPress={() => handleExport(f)}>
              <Text style={styles.exportChipText}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (!doc) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: "#818cf8" }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Toolbar trên cùng */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, !canUndo() && styles.toolBtnDisabled]}
          onPress={undo}
          disabled={!canUndo()}
        >
          <Text style={styles.toolBtnText}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, !canRedo() && styles.toolBtnDisabled]}
          onPress={redo}
          disabled={!canRedo()}
        >
          <Text style={styles.toolBtnText}>↪</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, addingCrossLink && styles.toolBtnActive]}
          onPress={() => {
            setAddingCrossLink(!addingCrossLink);
            setCrossLinkFrom(null);
          }}
        >
          <Text style={styles.toolBtnText}>🔗</Text>
        </TouchableOpacity>
        {addingCrossLink && (
          <Text style={styles.crossLinkHint}>
            {crossLinkFrom ? "Tap node đích" : "Tap node nguồn"}
          </Text>
        )}
      </View>

      {/* Canvas chính */}
      <View ref={canvasRef} style={styles.canvasContainer}>
        <MindMapCanvas
          doc={doc}
          onAddChild={handleAddChild}
          onDeleteNode={handleDeleteNode}
          onEditTitle={handleEditTitle}
          onChangeColor={handleChangeColor}
          onChangeIcon={() => {}}
          onCrossLinkControlDrag={handleCrossLinkControlDrag}
        />
      </View>

      {/* Bottom Sheet panel */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={SNAP_POINTS}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        <BottomSheetScrollView>{renderPanelContent()}</BottomSheetScrollView>
      </BottomSheet>

      {/* Modal đổi tên node */}
      <Modal
        visible={!!editTitleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditTitleModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đổi tên node</Text>
            <TextInput
              style={styles.modalInput}
              value={editTitleModal?.value ?? ""}
              onChangeText={(v) =>
                setEditTitleModal((prev) => prev ? { ...prev, value: v } : null)
              }
              autoFocus
              selectTextOnFocus
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditTitleModal(null)}>
                <Text style={styles.modalCancel}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (editTitleModal) {
                    updateNodeTitle(editTitleModal.id, editTitleModal.value.trim() || "Node");
                  }
                  setEditTitleModal(null);
                }}
              >
                <Text style={styles.modalConfirm}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color picker modal */}
      <Modal
        visible={!!colorPickerNodeId}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerNodeId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: 300 }]}>
            <Text style={styles.modalTitle}>Chọn màu</Text>
            <View style={styles.colorGrid}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.colorDot, { backgroundColor: c.bg, borderColor: c.border }]}
                  onPress={() => {
                    if (colorPickerNodeId) {
                      // Cập nhật màu node (lưu vào node.color, không phải relStyle)
                      if (!doc) return;
                      const updated = {
                        ...doc,
                        nodes: doc.nodes.map((n) =>
                          n.id === colorPickerNodeId ? { ...n, color: c.id } : n
                        ),
                      };
                      useMapStore.setState({ doc: updated });
                    }
                    setColorPickerNodeId(null);
                  }}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setColorPickerNodeId(null)}>
              <Text style={styles.modalCancel}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0f1117",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1b4b",
    gap: 8,
    zIndex: 10,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1e1b4b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#312e81",
  },
  toolBtnActive: { backgroundColor: "#4f46e5", borderColor: "#818cf8" },
  toolBtnDisabled: { opacity: 0.3 },
  toolBtnText: { color: "#e0e7ff", fontSize: 16 },
  crossLinkHint: { color: "#a78bfa", fontSize: 12, marginLeft: 4 },
  canvasContainer: { flex: 1 },
  sheetBackground: { backgroundColor: "#111827", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetIndicator: { backgroundColor: "#4f46e5", width: 40 },
  defaultPanel: { padding: 16 },
  panelSectionTitle: {
    color: "#818cf8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  layoutRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  layoutChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1e1b4b",
    borderWidth: 1,
    borderColor: "#312e81",
  },
  layoutChipText: { color: "#c7d2fe", fontSize: 12 },
  exportRow: { flexDirection: "row", gap: 8 },
  exportChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1e1b4b",
    borderWidth: 1,
    borderColor: "#4f46e5",
  },
  exportChipText: { color: "#818cf8", fontSize: 12, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1e1b4b",
    borderRadius: 14,
    padding: 20,
    width: 280,
    borderWidth: 1,
    borderColor: "#4f46e5",
  },
  modalTitle: { color: "#e0e7ff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalInput: {
    backgroundColor: "#0f1117",
    color: "#e0e7ff",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#4f46e5",
    marginBottom: 16,
    maxHeight: 100,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  modalCancel: { color: "#6b7280", fontSize: 15 },
  modalConfirm: { color: "#818cf8", fontSize: 15, fontWeight: "700" },
  modalCancelBtn: { marginTop: 12, alignItems: "center" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
});
