// src/components/panels/LinkStylePanel.tsx

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CrossLink } from "../../types/mindmap";
import { effectiveStyle, updateRelStyleField } from "../../utils/relStyle";
import { useMapStore } from "../../store/mapStore";

interface Props {
  link: CrossLink;
}

const ARROW_TYPES = [
  "none", "arrow", "filled-arrow", "open-arrow",
  "stop", "open-circle", "filled-circle",
] as const;

const DASH_IDS = [
  "solid", "dashed-thin", "cable", "wide-dash",
] as const;

const CONNECTOR_SHAPES = [
  "curved", "orthogonal", "straight",
] as const;

export function LinkStylePanel({ link }: Props) {
  const { doc } = useMapStore();
  const style = effectiveStyle(link.relStyle);

  const updateField = (field: any, value: any) => {
    if (!doc) return;
    const updated = {
      ...doc,
      crossLinks: doc.crossLinks.map((cl) =>
        cl.id === link.id
          ? { ...cl, relStyle: updateRelStyleField(cl.relStyle, field, value) }
          : cl
      ),
    };
    useMapStore.setState({ doc: updated });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>🔗 Cross-link style</Text>

      <Text style={styles.label}>Hình dạng</Text>
      <View style={styles.row}>
        {CONNECTOR_SHAPES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, style.shape === s && styles.chipActive]}
            onPress={() => updateField("shape", s)}
          >
            <Text style={[styles.chipText, style.shape === s && styles.chipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Kiểu nét</Text>
      <View style={styles.row}>
        {DASH_IDS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, style.dashId === d && styles.chipActive]}
            onPress={() => updateField("dashId", d)}
          >
            <Text style={[styles.chipText, style.dashId === d && styles.chipTextActive]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Mũi tên đầu</Text>
      <View style={styles.row}>
        {ARROW_TYPES.map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, style.arrowStart === a && styles.chipActive]}
            onPress={() => updateField("arrowStart", a)}
          >
            <Text style={[styles.chipText, style.arrowStart === a && styles.chipTextActive]}>
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Mũi tên cuối</Text>
      <View style={styles.row}>
        {ARROW_TYPES.map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, style.arrowEnd === a && styles.chipActive]}
            onPress={() => updateField("arrowEnd", a)}
          >
            <Text style={[styles.chipText, style.arrowEnd === a && styles.chipTextActive]}>
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => useMapStore.getState().deleteCrossLink(link.id)}
      >
        <Text style={styles.deleteBtnText}>🗑️ Xoá cross-link này</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, paddingBottom: 24 },
  title: { color: "#e0e7ff", fontSize: 14, fontWeight: "700", marginBottom: 16 },
  label: {
    color: "#818cf8", fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 10,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: "#1e1b4b", borderWidth: 1, borderColor: "#312e81", marginBottom: 4,
  },
  chipActive: { backgroundColor: "#4f46e5", borderColor: "#818cf8" },
  chipText: { color: "#c7d2fe", fontSize: 11 },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  deleteBtn: {
    marginTop: 20, borderWidth: 1, borderColor: "#ef4444",
    borderRadius: 8, paddingVertical: 10, alignItems: "center",
  },
  deleteBtnText: { color: "#ef4444", fontSize: 13 },
});
