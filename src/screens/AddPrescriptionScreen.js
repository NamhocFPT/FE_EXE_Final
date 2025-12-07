// AddPrescriptionScreen.js - Thêm đơn thuốc mới
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getBase } from "../utils/apiBase";      // Trỏ về utils
import { COLORS, RADIUS } from "../constants/theme"; // Import theme chung
import Card from "../components/Card";


const UNITS = ["Viên", "Gói", "Chai", "Ống", "Hộp", "ml", "mg", "g", "Khác"];


export default function AddPrescriptionScreen({ onBackHome, accessToken }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [medicineName, setMedicineName] = useState("");
  const [medicineDesc, setMedicineDesc] = useState("");
  const [unit, setUnit] = useState("Viên");
  const [dosage, setDosage] = useState("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfiles = useCallback(async () => {
    try {
      const base = getBase();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const res = await fetch(`${base}/api/profiles`, { headers });
      let json = null;
      try {
        json = await res.json();
      } catch (_) {}

      if (!res.ok) {
        throw new Error("Không thể tải danh sách hồ sơ");
      }

      const items = (json && json.data) || [];
      setProfiles(items);
      if (items.length > 0) {
        setSelectedProfile(items[0].id);
      }
    } catch (err) {
      setError(String(err.message || err));
    }
  }, [accessToken]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSave = async () => {
    if (!selectedProfile) {
      Alert.alert("Lỗi", "Vui lòng chọn hồ sơ");
      return;
    }
    if (!medicineName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên thuốc");
      return;
    }
    if (!dosage.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập liều lượng");
      return;
    }

    setLoading(true);
    try {
      const base = getBase();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // Step 1: Create medicine (hoặc lấy medicine đã tồn tại)

      const medicineRes = await fetch(
        `${base}/api/medicines/${medicineName.trim()}`,
        {
          method: "GET",
          headers: {
            // Không cần Content-Type cho GET trừ khi bạn có lý do đặc biệt
            ...(headers || {}),
          },
        }
      );
      let medicineJson = null;
      try {
        medicineJson = await medicineRes.json();
      } catch (_) {}

      if (!medicineRes.ok) {
        throw new Error("Không thể tạo thuốc");
      }

      const medicineId = medicineJson.data.id;
      // Step 2: Create prescription with the medicine_id
      const prescriptionRes = await fetch(`${base}/api/prescriptions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          profile_id: selectedProfile,
          medicine_id: medicineId,
          unit: unit.trim(),
          dosage: dosage.trim(),
          note: note.trim() || null,
          start_date: startDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
          end_date: endDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
        }),
      });

      let prescriptionJson = null;
      try {
        prescriptionJson = await prescriptionRes.json();
      } catch (_) {}

      if (!prescriptionRes.ok) {
        const msg =
          (prescriptionJson && prescriptionJson.message) ||
          "Không thể tạo đơn thuốc";
        throw new Error(msg);
      }

      Alert.alert("Thành công", "Đã thêm đơn thuốc mới", [
        {
          text: "OK",
          onPress: () => onBackHome(),
        },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // console.log("Medicine Name:", medicineName);
  // console.log("Medicine Desc:", medicineDesc);
  // console.log("Unit:", unit);
  // console.log("Dosage:", dosage);
  // console.log("Note:", note);
  // console.log("Start Date:", startDate);
  // console.log("End Date:", endDate);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + Back */}
          <View style={styles.headerRow}>
            <Text style={styles.h1}>Thêm đơn thuốc mới</Text>
            <TouchableOpacity onPress={onBackHome} activeOpacity={0.8}>
              <Text style={styles.linkBlue}>‹ Quay lại</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <Card>
              <Text style={{ color: COLORS.danger }}>{error}</Text>
            </Card>
          ) : null}

          <Card>
            <Text style={styles.label}>Chọn hồ sơ *</Text>
            <View style={styles.pickerRow}>
              {profiles.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.pickerBtn,
                    selectedProfile === profile.id && styles.pickerBtnActive,
                  ]}
                  onPress={() => setSelectedProfile(profile.id)}
                >
                  <Text
                    style={[
                      styles.pickerBtnText,
                      selectedProfile === profile.id &&
                        styles.pickerBtnTextActive,
                    ]}
                  >
                    {profile.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tên thuốc *</Text>
            <TextInput
              style={styles.input}
              value={medicineName}
              onChangeText={setMedicineName}
              placeholder="Ví dụ: Paracetamol 500mg"
            />

            <Text style={styles.label}>Mô tả thuốc (tùy chọn)</Text>
            <TextInput
              style={styles.input}
              value={medicineDesc}
              onChangeText={setMedicineDesc}
              placeholder="Ví dụ: Thuốc giảm đau, hạ sốt"
              multiline
            />

            <Text style={styles.label}>Đơn vị *</Text>
            <View style={styles.pickerRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.pickerBtn,
                    unit === u && styles.pickerBtnActive,
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text
                    style={[
                      styles.pickerBtnText,
                      unit === u && styles.pickerBtnTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Liều lượng *</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="Ví dụ: 1 viên, 500mg"
            />

            <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Ví dụ: Uống sau bữa ăn"
              multiline
            />

            <Text style={styles.label}>Ngày bắt đầu *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {startDate.toLocaleDateString("vi-VN")}
              </Text>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(Platform.OS === "ios");
                  if (selectedDate) {
                    setStartDate(selectedDate);
                  }
                }}
              />
            )}

            <Text style={styles.label}>Ngày kết thúc (tùy chọn)</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {endDate.toLocaleDateString("vi-VN")}
              </Text>
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(Platform.OS === "ios");
                  if (selectedDate) {
                    setEndDate(selectedDate);
                  }
                }}
              />
            )}

            <TouchableOpacity
              style={[
                styles.btnPrimary,
                loading && { backgroundColor: COLORS.line300 },
              ]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {loading ? "Đang lưu..." : "Lưu đơn thuốc"}
              </Text>
            </TouchableOpacity>
          </Card>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 0, gap: 14 },
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
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: COLORS.text900,
  },
  linkBlue: { color: COLORS.accent700, fontWeight: "600" },
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
  datePickerButton: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary100,
    borderWidth: 1,
    borderColor: COLORS.line300,
    marginBottom: 16,
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.text900,
    fontWeight: "600",
    textAlign: "center",
  },
  btnPrimary: {
    backgroundColor: COLORS.primary600,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
});
