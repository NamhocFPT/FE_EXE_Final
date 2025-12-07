// src/components/Card.js
import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme"; // Import từ file theme vừa tạo

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
});