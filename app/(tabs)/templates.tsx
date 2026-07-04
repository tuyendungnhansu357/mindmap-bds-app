// app/(tabs)/templates.tsx

import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { createMap, persistMapDoc } from "../../src/db/mapRepository";
import { MindMapDoc } from "../../src/types/mindmap";
import BDS_TEMPLATES, { templateToNodes } from "../../src/data/templates";

export default function TemplatesScreen() {
  const handleUseTemplate = async (template: (typeof BDS_TEMPLATES)[0]) => {
    const newId = uuidv4();
    await createMap({ id: newId, title: template.title, layoutType: "horizontal" });
    const now = Date.now();
    const nodes = templateToNodes(template, newId, uuidv4);
    const doc: MindMapDoc = {
      id: newId, title: template.title, createdAt: now, updatedAt: now,
      layoutType: "horizontal", pwdHash: null, nodes, crossLinks: [],
    };
    await persistMapDoc(doc);
    router.push(`/editor/${newId}`);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.header}>Thư viện Template BĐS</Text>
      <FlatList
        data={BDS_TEMPLATES}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleUseTemplate(item)}>
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Text style={styles.cardMeta}>{item.nodes.length} node mẫu</Text>
            </View>
            <Text style={styles.arrow}>{">"}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1117" },
  header: {
    color: "#818cf8", fontSize: 12, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", margin: 16, marginBottom: 8,
  },
  list: { padding: 12, paddingTop: 4 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1e1b4b", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#312e81", gap: 12,
  },
  cardIcon: { fontSize: 32 },
  cardBody: { flex: 1 },
  cardTitle: { color: "#e0e7ff", fontSize: 15, fontWeight: "700", marginBottom: 3 },
  cardDesc: { color: "#c7d2fe", fontSize: 12, marginBottom: 3 },
  cardMeta: { color: "#818cf8", fontSize: 11 },
  arrow: { color: "#4f46e5", fontSize: 22, fontWeight: "700" },
});
