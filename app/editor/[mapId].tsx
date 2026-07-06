// app/editor/[mapId].tsx - Simplified version without bottom-sheet/view-shot crashes

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { MindMapCanvas } from "../../src/components/canvas/MindMapCanvas";
import { useMapStore } from "../../src/store/mapStore";
import { useUndoStore } from "../../src/store/undoStore";
import { useSettingsStore } from "../../src/store/settingsStore";
import { exportJson, exportMarkdown } from "../../src/services/exportService";
import { COLOR_PALETTE, FREE_PLAN_LIMITS } from "../../src/types/mindmap";

export default function EditorScreen() {
  const { mapId } = useLocalSearchParams<{ mapId: string }>();
  const navigation = useNavigation();

  const {
    doc,
    loadMap,
    selectedNodeIds,
    addChildNode,
    updateNodeTitle,
    deleteNode,
    setNodeRelStyleField,
    runLayout,
  } = useMapStore();

  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoStore();
  const { plan } = useSettingsStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editTitleModal, setEditTitleModal] = useState<{ id: string; value: string } | null>(null);
  const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (mapId) loadMap(mapId);
  }, [mapId]);

  useEffect(() => {
    if (doc) navigation.setOptions({ title: doc.title });
  }, [doc?.title]);

  const withUndo = useCallback((fn: () => void) => {
    if (doc) pushSnapshot(doc);
    fn();
  }, [doc, pushSnapshot]);

  const handleAddChild = useCallback((parentId: string) => {
    if (plan === "free" && doc && doc.nodes.length >= FREE_PLAN_LIMITS.maxNodesPerMap) {
      Alert.alert("Giới hạn Free", `Tối đa ${FREE_PLAN_LIMITS.maxNodesPerMap} node.`);
      return;
    }
    withUndo(() => {
      const newId = addChildNode(parentId, "Node mới");
      if (newId) setEditTitleModal({ id: newId, value: "Node mới" });
    });
  }, [addChildNode, withUndo, doc, plan]);

  const handleEditTitle = useCallback((id: string) => {
    const node = doc?.nodes.find((n) => n.id === id);
    if (node) setEditTitleModal({ id, value: node.title });
  }, [doc]);

  const handleDeleteNode = useCallback((id: string) => {
    Alert.alert("Xoá node", "Xoá node này và toàn bộ nhánh con?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: () => withUndo(() => deleteNode(id)) },
    ]);
  }, [deleteNode, withUndo]);

  const handleExport = async (format: "json" | "md") => {
    if (!doc) return;
    try {
      if (format === "json") await exportJson(doc);
      else await exportMarkdown(doc);
    } catch (e: any) {
      Alert.alert("Lỗi export", e.message);
    }
  };

  if (!doc) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, !canUndo() && styles.toolBtnDisabled]}
          onPress={undo} disabled={!canUndo()}>
          <Text style={styles.toolBtnText}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, !canRedo() && styles.toolBtnDisabled]}
          onPress={redo} disabled={!canRedo()}>
          <Text style={styles.toolBtnText}>↪</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setPanelOpen(!panelOpen)}>
          <Text style={styles.toolBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={styles.canvasContainer}>
        <MindMapCanvas
          doc={doc}
          onAddChild={handleAddChild}
          onDeleteNode={handleDeleteNode}
          onEditTitle={handleEditTitle}
          onChangeColor={(id) => setColorPickerNodeId(id)}
          onChangeIcon={() => {}}
          onCrossLinkControlDrag={(id, cpx, cpy) => {
            const updated = {
              ...doc,
              crossLinks: doc.crossLinks.map((cl) =>
                cl.id === id ? { ...cl, cpx, cpy } : cl
              ),
            };
            useMapStore.setState({ doc: updated });
          }}
        />
      </View>

      {/* Simple panel (no BottomSheet) */}
      {panelOpen && (
        <View style={styles.panel}>
          <ScrollView>
            <Text style={styles.panelTitle}>Layout</Text>
            <View style={styles.row}>
              {(["free","horizontal","vertical","radial","list"] as const).map((lt) => (
                <TouchableOpacity key={lt} style={styles.chip}
                  onPress={() => { withUndo(() => runLayout(lt)); setPanelOpen(false); }}>
                  <Text style={styles.chipText}>{lt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.panelTitle}>Export</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.chip} onPress={() => handleExport("json")}>
                <Text style={styles.chipText}>JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => handleExport("md")}>
                <Text style={styles.chipText}>Markdown</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Edit title modal */}
      <Modal visible={!!editTitleModal} transparent animationType="fade"
        onRequestClose={() => setEditTitleModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đổi tên node</Text>
            <TextInput
              style={styles.modalInput}
              value={editTitleModal?.value ?? ""}
              onChangeText={(v) => setEditTitleModal((p) => p ? { ...p, value: v } : null)}
              autoFocus selectTextOnFocus multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditTitleModal(null)}>
                <Text style={styles.modalCancel}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (editTitleModal) updateNodeTitle(editTitleModal.id, editTitleModal.value.trim() || "Node");
                setEditTitleModal(null);
              }}>
                <Text style={styles.modalConfirm}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Color picker modal */}
      <Modal visible={!!colorPickerNodeId} transparent animationType="fade"
        onRequestClose={() => setColorPickerNodeId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { width: 300 }]}>
            <Text style={styles.modalTitle}>Chọn màu</Text>
            <View style={styles.colorGrid}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity key={c.id}
                  style={[styles.colorDot, { backgroundColor: c.bg, borderColor: c.border }]}
                  onPress={() => {
                    if (!colorPickerNodeId || !doc) return;
                    useMapStore.setState({
                      doc: { ...doc, nodes: doc.nodes.map((n) =>
                        n.id === colorPickerNodeId ? { ...n, color: c.id } : n
                      )}
                    });
                    setColorPickerNodeId(null);
                  }} />
              ))}
            </View>
            <TouchableOpacity onPress={() => setColorPickerNodeId(null)} style={{ marginTop: 12, alignItems: "center" }}>
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
  loadingText: { color: "#818cf8", fontSize: 16 },
  toolbar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "#0f1117", borderBottomWidth: 1, borderBottomColor: "#1e1b4b", gap: 8,
  },
  toolBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: "#1e1b4b",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#312e81",
  },
  toolBtnDisabled: { opacity: 0.3 },
  toolBtnText: { color: "#e0e7ff", fontSize: 16 },
  canvasContainer: { flex: 1 },
  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#111827", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, maxHeight: "50%", borderTopWidth: 1, borderTopColor: "#1e1b4b",
  },
  panelTitle: {
    color: "#818cf8", fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, marginTop: 8,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "#1e1b4b", borderWidth: 1, borderColor: "#312e81",
  },
  chipText: { color: "#c7d2fe", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#1e1b4b", borderRadius: 14, padding: 20, width: 280, borderWidth: 1, borderColor: "#4f46e5" },
  modalTitle: { color: "#e0e7ff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalInput: { backgroundColor: "#0f1117", color: "#e0e7ff", borderRadius: 8, padding: 10, fontSize: 15, borderWidth: 1, borderColor: "#4f46e5", marginBottom: 16, maxHeight: 100 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  modalCancel: { color: "#6b7280", fontSize: 15 },
  modalConfirm: { color: "#818cf8", fontSize: 15, fontWeight: "700" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  colorDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
});
