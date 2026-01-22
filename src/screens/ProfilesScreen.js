import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  getProfiles1,       // ✅ dùng service mới
  createProfile,
  updateProfile,
  deleteProfile,
} from "../services/profileService";

/* ===== CONST ===== */
const RELATIONSHIPS = [
  { value: "self", label: "Bản thân" },
  { value: "father", label: "Bố" },
  { value: "mother", label: "Mẹ" },
  { value: "son", label: "Con trai" },
  { value: "daughter", label: "Con gái" },
  { value: "spouse", label: "Vợ/Chồng" },
  { value: "sister", label: "Chị/Em gái" },
  { value: "brother", label: "Anh/Em trai" },
  { value: "other", label: "Khác" },
];

const GENDERS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

const Card = ({ children }) => <View style={styles.card}>{children}</View>;

/** normalize role */
const getMyRole = (p) =>
  (p?.my_role || p?.role || p?.access_role || "owner").toLowerCase(); // fallback owner cho data cũ

const roleLabel = (role) => {
  if (role === "owner") return "Owner";
  if (role === "caregiver") return "Caregiver";
  if (role === "viewer") return "Viewer";
  return role;
};

export default function ProfilesScreen({ navigation, onSelectProfile, onBackHome }) {
  const insets = useSafeAreaInsets();

  /* ===== STATE ===== */
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  // Form
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("self");
  const [gender, setGender] = useState("male");
  const [notes, setNotes] = useState("");
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // ✅ check đã có self chưa (tính theo relationship_to_owner)
  const hasSelfProfile = useMemo(() => {
    return (profiles || []).some((p) => (p?.relationship_to_owner || "").toLowerCase() === "self");
  }, [profiles]);

  /* ===== API ===== */
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProfiles1(); // ✅ scope=all
      const payload = res?.data ?? res;

      // backend có thể trả array trực tiếp hoặc {data: []}
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      setProfiles(list);
    } catch (err) {
      console.error("fetchProfiles error:", err);
      Alert.alert("Lỗi", err?.message || "Không thể tải danh sách hồ sơ");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  /* ===== FORM ===== */
  const resetForm = () => {
    setName("");
    // ✅ nếu đã có self, mặc định chuyển sang "other" khi thêm mới
    setRelationship(hasSelfProfile ? "other" : "self");
    setGender("male");
    setDob(null);
    setNotes("");
    setEditingProfile(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setName(profile.full_name || "");
    setRelationship(profile.relationship_to_owner || "other");
    setGender(profile.sex || "male");
    setDob(profile.date_of_birth ? new Date(profile.date_of_birth) : null);
    setNotes(profile.notes || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ tên");
      return;
    }

    // ✅ chặn thêm self lần 2 (chỉ chặn khi tạo mới; edit profile self thì vẫn ok)
    if (!editingProfile && hasSelfProfile && relationship === "self") {
      Alert.alert("Không hợp lệ", "Bạn chỉ có thể tạo 1 hồ sơ 'Bản thân'. Hãy chọn mối quan hệ khác.");
      return;
    }

    const payload = {
      full_name: name.trim(),
      date_of_birth: dob ? dob.toISOString().split("T")[0] : null,
      sex: gender,
      relationship_to_owner: relationship,
      notes: notes || null,
    };

    try {
      if (editingProfile) {
        // ✅ chỉ owner mới được edit (đảm bảo lần nữa)
        const role = getMyRole(editingProfile);
        if (role !== "owner") {
          Alert.alert("Không được phép", "Bạn không có quyền sửa hồ sơ này (chỉ Owner).");
          return;
        }
        await updateProfile(editingProfile.id, payload); // PATCH đúng API
      } else {
        await createProfile(payload);
      }

      setShowModal(false);
      resetForm();
      fetchProfiles();
      Alert.alert("Thành công", "Đã lưu hồ sơ");
    } catch (err) {
      console.error("handleSave error:", err);
      Alert.alert("Lỗi", err?.message || "Không thể lưu hồ sơ");
    }
  };

  const handleDelete = (profile) => {
    const role = getMyRole(profile);
    if (role !== "owner") {
      Alert.alert("Không được phép", "Bạn không có quyền xoá hồ sơ này (chỉ Owner).");
      return;
    }

    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa hồ sơ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(profile.id);

            await deleteProfile(profile.id);

            // ✅ reload list
            await fetchProfiles();

            // ✅ thông báo thành công
            Alert.alert("Thành công", "Đã xóa hồ sơ.");
          } catch (e) {
            console.error("delete profile error:", e);
            Alert.alert("Lỗi", e?.message || "Không thể xóa hồ sơ");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };


  const handleGoBack = () => {
    if (onBackHome) onBackHome();
    else navigation.navigate("Home");
  };

  // ✅ relationship options: nếu đã có self và đang tạo mới -> ẩn option self
  const relationshipOptions = useMemo(() => {
    if (!editingProfile && hasSelfProfile) {
      return RELATIONSHIPS.filter((r) => r.value !== "self");
    }
    return RELATIONSHIPS;
  }, [editingProfile, hasSelfProfile]);

  /* ===== RENDER ===== */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Hồ sơ gia đình</Text>
        <TouchableOpacity onPress={handleGoBack}>
          <Text style={styles.linkBlue}>‹ Quay lại</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ADD */}
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAdd}>
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.btnText}> Thêm hồ sơ mới</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 16 }} />
        ) : profiles.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.text600 }}>Chưa có hồ sơ nào.</Text>
          </Card>
        ) : (
          profiles.map((profile) => {
            const role = getMyRole(profile);
            const isOwner = role === "owner";
            const relationshipLabel =
              RELATIONSHIPS.find((r) => r.value === profile.relationship_to_owner)?.label || "—";
            const genderLabel = GENDERS.find((g) => g.value === profile.sex)?.label || "—";

            return (
              <TouchableOpacity
                key={profile.id}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("ProfileDetail", {
                    profile,
                    isOwner,
                    myRole: role,
                  })
                }
              >
                <Card>
                  <View style={styles.profileRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(profile.full_name || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.profileName}>{profile.full_name || "N/A"}</Text>

                        {/* ✅ role badge */}
                        <View
                          style={[
                            styles.roleBadge,
                            role === "owner"
                              ? styles.roleOwner
                              : role === "caregiver"
                                ? styles.roleCaregiver
                                : styles.roleViewer,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              role === "owner"
                                ? styles.roleOwnerText
                                : role === "caregiver"
                                  ? styles.roleCaregiverText
                                  : styles.roleViewerText,
                            ]}
                          >
                            {roleLabel(role)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.caption}>
                        {relationshipLabel} {" • "} {genderLabel}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>

                      {/* ✅ chỉ owner mới có edit/delete */}
                      {isOwner && (
                        <>
                          <TouchableOpacity style={styles.btnIcon} onPress={() => handleEdit(profile)}>
                            <Ionicons name="create-outline" size={18} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.btnIcon, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleDelete(profile)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ===== MODAL ADD / EDIT ===== */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingProfile ? "Sửa hồ sơ" : "Thêm hồ sơ mới"}</Text>

                <Text style={styles.label}>
                  Họ tên <Text style={{ color: COLORS.error600 }}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập họ tên"
                />

                <Text style={styles.label}>Ngày sinh</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: dob ? COLORS.text900 : COLORS.text400 }}>
                    {dob ? dob.toLocaleDateString("vi-VN") : "Không bắt buộc"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.text600} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dob || new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(e, date) => {
                      setShowDatePicker(false);
                      if (date) setDob(date);
                    }}
                  />
                )}

                <Text style={styles.label}>Giới tính</Text>
                <View style={styles.row}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.choiceBtn, gender === g.value && styles.choiceActive]}
                      onPress={() => setGender(g.value)}
                    >
                      <Text>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Mối quan hệ</Text>

                {/* ✅ nếu đã có self và đang tạo mới: thông báo */}
                {!editingProfile && hasSelfProfile && (
                  <Text style={styles.helperText}>
                    Bạn đã có hồ sơ “Bản thân”, nên không thể tạo thêm “Bản thân” lần nữa.
                  </Text>
                )}

                <View style={styles.row}>
                  {relationshipOptions.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.choiceBtn, relationship === r.value && styles.choiceActive]}
                      onPress={() => setRelationship(r.value)}
                    >
                      <Text>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    <Text style={styles.linkBlue}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
                    <Text style={styles.btnText}>Lưu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", padding: 20 },
  h1: { fontSize: 24, fontWeight: "bold" },
  linkBlue: { color: COLORS.primary600 },

  scrollContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  btnPrimary: {
    backgroundColor: COLORS.primary600,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  btnText: { color: "white", fontWeight: "700" },

  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "white", fontSize: 20, fontWeight: "700" },

  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  profileName: { fontSize: 16, fontWeight: "600", flex: 1 },
  caption: { fontSize: 13, color: COLORS.text600, marginTop: 2 },

  // role badge
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  roleBadgeText: { fontSize: 11, fontWeight: "800" },

  roleOwner: { backgroundColor: "#ECFDF5", borderColor: "#86EFAC" },
  roleOwnerText: { color: "#16A34A" },

  roleCaregiver: { backgroundColor: "#EFF6FF", borderColor: "#93C5FD" },
  roleCaregiverText: { color: "#2563EB" },

  roleViewer: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  roleViewerText: { color: "#374151" },

  btnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "white", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "600", marginBottom: 4, marginTop: 8 },

  helperText: { color: "#6B7280", fontSize: 12, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  choiceBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#F3F4F6" },
  choiceActive: { backgroundColor: COLORS.primary100 },
});
