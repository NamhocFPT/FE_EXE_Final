import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/theme";

// ✅ IMPORTANT: dùng service theo đúng contract shares
// GET  /patient-profiles/{profileId}/shares
// POST /patient-profiles/{profileId}/shares
// DELETE /patient-profiles/{profileId}/shares/{shareId}
import {
  listProfileShares,
  createProfileShare,
  revokeProfileShare,
} from "../services/profileShareService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const friendlyShareError = (err) => {
  const status = err?.status || err?.response?.status;

  const raw =
    err?.response?.data?.message ||
    err?.message ||
    "";

  const msg = String(raw).toLowerCase();

  // ✅ các case phổ biến
  if (status === 404) {
    // "Người dùng không tồn tại. Không thể chia sẻ với người này"
    return "Email này chưa đăng ký CareDose. Hãy kiểm tra lại email.";
  }

  if (status === 409 || msg.includes("trùng") || msg.includes("already") || msg.includes("exists")) {
    return "Email này đã được chia sẻ trước đó.";
  }

  if (status === 400) {
    return raw || "Dữ liệu không hợp lệ.";
  }

  // fallback
  return raw || "Không thể chia sẻ hồ sơ. Vui lòng thử lại.";
};

const roleLabel = (role) => (role === "caregiver" ? "Người chăm sóc" : "Người xem");
const roleHint = (role) => (role === "caregiver" ? "Xem & ghi nhận uống thuốc" : "Chỉ xem thông tin");

export default function ShareProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const profile = route.params?.profile;

  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("viewer"); // caregiver | viewer

  const [sharedUsers, setSharedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changingId, setChangingId] = useState(null); // shareId đang đổi quyền / revoke

  const pickArray = (res) => {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
  };

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setRefreshing(true);
      const res = await listProfileShares(profile.id);
      // service đã trả array rồi, nhưng vẫn pickArray để an toàn
      setSharedUsers(pickArray(res));
    } catch (err) {
      setSharedUsers([]);
      Alert.alert("Lỗi", err?.message || "Không thể tải danh sách chia sẻ.");
    } finally {
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const normalizedEmail = useMemo(() => recipientEmail.trim().toLowerCase(), [recipientEmail]);

  const handleSendInvitation = async () => {
    if (!profile?.id) return Alert.alert("Lỗi", "Thiếu profileId.");
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return Alert.alert("Lỗi", "Vui lòng nhập email hợp lệ.");
    }
    if (!["caregiver", "viewer"].includes(selectedRole)) return Alert.alert("Lỗi", "Role không hợp lệ.");

    setSubmitting(true);
    try {
      await createProfileShare(profile.id, { user_email: normalizedEmail, role: selectedRole });

      Alert.alert("Thành công", `Đã chia sẻ hồ sơ với ${normalizedEmail}`);
      setRecipientEmail("");
      setSelectedRole("viewer");
      await loadData();
    } catch (err) {
      Alert.alert("Không thể chia sẻ", friendlyShareError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ UC-SH3 (tạm): đổi role = DELETE share cũ + POST share mới
  const handleToggleRole = async (share) => {
    const profileId = profile?.id;
    const shareId = share?.share_id || share?.id;
    const currentRole = share?.role;
    const nextRole = currentRole === "caregiver" ? "viewer" : "caregiver";

    // user email để tạo lại share
    const u = share?.user || share;
    const email = (u?.email || share?.user_email || "").trim().toLowerCase();

    if (!profileId) return Alert.alert("Lỗi", "Thiếu profileId.");
    if (!shareId) return Alert.alert("Lỗi", "Thiếu shareId.");
    if (!email || !emailRegex.test(email)) return Alert.alert("Lỗi", "Thiếu email người nhận (để tạo lại share).");
    if (!["caregiver", "viewer"].includes(nextRole)) return Alert.alert("Lỗi", "Role không hợp lệ.");

    Alert.alert(
      "Đổi quyền truy cập",
      `Đổi từ "${roleLabel(currentRole)}" sang "${roleLabel(nextRole)}"?\n\n(Hiện tại backend chưa có API PATCH, nên app sẽ thu hồi share cũ và tạo share mới.)`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đổi quyền",
          onPress: async () => {
            try {
              setChangingId(shareId);

              // Optimistic UI
              setSharedUsers((prev) =>
                prev.map((x) => ((x.share_id || x.id) === shareId ? { ...x, role: nextRole } : x))
              );

              // 1) revoke
              await revokeProfileShare(profileId, shareId);

              // 2) create new share with nextRole
              await createProfileShare(profileId, { user_email: email, role: nextRole });

              Alert.alert("Thành công", "Đã đổi quyền truy cập.");
              await loadData();
            } catch (err) {
              Alert.alert("Không thể đổi quyền", friendlyShareError(err));
              await loadData();
            } finally {
              setChangingId(null);
            }
          },
        },
      ]
    );
  };

  const handleUnshare = (share) => {
    const profileId = profile?.id;
    const shareId = share?.share_id || share?.id;
    const u = share?.user || share;
    const name = u?.full_name || u?.name || u?.email || "người này";

    if (!profileId) return Alert.alert("Lỗi", "Thiếu profileId.");
    if (!shareId) return Alert.alert("Lỗi", "Thiếu shareId.");

    Alert.alert("Xác nhận", `Ngừng chia sẻ với ${name}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Ngừng chia sẻ",
        style: "destructive",
        onPress: async () => {
          try {
            setChangingId(shareId);

            // optimistic remove
            setSharedUsers((prev) => prev.filter((x) => (x.share_id || x.id) !== shareId));

            await revokeProfileShare(profileId, shareId);

            Alert.alert("Thành công", "Đã thu hồi quyền truy cập.");
            await loadData();
          } catch (err) {
            Alert.alert("Lỗi", err?.message || "Không thể thu hồi quyền.");
            await loadData();
          } finally {
            setChangingId(null);
          }
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={{ color: "#111827" }}>Không có dữ liệu hồ sơ.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: COLORS.primary600, fontWeight: "700" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { paddingTop: insets.top }]}
    >
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
        {/* Profile Summary */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSm}>
            <Text style={styles.avatarTextSm}>
              {(profile.full_name || profile.name || "P").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.profileLabel}>Đang chia sẻ hồ sơ của</Text>
            <Text style={styles.profileName}>{profile.full_name || profile.name}</Text>
          </View>
        </View>

        {/* UC-SH1: Form share */}
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
            <TouchableOpacity
              style={[styles.roleBox, selectedRole === "caregiver" && styles.roleBoxActive]}
              onPress={() => setSelectedRole("caregiver")}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: selectedRole === "caregiver" ? "white" : "#F3F4F6" },
                ]}
              >
                <Ionicons
                  name="heart"
                  size={20}
                  color={selectedRole === "caregiver" ? COLORS.primary600 : "#6B7280"}
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === "caregiver" && styles.roleTitleActive]}>
                Người chăm sóc
              </Text>
              <Text style={[styles.roleDesc, selectedRole === "caregiver" && { color: "#BFDBFE" }]}>
                Xem & ghi nhận uống thuốc
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBox, selectedRole === "viewer" && styles.roleBoxActive]}
              onPress={() => setSelectedRole("viewer")}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: selectedRole === "viewer" ? "white" : "#F3F4F6" },
                ]}
              >
                <Ionicons
                  name="eye"
                  size={20}
                  color={selectedRole === "viewer" ? COLORS.primary600 : "#6B7280"}
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === "viewer" && styles.roleTitleActive]}>
                Người xem
              </Text>
              <Text style={[styles.roleDesc, selectedRole === "viewer" && { color: "#BFDBFE" }]}>
                Chỉ xem thông tin
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
            onPress={handleSendInvitation}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Feather name="user-plus" size={18} color="white" />
                <Text style={styles.btnSubmitText}>Gửi chia sẻ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* UC-SH2: list shares */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đang chia sẻ ({sharedUsers.length})</Text>
          <TouchableOpacity onPress={loadData} disabled={refreshing} style={{ padding: 6 }}>
            <Feather name="refresh-cw" size={16} color={COLORS.primary600} />
          </TouchableOpacity>
        </View>

        {refreshing ? (
          <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 8 }} />
        ) : sharedUsers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa chia sẻ cho ai.</Text>
          </View>
        ) : (
          sharedUsers.map((share) => {
            const shareId = share?.share_id || share?.id;
            const u = share?.user || share;
            const displayName = u?.full_name || u?.name || u?.email || "Người dùng";
            const email = u?.email || share?.user_email || "";
            const role = share?.role || "viewer";
            const busy = changingId && (changingId === shareId);

            return (
              <View key={shareId} style={styles.userItem}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.userName}>{displayName}</Text>
                  {!!email && <Text style={styles.userEmail}>{email}</Text>}

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: role === "caregiver" ? "#DCFCE7" : "#EFF6FF" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: role === "caregiver" ? "#16A34A" : COLORS.primary600 },
                        ]}
                      >
                        {roleLabel(role)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#6B7280" }}>{roleHint(role)}</Text>
                  </View>
                </View>

                {/* UC-SH3 actions */}
                <View style={{ alignItems: "flex-end", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleToggleRole(share)}
                    style={[styles.smallActionBtn, busy && { opacity: 0.6 }]}
                    disabled={!!busy}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={COLORS.primary600} />
                    ) : (
                      <Feather name="repeat" size={16} color={COLORS.primary600} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUnshare(share)}
                    style={[styles.smallActionBtn, busy && { opacity: 0.6 }]}
                    disabled={!!busy}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { flexDirection: "row", alignItems: "center" },
  backText: { color: COLORS.primary600, fontSize: 16, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },

  scrollContent: { padding: 16 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary600,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextSm: { color: "white", fontWeight: "bold" },
  profileLabel: { fontSize: 12, color: "#6B7280" },
  profileName: { fontSize: 15, fontWeight: "700", color: "#111827" },

  sectionCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 16 },

  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, fontSize: 15, color: "#111827" },

  roleContainer: { flexDirection: "row", gap: 10, marginBottom: 24 },
  roleBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  },
  roleBoxActive: { backgroundColor: COLORS.primary600, borderColor: COLORS.primary600 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  roleTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  roleTitleActive: { color: "white" },
  roleDesc: { fontSize: 11, color: "#6B7280", lineHeight: 14 },

  btnSubmit: {
    backgroundColor: COLORS.primary600,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: COLORS.primary600,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnSubmitText: { color: "white", fontWeight: "700", fontSize: 16 },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  emptyBox: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyText: { color: "#6B7280" },

  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarText: { color: "#6B7280", fontWeight: "600" },
  userName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  userEmail: { fontSize: 12, color: "#6B7280" },

  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },

  smallActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  infoBox: { marginTop: 18, padding: 12, backgroundColor: "#EFF6FF", borderRadius: 10 },
  infoText: { fontSize: 12, color: "#1E40AF", textAlign: "center" },
});
