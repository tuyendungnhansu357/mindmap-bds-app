// src/components/panels/NodeStylePanel.tsx

import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MindMapNode, RelationStyle } from "../../types/mindmap";
import { effectiveStyle } from "../../utils/relStyle";

const CONNECTOR_SHAPES: RelationStyle["shape"][] = [
  "curved", "orthogonal", "orthogonal-round", "straight",
];
const DASH_IDS: RelationStyle["dashId"][] = [
  "solid", "thin-solid", "dashed-thin", "cable", "wide-dash",
  "double", "tapered", "reverse-tapered", "auto-tapered",
];
const ARROW_TYPES: RelationStyle["arrowEnd"][] = [
  "none", "arrow", "filled-arrow", "open-arrow", "stop",
  "open-circle", "filled-circle", "open-diamond", "filled-diamond",
];

interface Props {
  node: MindMapNode;
  onStyleChange: (field: keyof RelationStyle, value: any) => void;
}

export function NodeStylePanel({ node, onStyleChange }: Props) {
  const style = effectiveStyle(node.relStyle);
  const [widthText, setWidthText] = useState(String(style.width ?? 2));

  const handleWidthCommit = () => {
    const v = parseFloat(widthText);
    if (!isNaN(v) && v >= 0.5 && v <= 12) {
      onStyleChange("width", Math.round(v * 2) / 2); // round to 0.5 steps
    } else {
      setWidthText(String(style.width ?? 2));
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.nodeTitle} numberOfLines={1}>
        ✏️ {node.title}
      </Text>

      <Section title="Hình dạng đường nối">
        <Row wrap>
          {CONNECTOR_SHAPES.map((s) => (
            <Chip key={s} label={s} active={style.shape === s}
              onPress={() => onStyleChange("shape", s)} />
          ))}
        </Row>
      </Section>

      <Section title="Kiểu nét">
        <Row wrap>
          {DASH_IDS.map((d) => (
            <Chip key={d} label={d} active={style.dashId === d}
              onPress={() => onStyleChange("dashId", d)} />
          ))}
        </Row>
      </Section>

      <Section title="Độ dày (px, 0.5–12)">
        <View style={styles.widthRow}>
          {[0.5, 1, 2, 3, 5, 8].map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.widthChip, (style.width ?? 2) === v && styles.chipActive]}
              onPress={() => { onStyleChange("width", v); setWidthText(String(v)); }}
            >
              <Text style={styles.widthChipText}>{v}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.widthInput}
            value={widthText}
            onChangeText={setWidthText}
            onBlur={handleWidthCommit}
            onSubmitEditing={handleWidthCommit}
            keyboardType="decimal-pad"
            maxLength={4}
            selectTextOnFocus
          />
        </View>
      </Section>

      <Section title="Mũi tên đầu">
        <Row wrap>
          {ARROW_TYPES.map((a) => (
            <Chip key={a} label={a} active={style.arrowStart === a}
              onPress={() => onStyleChange("arrowStart", a)} />
          ))}
        </Row>
      </Section>

      <Section title="Mũi tên cuối">
        <Row wrap>
          {ARROW_TYPES.map((a) => (
            <Chip key={a} label={a} active={style.arrowEnd === a}
              onPress={() => onStyleChange("arrowEnd", a)} />
          ))}
        </Row>
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <View style={[styles.row, wrap && { flexWrap: "wrap" }]}>{children}</View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, paddingBottom: 32 },
  nodeTitle: { color: "#e0e7ff", fontSize: 15, fontWeight: "700", marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: {
    color: "#818cf8", fontSize: 11, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: "#1e1b4b", borderWidth: 1, borderColor: "#312e81", marginBottom: 6,
  },
  chipActive: { backgroundColor: "#4f46e5", borderColor: "#818cf8" },
  chipText: { color: "#c7d2fe", fontSize: 11 },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  widthRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  widthChip: {
    width: 36, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: "#1e1b4b", borderWidth: 1, borderColor: "#312e81",
  },
  widthChipText: { color: "#c7d2fe", fontSize: 12 },
  widthInput: {
    width: 52, height: 32, backgroundColor: "#0f1117", color: "#e0e7ff",
    borderRadius: 8, borderWidth: 1, borderColor: "#4f46e5",
    textAlign: "center", fontSize: 13, paddingHorizontal: 4,
  },
});
