// src/components/canvas/NodeActionBubble.tsx

import React from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";

interface Props {
  x: number; // screen-space x (sau transform pan/zoom)
  y: number;
  onAddChild: () => void;
  onDelete: () => void;
  onChangeColor: () => void;
  onChangeIcon: () => void;
  onEditTitle: () => void;
}

export function NodeActionBubble({
  x,
  y,
  onAddChild,
  onDelete,
  onChangeColor,
  onChangeIcon,
  onEditTitle,
}: Props) {
  const actions = [
    { icon: "✏️", label: "Sửa", onPress: onEditTitle },
    { icon: "➕", label: "Thêm con", onPress: onAddChild },
    { icon: "🎨", label: "Màu", onPress: onChangeColor },
    { icon: "😀", label: "Icon", onPress: onChangeIcon },
    { icon: "🗑️", label: "Xoá", onPress: onDelete },
  ];

  return (
    <View
      style={[
        styles.bubble,
        {
          left: x - 130,
          top: y - 70,
        },
      ]}
    >
      {actions.map((a) => (
        <TouchableOpacity key={a.label} style={styles.action} onPress={a.onPress}>
          <Text style={styles.actionIcon}>{a.icon}</Text>
          <Text style={styles.actionLabel}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "#1e1b4b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4f46e5",
    padding: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  action: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    color: "#c7d2fe",
    fontSize: 9,
    marginTop: 2,
  },
});
