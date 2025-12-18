// src/screens/AccountDetailsScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, RADIUS } from "../constants/theme";

// Import Service
import { getMyProfile } from "../services/authService";

export default function AccountDetailsScreen({ navigation, onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gọi API lấy thông tin user (UC-A3)
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setUser(data);
    } catch (error) {
      console.error("Lỗi tải thông tin tài khoản:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin tài khoản.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload data mỗi khi màn hình được focus (để cập nhật nếu vừa sửa xong)
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  // Helper: Lấy 2 chữ cái đầu của tên để làm Avatar
  const getInitials = (name) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Helper: Format ngày (created_at)
  const formatDate = (dateString) => {
    if (!dateString) return "---";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* --- CUSTOM HEADER (Đồng bộ style) --- */}
      <View style={styles.headerContainer}>
        {/* Left Action: Arrow + Text */}
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.primary600} />
          {/* <Text style={styles.headerBackText}>Quay lại</Text> */}
        </TouchableOpacity>

        {/* Center Title */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tài khoản</Text>
        </View>

        {/* Right Placeholder */}
        <View style={styles.headerRight} />
      </View>

      {/* --- CONTENT --- */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary600} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* HERO SECTION (Avatar + Basic Info) */}
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
            </View>

            <Text style={styles.userName}>{user?.full_name || "Người dùng"}</Text>
            <Text style={styles.userEmail}>{user?.email || "email@example.com"}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || "USER"}</Text>
            </View>
          </View>

          {/* INFORMATION LIST */}
          <View style={styles.infoCard}>
            {/* Phone Row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user?.phone_number || "Chưa cập nhật"}</Text>
            </View>

            <View style={styles.divider} />

            {/* Joined Date Row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày tham gia</Text>
              <Text style={styles.infoValue}>{formatDate(user?.created_at)}</Text>
            </View>

            <View style={styles.divider} />

            {/* Status Row */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: user?.status === "active" ? COLORS.success : COLORS.text600 },
                ]}
              >
                {user?.status === "active" ? "Hoạt động" : user?.status || "---"}
              </Text>
            </View>
          </View>

          {/* ACTIONS */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("EditAccount", { user: user })} // Điều hướng sang trang sửa (sẽ làm sau)
            >
              <Text style={styles.btnPrimaryText}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutlineDanger}
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
                    { text: "Hủy", style: "cancel" },
                    { text: "Đăng xuất", style: "destructive", onPress: onLogout }
                ])
              }}
            >
              <Text style={styles.btnDangerText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{height: 40}} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Khớp với bg-gray-50
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // --- HEADER STYLES (Đồng bộ) ---
  headerContainer: {
    backgroundColor: "white",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 8 : 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerBackText: {
    fontSize: 16,
    color: COLORS.primary600, // #2563EB
    fontWeight: "500",
    marginLeft: -4,
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text900, // #111827
  },
  headerRight: {
    flex: 1,
  },

  // --- BODY STYLES ---
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  
  // Hero Card
  heroCard: {
    backgroundColor: "white",
    borderRadius: 16, // rounded-2xl
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2, // shadow-sm
  },
  avatarContainer: {
    width: 96, // w-24 (24 * 4)
    height: 96, // h-24
    borderRadius: 48,
    backgroundColor: COLORS.primary600, // #2563EB
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30, // text-3xl
    color: "white",
    fontWeight: "600",
  },
  userName: {
    fontSize: 24, // text-2xl
    fontWeight: "600",
    color: COLORS.text900,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280", // text-gray-500
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "#DBEAFE", // bg-blue-100
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary600, // text-blue-600
    textTransform: "uppercase",
  },

  // Info List Card
  infoCard: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6", // border-gray-100
    marginHorizontal: 16,
  },
  infoLabel: {
    fontSize: 15,
    color: "#4B5563", // text-gray-600
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text900,
    fontWeight: "500",
  },

  // Actions
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary600,
    paddingVertical: 14,
    borderRadius: 12, // rounded-xl
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  btnOutlineDanger: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DC2626", // red-600
  },
  btnDangerText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
});