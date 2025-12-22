import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getProfiles,
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
  { value: "other", label: "Khác" },
];

const GENDERS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

const Card = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

export default function ProfilesScreen({
  navigation,
  accessToken,
  onSelectProfile,
  onBackHome,
}) {
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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  /* ===== API ===== */
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfiles(accessToken);
      setProfiles(data || []);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải danh sách hồ sơ");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  /* ===== FORM ===== */
  const resetForm = () => {
    setName("");
    setRelationship("self");
    setGender("male");
    setPhoneNumber("");
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
    setRelationship(profile.relationship_to_owner || "self");
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

    const payload = {
      full_name: name.trim(),
      date_of_birth: dob ? dob.toISOString().split("T")[0] : null,
      sex: gender,
      relationship_to_owner: relationship,
      notes: notes || null,
    };

    try {
      if (editingProfile) {
        await updateProfile(editingProfile.id, payload);
      } else {
        await createProfile(payload);
      }

      setShowModal(false);
      resetForm();
      fetchProfiles();
      Alert.alert("Thành công", "Đã lưu hồ sơ");
    } catch (err) {
      Alert.alert("Lỗi", "Không thể lưu hồ sơ");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa hồ sơ này?", [
      { text: "Hủy" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProfile(id);
            fetchProfiles();
          } catch {
            Alert.alert("Lỗi", "Không thể xóa hồ sơ");
          }
        },
      },
    ]);
  };

  const handleGoBack = () => {
    if (onBackHome) onBackHome();
    else navigation.navigate("Home");
  };

  /* ===== RENDER ===== */
  return (
    <View style={[styles.container]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Hồ sơ gia đình</Text>
        <TouchableOpacity onPress={handleGoBack}>
          <Text style={styles.linkBlue}>‹ Quay lại</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleAdd}>
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.btnText}> Thêm hồ sơ mới</Text>
        </TouchableOpacity>

        {profiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("ProfileDetail", {
                profile,
                isOwner: true,
              })
            }
          >
            <Card>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.full_name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.profileName}>{profile.full_name}</Text>
                  <Text style={styles.caption}>
                    {
                      RELATIONSHIPS.find(
                        (r) => r.value === profile.relationship_to_owner
                      )?.label
                    }
                    {" • "}
                    {
                      GENDERS.find((g) => g.value === profile.sex)?.label
                    }
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  {onSelectProfile && (
                    <TouchableOpacity
                      style={[styles.btnIcon, { backgroundColor: COLORS.primary100 }]}
                      onPress={() => onSelectProfile(profile)}
                    >
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.primary600}
                      />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.btnIcon}
                    onPress={() => handleEdit(profile)}
                  >
                    <Ionicons name="create-outline" size={18} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnIcon, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => handleDelete(profile.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ===== MODAL ADD / EDIT ===== */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingProfile ? "Sửa hồ sơ" : "Thêm hồ sơ mới"}
                </Text>

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
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={{
                      color: dob ? COLORS.text900 : COLORS.text400,
                    }}
                  >
                    {dob
                      ? dob.toLocaleDateString("vi-VN")
                      : "Không bắt buộc"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={COLORS.text600}
                  />
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
                      style={[
                        styles.choiceBtn,
                        gender === g.value &&
                          styles.choiceActive,
                      ]}
                      onPress={() => setGender(g.value)}
                    >
                      <Text>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Mối quan hệ</Text>
                <View style={styles.row}>
                  {RELATIONSHIPS.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.choiceBtn,
                        relationship === r.value &&
                          styles.choiceActive,
                      ]}
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

                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={handleSave}
                  >
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  h1: { fontSize: 24, fontWeight: "bold" },
  linkBlue: { color: COLORS.primary600 },

  scrollContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: 16,
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
  profileName: { fontSize: 16, fontWeight: "600" },
  caption: { fontSize: 13, color: COLORS.text600 },

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
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 8,
  },
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
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  choiceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  choiceActive: {
    backgroundColor: COLORS.primary100,
  },
});
