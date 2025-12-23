import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../constants/theme";

// Import các service cần thiết
import { shareProfile, getSharedUsers, unshareProfile } from "../services/profileService";

export default function ShareProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = route.params; // Nhận profile từ ProfileDetailScreen

  /* =======================
      STATE
  ======================= */
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("viewer"); // 'caregiver' hoặc 'viewer'
  const [sharedUsers, setSharedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  /* =======================
      LOGIC XỬ LÝ
  ======================= */
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await getSharedUsers(profile.id);
      setSharedUsers(data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách chia sẻ:", err);
    } finally {
      setRefreshing(false);
    }
  }, [profile.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvitation = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      Alert.alert("Lỗi", "Vui lòng nhập email hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      // Thực hiện UC-SH1: Lưu vào bảng profile_shares
      await shareProfile(profile.id, recipientEmail.toLowerCase().trim(), selectedRole);
      
      Alert.alert("Thành công", `Đã chia sẻ hồ sơ với ${recipientEmail}`);
      setRecipientEmail("");
      loadData(); // Cập nhật lại danh sách bên dưới
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể chia sẻ hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = (shareId, name) => {
    Alert.alert("Xác nhận", `Bạn có chắc muốn ngừng chia sẻ với ${name}?`, [
      { text: "Hủy", style: "cancel" },
      { 
        text: "Ngừng chia sẻ", 
        style: "destructive", 
        onPress: async () => {
          try {
            await unshareProfile(shareId);
            loadData();
          } catch (err) {
            Alert.alert("Lỗi", "Không thể thực hiện yêu cầu.");
          }
        } 
      },
    ]);
  };

  /* =======================
      RENDER UI
  ======================= */
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chia sẻ hồ sơ</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Summary Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSm}>
            <Text style={styles.avatarTextSm}>{profile.full_name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.profileLabel}>Đang chia sẻ hồ sơ của</Text>
            <Text style={styles.profileName}>{profile.full_name}</Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thêm người được chia sẻ</Text>
          
          <Text style={styles.label}>Email người nhận</Text>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>Quyền truy cập</Text>
          <View style={styles.roleContainer}>
            {/* Caregiver Option */}
            <TouchableOpacity 
              style={[styles.roleBox, selectedRole === 'caregiver' && styles.roleBoxActive]}
              onPress={() => setSelectedRole('caregiver')}
            >
              <View style={[styles.iconCircle, { backgroundColor: selectedRole === 'caregiver' ? 'white' : '#F3F4F6' }]}>
                <Ionicons name="heart" size={20} color={selectedRole === 'caregiver' ? COLORS.primary600 : '#6B7280'} />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'caregiver' && styles.roleTitleActive]}>Người chăm sóc</Text>
              <Text style={[styles.roleDesc, selectedRole === 'caregiver' && { color: '#BFDBFE' }]}>Xem & ghi nhận uống thuốc</Text>
            </TouchableOpacity>

            {/* Viewer Option */}
            <TouchableOpacity 
              style={[styles.roleBox, selectedRole === 'viewer' && styles.roleBoxActive]}
              onPress={() => setSelectedRole('viewer')}
            >
              <View style={[styles.iconCircle, { backgroundColor: selectedRole === 'viewer' ? 'white' : '#F3F4F6' }]}>
                <Ionicons name="eye" size={20} color={selectedRole === 'viewer' ? COLORS.primary600 : '#6B7280'} />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'viewer' && styles.roleTitleActive]}>Người xem</Text>
              <Text style={[styles.roleDesc, selectedRole === 'viewer' && { color: '#BFDBFE' }]}>Chỉ xem thông tin</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btnSubmit, loading && { opacity: 0.7 }]} 
            onPress={handleSendInvitation}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Feather name="user-plus" size={18} color="white" />
                <Text style={styles.btnSubmitText}>Gửi lời mời chia sẻ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Shares List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đang chia sẻ ({sharedUsers.length})</Text>
        </View>

        {refreshing ? <ActivityIndicator color={COLORS.primary600} /> : (
          sharedUsers.map((user) => (
            <View key={user.id} style={styles.userItem}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user.name?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={[styles.badge, { backgroundColor: user.role === 'caregiver' ? '#DCFCE7' : '#EFF6FF' }]}>
                  <Text style={[styles.badgeText, { color: user.role === 'caregiver' ? '#16A34A' : COLORS.primary600 }]}>
                    {user.role === 'caregiver' ? 'Người chăm sóc' : 'Người xem'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleUnshare(user.id, user.name)}>
                <Feather name="trash-2" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Lưu ý: Người nhận cần có tài khoản CareDose để truy cập hồ sơ.
          </Text>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backBtn: { flexDirection: "row", alignItems: "center" },
  backText: { color: COLORS.primary600, fontSize: 16, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  scrollContent: { padding: 16 },
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  avatarSm: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary600, justifyContent: "center", alignItems: "center" },
  avatarTextSm: { color: "white", fontWeight: "bold" },
  profileLabel: { fontSize: 12, color: "#6B7280" },
  profileName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionCard: { backgroundColor: "white", padding: 16, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingHorizontal: 12, marginBottom: 20 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 15, color: "#111827" },
  roleContainer: { flexDirection: "row", gap: 10, marginBottom: 24 },
  roleBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: "#E5E7EB", backgroundColor: "white" },
  roleBoxActive: { backgroundColor: COLORS.primary600, borderColor: COLORS.primary600 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  roleTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  roleTitleActive: { color: "white" },
  roleDesc: { fontSize: 11, color: "#6B7280", lineHeight: 14 },
  btnSubmit: { backgroundColor: COLORS.primary600, height: 52, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, shadowColor: COLORS.primary600, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  btnSubmitText: { color: "white", fontWeight: "700", fontSize: 16 },
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  userItem: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  userAvatarText: { color: "#6B7280", fontWeight: "600" },
  userName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  userEmail: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  infoBox: { marginTop: 20, padding: 12, backgroundColor: "#EFF6FF", borderRadius: 10 },
  infoText: { fontSize: 12, color: "#1E40AF", textAlign: "center" }
});