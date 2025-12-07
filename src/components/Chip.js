// src/components/Chip.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";

export default function Chip({
  label,
  color = COLORS.accent700,
  bg = COLORS.primary100,
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: RADIUS.chip,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 12, fontWeight: "600" },
});