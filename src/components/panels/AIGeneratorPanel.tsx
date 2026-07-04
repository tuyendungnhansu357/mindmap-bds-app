// src/components/panels/AIGeneratorPanel.tsx

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { generateMindMapNodes, flattenAINodes } from "../../services/aiService";
import { getAIProviderConfig, useSettingsStore } from "../../store/settingsStore";
import { applySubtreeLayout } from "../../services/layoutEngine";
import { useMapStore } from "../../store/mapStore";

interface Props {
  selectedNodeId: string | null;
  mapId: string;
}

export function AIGeneratorPanel({ selectedNodeId, mapId }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const { doc } = useMapStore();
  const { activeProvider } = useSettingsStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!selectedNodeId) {
      Alert.alert("Chọn node", "Vui lòng chọn 1 node để AI thêm nhánh con vào đó.");
      return;
    }
    setLoading(true);
    try {
      const config = await getAIProviderConfig(activeProvider);
      if (!config) {
        Alert.alert(
          "Thiếu API key",
          `Vui lòng nhập API key cho "${activeProvider}" trong tab Cài đặt.`
        );
        return;
      }

      const aiNodes = await generateMindMapNodes(config, prompt);
      if (!aiNodes.length) {
        Alert.alert("AI không trả về node", "Thử lại với prompt khác.");
        return;
      }

      const newNodes = flattenAINodes(aiNodes, selectedNodeId, mapId);

      if (!doc) return;
      const combined = [...doc.nodes, ...newNodes];
      // Layout subtree của node được chọn sau khi append AI nodes
      const laid = applySubtreeLayout(combined, "horizontal", selectedNodeId);
      useMapStore.setState({
        doc: { ...doc, nodes: laid, updatedAt: Date.now() },
      });
      setPrompt("");
    } catch (e: any) {
      Alert.alert("Lỗi AI", e.message ?? "Không thể kết nối API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>🤖 AI Generator</Text>
      <Text style={styles.provider}>Provider: {activeProvider}</Text>

      {!selectedNodeId && (
        <View style={styles.hintBox}>
          <Text style={styles.hint}>💡 Chọn 1 node trên canvas để AI thêm nhánh con vào đó.</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder={'Nhập prompt, vd: "Phân tích rủi ro pháp lý nhà đất"'}
        placeholderTextColor="#6b7280"
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={3}
        editable={!loading}
      />

      <TouchableOpacity
        style={[
          styles.btn,
          (!selectedNodeId || loading || !prompt.trim()) && styles.btnDisabled,
        ]}
        onPress={handleGenerate}
        disabled={!selectedNodeId || loading || !prompt.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnText}>✨ Tạo nhánh AI</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 16 },
  title: { color: "#e0e7ff", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  provider: { color: "#818cf8", fontSize: 11, marginBottom: 12 },
  hintBox: {
    backgroundColor: "#1e1b4b",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4f46e5",
  },
  hint: { color: "#c7d2fe", fontSize: 12 },
  input: {
    backgroundColor: "#0f1117",
    color: "#e0e7ff",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#312e81",
    marginBottom: 10,
    minHeight: 72,
    textAlignVertical: "top",
  },
  btn: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
