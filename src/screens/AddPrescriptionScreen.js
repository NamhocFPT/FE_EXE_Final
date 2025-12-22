import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Modal,
  ActivityIndicator
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";

// --- SERVICES ---
import { getProfiles } from "../services/profileService";
import { createPrescription, createMedicationRegimen } from "../services/prescriptionService";

export default function AddPrescriptionScreen({ navigation, accessToken, onSuccess }) {
  // --- STATE DỮ LIỆU ---
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // Thông tin chung đơn thuốc (Header)
  const [doctorName, setDoctorName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Danh sách thuốc (Items)
  const [medicines, setMedicines] = useState([]);

  // Modal & Form thêm thuốc
  const [modalVisible, setModalVisible] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",         // Liều dùng (VD: 1)
    unit: "Viên",       // Đơn vị (VD: Viên)
    route: "Uống",      // Đường dùng (Uống, Bôi, Tiêm...)
    quantity: "",       // Tổng số lượng cấp (VD: 20)
    frequency: "daily", // daily, weekly
    duration: "7"       // Số ngày uống
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // --- 1. TẢI DANH SÁCH PROFILES ---
  const loadProfiles = useCallback(async () => {
    try {
      const data = await getProfiles(); // Service này đã tự xử lý logic Mock/Real
      setProfiles(data);
      if (data.length > 0) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải danh sách hồ sơ: " + err.message);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // --- 2. XỬ LÝ DANH SÁCH THUỐC (LOCAL) ---
  const handleAddMedicine = () => {
    // Validate cơ bản
    if (!newMed.name || !newMed.dosage) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Tên thuốc và Liều dùng");
      return;
    }

    // Thêm vào mảng tạm thời (Frontend only)
    setMedicines([...medicines, { ...newMed, id: Date.now() }]);

    // Reset form modal về mặc định
    setNewMed({
      name: "",
      dosage: "",
      unit: "Viên",
      route: "Uống",
      quantity: "",
      frequency: "daily",
      duration: "7"
    });
    setModalVisible(false);
  };

  const handleRemoveMedicine = (id) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  // --- 3. LƯU TẤT CẢ LÊN SERVER ---
  const handleSaveAll = async () => {
    // Validate form tổng
    if (!selectedProfileId) {
      Alert.alert("Lỗi", "Vui lòng chọn hồ sơ bệnh nhân");
      return;
    }
    if (!doctorName) {
      Alert.alert("Lỗi", "Vui lòng nhập tên Bác sĩ hoặc Nơi khám");
      return;
    }
    if (medicines.length === 0) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất 1 loại thuốc vào đơn");
      return;
    }

    setLoading(true);
    try {
      // BƯỚC A: Tạo Đơn thuốc (Prescription Header - Table `prescriptions`)
      const prescriptionPayload = {
        profileId: selectedProfileId,
        doctorName: doctorName,
        diagnosis: diagnosis,
        notes: notes,
        date: date.toISOString() // DB: issued_date
      };

      // Gọi API tạo đơn
      const resPrescription = await createPrescription(prescriptionPayload);

      // Lấy ID đơn thuốc vừa tạo (xử lý tùy vào Mock hay Real API trả về cấu trúc nào)
      const prescriptionId = resPrescription.id || resPrescription.data?.id || resPrescription;
      console.log("✅ Đã tạo đơn thuốc ID:", prescriptionId);

      // BƯỚC B: Tạo chi tiết thuốc & Lịch uống (Tables `prescription_items` & `medication_regimens`)
      const promiseList = medicines.map(med => {
        // Tính ngày kết thúc: start_date + duration
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + parseInt(med.duration || 7));

        // Mapping dữ liệu từ UI form -> Service parameters
        return createMedicationRegimen({
          profileId: selectedProfileId,
          prescriptionItemId: prescriptionId, // Link thuốc này vào đơn vừa tạo

          // Các trường DB yêu cầu:r
          medicationName: med.name,
          doseAmount: med.dosage,
          doseUnit: med.unit,
          route: med.route,
          totalQuantity: med.quantity,

          startDate: date.toISOString(),
          endDate: endDate.toISOString(),
          frequencyType: med.frequency,
          frequencyValue: 1,
        });
      });

      // Chờ tất cả thuốc được lưu xong
      await Promise.all(promiseList);

      Alert.alert("Thành công", "Đã lưu đơn thuốc và tạo lịch nhắc!", [
        {
          text: "OK",
          onPress: () => {
            if (onSuccess) onSuccess();

            // SỬA LỖI NAVIGATE: Điều hướng vào Tab bên trong MainTabs
            navigation.navigate("MainTabs", {
              screen: "MyPrescriptions"
            });
          }
        }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi lưu đơn", error.message || "Có lỗi xảy ra khi lưu");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
          </TouchableOpacity>
          <Text style={styles.h1}>Thêm đơn thuốc</Text>
          <View style={{ width: 40 }} />
        </View>

        {initialLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary600} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* 1. CHỌN HỒ SƠ */}
            <Card style={styles.card}>
              <Text style={styles.label}>Hồ sơ bệnh nhân *</Text>
              <View style={styles.chipRow}>
                {profiles.map((profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    style={[
                      styles.chip,
                      selectedProfileId === profile.id && styles.chipActive,
                    ]}
                    onPress={() => setSelectedProfileId(profile.id)}
                  >
                    <Text style={[
                      styles.chipText,
                      selectedProfileId === profile.id && styles.chipTextActive
                    ]}>
                      {profile.full_name || profile.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* 2. THÔNG TIN CHUNG */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin chung</Text>

              <Text style={styles.label}>Bác sĩ / Nơi khám *</Text>
              <TextInput
                style={styles.input}
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="VD: BS. Nguyễn Văn A - BV Bạch Mai"
              />

              <Text style={styles.label}>Chẩn đoán</Text>
              <TextInput
                style={styles.input}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder="VD: Viêm họng cấp"
              />

              <Text style={styles.label}>Ngày khám</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.text600} />
                <Text style={styles.datePickerText}>
                  {date.toLocaleDateString("vi-VN")}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Ghi chú đơn thuốc</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ghi chú chung..."
                multiline
              />
            </Card>

            {/* 3. DANH SÁCH THUỐC */}
            <View style={styles.medHeader}>
              <Text style={styles.sectionTitle}>Danh sách thuốc ({medicines.length})</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={{ color: COLORS.primary600, fontWeight: 'bold' }}>+ Thêm thuốc</Text>
              </TouchableOpacity>
            </View>

            {medicines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có thuốc nào.</Text>
                <Text style={styles.emptyText}>Bấm "+ Thêm thuốc" để nhập chi tiết.</Text>
              </View>
            ) : (
              medicines.map((med, index) => (
                <Card key={med.id} style={styles.medItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{index + 1}. {med.name}</Text>
                    <Text style={styles.medDetail}>
                      {med.dosage} {med.unit} • {med.route} • {med.frequency === 'daily' ? 'Hàng ngày' : med.frequency}
                    </Text>
                    <Text style={styles.medSubDetail}>
                      Tổng: {med.quantity || '---'} {med.unit} • Trong {med.duration} ngày
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveMedicine(med.id)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </Card>
              ))
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* FOOTER BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
            onPress={handleSaveAll}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Lưu Đơn Thuốc</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* --- MODAL THÊM THUỐC --- */}
        {/* --- MODAL THÊM THUỐC --- */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Thêm Thuốc</Text>

                {/* Hàng 1: Tên thuốc */}
                <Text style={styles.label}>Tên thuốc *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Panadol Extra"
                  value={newMed.name}
                  onChangeText={(t) => setNewMed({ ...newMed, name: t })}
                />

                {/* Hàng 2: Liều dùng + Đơn vị */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Liều dùng (lần) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: 1"
                      keyboardType="numeric"
                      value={newMed.dosage}
                      onChangeText={(t) => setNewMed({ ...newMed, dosage: t })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Đơn vị *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Viên/Gói"
                      value={newMed.unit}
                      onChangeText={(t) => setNewMed({ ...newMed, unit: t })}
                    />
                  </View>
                </View>

                {/* Hàng 3: Đường dùng + Tổng số lượng */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Đường dùng</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Uống/Bôi"
                      value={newMed.route}
                      onChangeText={(t) => setNewMed({ ...newMed, route: t })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Tổng mua/cấp</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: 20"
                      keyboardType="numeric"
                      value={newMed.quantity}
                      onChangeText={(t) => setNewMed({ ...newMed, quantity: t })}
                    />
                  </View>
                </View>

                {/* Hàng 4: Thời gian uống & Tần suất (Đã cập nhật lựa chọn) */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Uống trong (ngày)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={newMed.duration}
                      onChangeText={(t) => setNewMed({ ...newMed, duration: t })}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.label}>Tần suất *</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[
                        { id: 'daily', label: 'Hàng ngày' },
                        { id: 'weekly', label: 'Định kỳ' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', flex: 1, alignItems: 'center' },
                            newMed.frequency === item.id && { backgroundColor: COLORS.primary600, borderColor: COLORS.primary600 }
                          ]}
                          onPress={() => setNewMed({ ...newMed, frequency: item.id })}
                        >
                          <Text style={[
                            { fontSize: 12, color: '#6B7280' },
                            newMed.frequency === item.id && { color: 'white', fontWeight: 'bold' }
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => setModalVisible(false)}>
                    <Text style={{ color: COLORS.text600 }}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnAdd} onPress={handleAddMedicine}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Thêm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 30,
    height: 60,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  h1: { fontSize: 18, fontWeight: "600", color: COLORS.text900 },

  scrollContent: { padding: 16 },
  card: {
    backgroundColor: "white", borderRadius: RADIUS.md, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text900, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "500", color: COLORS.text600, marginBottom: 6, marginTop: 8 },

  input: {
    borderWidth: 1, borderColor: COLORS.line300, borderRadius: 8,
    padding: 10, fontSize: 14, color: COLORS.text900, backgroundColor: "#F9FAFB"
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "transparent"
  },
  chipActive: { backgroundColor: "#EFF6FF", borderColor: COLORS.primary600 },
  chipText: { fontSize: 13, color: COLORS.text600 },
  chipTextActive: { color: COLORS.primary600, fontWeight: "600" },

  datePickerButton: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.line300,
    borderRadius: 8, padding: 10, backgroundColor: "#F9FAFB"
  },
  datePickerText: { marginLeft: 8, color: COLORS.text900 },

  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  medItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10 },
  medName: { fontSize: 15, fontWeight: "600", color: COLORS.text900 },
  medDetail: { fontSize: 13, color: COLORS.text900, marginTop: 2, fontWeight: '500' },
  medSubDetail: { fontSize: 12, color: COLORS.text600, marginTop: 1 },

  emptyBox: { padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  emptyText: { color: '#9CA3AF' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB'
  },
  btnPrimary: {
    backgroundColor: COLORS.primary600, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center'
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  btnOutline: { paddingVertical: 10, paddingHorizontal: 20 },
  btnAdd: { backgroundColor: COLORS.primary600, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 }
});