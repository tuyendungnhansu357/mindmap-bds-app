// app/(tabs)/home.tsx
//
// Mục 4.1 spec: grid card thumbnail + tên + ngày sửa cuối, long-press menu,
// hiển thị số node/giới hạn Free.

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import {
  listMaps,
  createMap,
  deleteMap,
  renameMap,
  countNodesInMap,
  countMaps,
} from "../../src/db/mapRepository";
import { useSettingsStore } from "../../src/store/settingsStore";
import { FREE_PLAN_LIMITS } from "../../src/types/mindmap";

interface MapCard {
  id: string;
  title: string;
  updatedAt: number;
  thumbnailUri: string | null;
  nodeCount?: number;
}

export default function HomeScreen() {
  const [maps, setMaps] = useState<MapCard[]>([]);
  const [search, setSearch] = useState("");
  const [renameModal, setRenameModal] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const { plan } = useSettingsStore();
  const isFree = plan === "free";

  const reload = useCallback(async () => {
    const rows = await listMaps();
    const withCount = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        nodeCount: await countNodesInMap(r.id),
      }))
    );
    setMaps(withCount);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    if (isFree) {
      const total = await countMaps();
      if (total >= FREE_PLAN_LIMITS.maxMaps) {
        Alert.alert(
          "Giới hạn gói Free",
          `Gói Free chỉ cho phép ${FREE_PLAN_LIMITS.maxMaps} MindMap. Nâng cấp Pro để tạo không giới hạn.`
        );
        return;
      }
    }
    const id = uuidv4();
    await createMap({ id, title: "MindMap mới", layoutType: "free" });
    await reload();
    router.push(`/editor/${id}`);
  };

  const handleLongPress = (card: MapCard) => {
    Alert.alert(card.title, "Chọn hành động", [
      {
        text: "Đổi tên",
        onPress: () => {
          setNewTitle(card.title);
          setRenameModal({ id: card.id, title: card.title });
        },
      },
      {
        text: "Xoá",
        style: "destructive",
        onPress: () =>
          Alert.alert("Xác nhận", `Xoá "${card.title}"?`, [
            { text: "Huỷ", style: "cancel" },
            {
              text: "Xoá",
              style: "destructive",
              onPress: async () => {
                await deleteMap(card.id);
                reload();
              },
            },
          ]),
      },
      { text: "Huỷ", style: "cancel" },
    ]);
  };

  const handleRenameConfirm = async () => {
    if (!renameModal || !newTitle.trim()) return;
    await renameMap(renameModal.id, newTitle.trim());
    setRenameModal(null);
    reload();
  };

  const filtered = maps.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <View style={styles.root}>
      {/* Tìm kiếm */}
      <TextInput
        style={styles.search}
        placeholder="Tìm kiếm map..."
        placeholderTextColor="#6b7280"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Chưa có MindMap nào.</Text>
            <Text style={styles.emptyText}>Nhấn ✚ để tạo mới.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/editor/${item.id}`)}
            onLongPress={() => handleLongPress(item)}
          >
            {item.thumbnailUri ? (
              <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={{ fontSize: 32 }}>🗺️</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.cardMeta}>{formatDate(item.updatedAt)}</Text>
              {isFree && (
                <Text
                  style={[
                    styles.cardMeta,
                    (item.nodeCount ?? 0) >= FREE_PLAN_LIMITS.maxNodesPerMap &&
                      styles.limitWarning,
                  ]}
                >
                  {item.nodeCount ?? 0}/{FREE_PLAN_LIMITS.maxNodesPerMap} node
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB tạo mới */}
      <TouchableOpacity style={styles.fab} onPress={handleCreate}>
        <Text style={styles.fabText}>✚</Text>
      </TouchableOpacity>

      {/* Rename modal */}
      <Modal
        visible={!!renameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Đổi tên</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setRenameModal(null)}>
                <Text style={styles.modalCancel}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameConfirm}>
                <Text style={styles.modalConfirm}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
  search: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#1e1b4b",
    borderRadius: 10,
    color: "#e0e7ff",
    fontSize: 15,
  },
  grid: { paddingHorizontal: 8, paddingBottom: 80 },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#1e1b4b",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#312e81",
  },
  thumbnail: { width: "100%", height: 120, resizeMode: "cover" },
  thumbnailPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#312e81",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { padding: 10 },
  cardTitle: { color: "#e0e7ff", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  cardMeta: { color: "#818cf8", fontSize: 11 },
  limitWarning: { color: "#f97316" },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { color: "#6b7280", fontSize: 15 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4f46e5",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: "#fff", fontSize: 26, lineHeight: 30 },
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
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  modalCancel: { color: "#6b7280", fontSize: 15 },
  modalConfirm: { color: "#818cf8", fontSize: 15, fontWeight: "700" },
});
