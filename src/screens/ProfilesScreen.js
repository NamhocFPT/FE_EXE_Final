// src/screens/ProfilesScreen.js
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
  SafeAreaView, // THÊM: Import SafeAreaView
  Platform,
  StatusBar
} from "react-native";
import { COLORS, RADIUS } from "../constants/theme";

// Import Service
import { 
  getProfiles, 
  createProfile, 
  updateProfile, 
  deleteProfile 
} from "../services/profileService";

const RELATIONSHIPS = [
  { value: "self", label: "Bản thân" },
  { value: "father", label: "Bố" },
  { value: "mother", label: "Mẹ" },
  { value: "son", label: "Con trai" },
  { value: "daughter", label: "Con gái" },
  { value: "grandfather", label: "Ông" },
  { value: "grandmother", label: "Bà" },
  { value: "spouse", label: "Vợ/Chồng" },
  { value: "other", label: "Khác" },
];

const GENDERS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export default function ProfilesScreen({
  navigation, // Thay onBackHome bằng navigation nếu dùng React Navigation chuẩn
  route,
  accessToken,
  onSelectProfile,
}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  // Form fields
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [relationship, setRelationship] = useState("self");
  const [gender, setGender] = useState("male");
  const [phoneNumber, setPhoneNumber] = useState("");

  const fetchProfiles = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getProfiles(accessToken);
      setProfiles(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetForm = () => {
    setName("");
    setDob("");
    setRelationship("self");
    setGender("male");
    setPhoneNumber("");
    setEditingProfile(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setName(profile.name || "");
    setDob(profile.dob || "");
    setRelationship(profile.relationship || "self");
    setGender(profile.gender || "male");
    setPhoneNumber(profile.phone_number || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên");
      return;
    }

    try {
      const body = {
        name: name.trim(),
        dob: dob || null,
        relationship,
        gender,
        phone_number: phoneNumber.trim() || null,
      };

      if (editingProfile) {
        await updateProfile(accessToken, editingProfile.id, body);
      } else {
        await createProfile(accessToken, body);
      }

      setShowModal(false);
      resetForm();
      fetchProfiles();
      
      Alert.alert(
        "Thành công",
        editingProfile ? "Đã cập nhật hồ sơ" : "Đã tạo hồ sơ mới"
      );
    } catch (err) {
      Alert.alert("Lỗi", String(err.message || err));
    }
  };

  const handleDelete = async (profileId) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa hồ sơ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProfile(accessToken, profileId);
            fetchProfiles();
            Alert.alert("Thành công", "Đã xóa hồ sơ");
          } catch (err) {
            Alert.alert("Lỗi", String(err.message || err));
          }
        },
      },
    ]);
  };

  return (
    // SỬA 1: Dùng SafeAreaView để tránh tai thỏ (Notch)
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + Back */}
          <View style={styles.headerRow}>
            <Text style={styles.h1}>Hồ sơ gia đình</Text>
            
            {/* Nếu dùng React Navigation thì dùng navigation.goBack() */}
            <TouchableOpacity 
              onPress={() => navigation ? navigation.goBack() : null} 
              activeOpacity={0.8}
            >
              <Text style={styles.linkBlue}>‹ Quay lại</Text>
            </TouchableOpacity>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>＋ Thêm hồ sơ mới</Text>
          </TouchableOpacity>

          {error && (
            <Card>
              <Text style={{ color: COLORS.danger }}>{error}</Text>
            </Card>
          )}

          {loading && (
            <Card>
              <Text style={styles.body}>Đang tải...</Text>
            </Card>
          )}

          {/* List */}
          <View style={{ gap: 12 }}>
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <View style={styles.profileRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profile.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <Text style={styles.caption}>
                      {RELATIONSHIPS.find((r) => r.value === profile.relationship)?.label || profile.relationship}
                      {" • "}
                      {GENDERS.find((g) => g.value === profile.gender)?.label || profile.gender}
                    </Text>
                    {profile.dob && (
                      <Text style={styles.caption}>Ngày sinh: {profile.dob}</Text>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={styles.btnIcon}
                      onPress={() => handleEdit(profile)}
                    >
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnIcon}
                      onPress={() => handleDelete(profile.id)}
                    >
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                    {onSelectProfile && (
                      <TouchableOpacity
                        style={[styles.btnIcon, { backgroundColor: COLORS.primary100 }]}
                        onPress={() => onSelectProfile(profile)}
                      >
                        <Text>✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>

          {/* Spacer dưới cùng để không bị navigator che khuất */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Modal Add/Edit */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>
                    {editingProfile ? "Sửa hồ sơ" : "Thêm hồ sơ mới"}
                    </Text>

                    <Text style={styles.label}>Tên *</Text>
                    <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nhập tên"
                    />

                    <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
                    <TextInput
                    style={styles.input}
                    value={dob}
                    onChangeText={setDob}
                    placeholder="2000-01-01"
                    />

                    <Text style={styles.label}>Mối quan hệ *</Text>
                    <View style={styles.pickerRow}>
                    {RELATIONSHIPS.map((rel) => (
                        <TouchableOpacity
                        key={rel.value}
                        style={[
                            styles.pickerBtn,
                            relationship === rel.value && styles.pickerBtnActive,
                        ]}
                        onPress={() => setRelationship(rel.value)}
                        >
                        <Text
                            style={[
                            styles.pickerBtnText,
                            relationship === rel.value && styles.pickerBtnTextActive,
                            ]}
                        >
                            {rel.label}
                        </Text>
                        </TouchableOpacity>
                    ))}
                    </View>

                    <Text style={styles.label}>Giới tính *</Text>
                    <View style={styles.pickerRow}>
                    {GENDERS.map((g) => (
                        <TouchableOpacity
                        key={g.value}
                        style={[
                            styles.pickerBtn,
                            gender === g.value && styles.pickerBtnActive,
                        ]}
                        onPress={() => setGender(g.value)}
                        >
                        <Text
                            style={[
                            styles.pickerBtnText,
                            gender === g.value && styles.pickerBtnTextActive,
                            ]}
                        >
                            {g.label}
                        </Text>
                        </TouchableOpacity>
                    ))}
                    </View>

                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="0123456789"
                    keyboardType="phone-pad"
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.btnModal, { backgroundColor: COLORS.line300 }]}
                            onPress={() => { setShowModal(false); resetForm(); }}
                        >
                            <Text style={[styles.btnModalText, { color: COLORS.text900 }]}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnModal, { backgroundColor: COLORS.primary600 }]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.btnModalText, { color: COLORS.white }]}>Lưu</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{height: 20}} />
                </ScrollView>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Màu nền tổng thể
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: { 
    padding: 16, 
    paddingBottom: 20, 
    gap: 14 
  },
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: COLORS.text900,
  },
  linkBlue: { color: COLORS.accent700, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 22, color: COLORS.text900 },
  caption: { fontSize: 12, color: COLORS.text600 },
  btnPrimary: {
    backgroundColor: COLORS.primary600,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary600,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: "700" },
  profileName: { fontSize: 16, fontWeight: "600", color: COLORS.text900 },
  btnIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.line300,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text900,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text900,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line300,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: COLORS.text900,
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  pickerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.line300,
  },
  pickerBtnActive: {
    backgroundColor: COLORS.primary600,
  },
  pickerBtnText: {
    fontSize: 12,
    color: COLORS.text900,
    fontWeight: "600",
  },
  pickerBtnTextActive: {
    color: COLORS.white,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btnModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnModalText: {
    fontWeight: "700",
    fontSize: 16,
  },
});