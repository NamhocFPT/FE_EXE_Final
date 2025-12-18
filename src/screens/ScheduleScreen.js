// src/screens/ScheduleScreen.js
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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS, RADIUS } from "../constants/theme"; 

// --- SỬA 1: Import đủ bộ Service ---
import { 
  getSchedulesByPrescription, // Lấy lịch
  createSchedule, 
  updateSchedule,
  deleteSchedule              // Xóa lịch
} from "../services/scheduleService";

import { getPrescriptions } from "../services/prescriptionService"; // Lấy đơn thuốc

import { 
  ensureNotificationReady, 
  scheduleMedNotification 
} from "../services/notifications"; 

const REPEAT_INTERVALS = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "custom", label: "Tùy chỉnh" },
];

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export default function ScheduleScreen({ onBackHome, accessToken }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Form fields
  const [quantity, setQuantity] = useState("");
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState("daily");
  const [repeatEvery, setRepeatEvery] = useState("1");

  // --- SỬA 2: Dùng Service để lấy đơn thuốc ---
  const fetchPrescriptionsData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const items = await getPrescriptions(accessToken);
      
      // Chỉ lấy prescription đang active
      const activeItems = items.filter((p) => p.is_active || p.isActive); 
      setPrescriptions(activeItems);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // --- SỬA 3: Dùng Service để lấy lịch nhắc ---
  const fetchSchedulesData = useCallback(async () => {
    if (!selectedPrescription) return;
    try {
      // Gọi Service (Mock Data sẽ trả về ngay)
      const items = await getSchedulesByPrescription(accessToken, selectedPrescription);
      setSchedules(items);
    } catch (err) {
      console.error(err);
    }
  }, [accessToken, selectedPrescription]);

  useEffect(() => {
    fetchPrescriptionsData();
  }, [fetchPrescriptionsData]);

  useEffect(() => {
    if (selectedPrescription) {
      fetchSchedulesData();
    }
  }, [fetchSchedulesData, selectedPrescription]);

  const resetForm = () => {
    setQuantity("");
    setReminderTime(new Date());
    setRepeatInterval("daily");
    setRepeatEvery("1");
    setEditingSchedule(null);
  };

  const handleAdd = () => {
    if (!selectedPrescription) {
      Alert.alert("Lỗi", "Vui lòng chọn đơn thuốc trước");
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setQuantity(String(schedule.quantity || ""));

    // Parse time string (HH:MM) to Date object
    const timeStr = schedule.reminder_time || "08:00";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours || 0);
    timeDate.setMinutes(minutes || 0);
    setReminderTime(timeDate);

    setRepeatInterval(schedule.repeat_interval || "daily");
    setRepeatEvery(String(schedule.repeat_every || "1"));
    setShowModal(true);
  };

  const handleSave = async () => {
    // 1. Validate dữ liệu
    if (!quantity.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số lượng");
      return;
    }

    try {
      // 2. Chuẩn bị dữ liệu gửi đi
      const timeString = reminderTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const body = {
        prescription_id: selectedPrescription,
        quantity: parseFloat(quantity),
        reminder_time: timeString,
        repeat_interval: repeatInterval,
        repeat_every: parseInt(repeatEvery) || 1,
      };

      // 3. GỌI API (Dùng Service)
      if (editingSchedule) {
        await updateSchedule(accessToken, editingSchedule.id, body);
      } else {
        await createSchedule(accessToken, body);
      }

      // 4. XỬ LÝ THÔNG BÁO (Notification)
      try {
        const hasPermission = await ensureNotificationReady();
        if (hasPermission) {
          const selectedRx = prescriptions.find(p => p.id === selectedPrescription);
          const medicineName = selectedRx?.tbl_medicine?.name || selectedRx?.Medicine?.name || "Thuốc";
          const unit = selectedRx?.unit || "liều";
          const notifRepeat = repeatInterval === "daily" ? "daily" : "none";

          await scheduleMedNotification({
            title: "Đến giờ uống thuốc 💊",
            body: `Uống ${quantity} ${unit} ${medicineName}`,
            hour: reminderTime.getHours(),
            minute: reminderTime.getMinutes(),
            repeat: notifRepeat,
          });
        }
      } catch (notifErr) {
        console.warn("Lỗi đặt thông báo:", notifErr);
      }

      // 5. Dọn dẹp & Thông báo thành công
      setShowModal(false);
      resetForm();
      fetchSchedulesData(); // Load lại list
      Alert.alert(
        "Thành công",
        editingSchedule ? "Đã cập nhật lịch nhắc" : "Đã tạo lịch nhắc mới"
      );

    } catch (err) {
      Alert.alert("Lỗi", err.message || "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (scheduleId) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa lịch nhắc này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            // --- SỬA 4: Dùng Service Delete ---
            await deleteSchedule(accessToken, scheduleId);

            fetchSchedulesData();
            Alert.alert("Thành công", "Đã xóa lịch nhắc");
          } catch (err) {
            Alert.alert("Lỗi", String(err.message || err));
          }
        },
      },
    ]);
  };

  const getPrescriptionLabel = (prescription) => {
    const medicineName =
      prescription.tbl_medicine?.name ||
      prescription.Medicine?.name ||
      prescription.medicine?.name || // Thêm check này cho chắc
      "Không rõ thuốc";
    const profileName =
      prescription.tbl_profile?.name ||
      prescription.Profile?.name ||
      prescription.profile?.name ||
      "Không rõ người";
    return `${medicineName} - ${profileName}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + Back */}
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Lịch nhắc uống thuốc</Text>
          <TouchableOpacity onPress={onBackHome} activeOpacity={0.8}>
            <Text style={styles.linkBlue}>‹ Quay lại</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Card>
            <Text style={{ color: COLORS.danger }}>{error}</Text>
          </Card>
        ) : null}

        {/* Select Prescription */}
        <Card>
          <Text style={styles.label}>Chọn đơn thuốc</Text>
          {loading ? (
            <Text style={styles.caption}>Đang tải...</Text>
          ) : prescriptions.length === 0 ? (
            <Text style={styles.caption}>
              Chưa có đơn thuốc nào. Vui lòng thêm đơn thuốc trước.
            </Text>
          ) : (
            <View style={styles.pickerColumn}>
              {prescriptions.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.prescriptionBtn,
                    selectedPrescription === p.id &&
                      styles.prescriptionBtnActive,
                  ]}
                  onPress={() => setSelectedPrescription(p.id)}
                >
                  <Text
                    style={[
                      styles.prescriptionBtnText,
                      selectedPrescription === p.id &&
                        styles.prescriptionBtnTextActive,
                    ]}
                  >
                    {getPrescriptionLabel(p)}
                  </Text>
                  <Text
                    style={[
                      styles.caption,
                      selectedPrescription === p.id && { color: COLORS.white },
                    ]}
                  >
                    {p.dosage} • {p.unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedPrescription ? (
            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 12 }]}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>＋ Thêm lịch nhắc mới</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        {/* List Schedules */}
        {selectedPrescription && schedules.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Các lịch nhắc đã đặt</Text>
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <View style={styles.scheduleRow}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeText}>
                      {schedule.reminder_time}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.scheduleInfo}>
                      Số lượng: {schedule.quantity}
                    </Text>
                    <Text style={styles.caption}>
                      {
                        REPEAT_INTERVALS.find(
                          (r) => r.value === schedule.repeat_interval
                        )?.label
                      }{" "}
                      (mỗi {schedule.repeat_every}{" "}
                      {schedule.repeat_interval === "daily"
                        ? "ngày"
                        : schedule.repeat_interval === "weekly"
                        ? "tuần"
                        : "tháng"}
                      )
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={styles.btnIcon}
                      onPress={() => handleEdit(schedule)}
                    >
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnIcon}
                      onPress={() => handleDelete(schedule.id)}
                    >
                      <Text>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : selectedPrescription && schedules.length === 0 ? (
          <Card>
            <Text style={styles.caption}>
              Chưa có lịch nhắc nào. Nhấn nút "Thêm lịch nhắc mới" để tạo.
            </Text>
          </Card>
        ) : null}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal Add/Edit */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>
                {editingSchedule ? "Sửa lịch nhắc" : "Thêm lịch nhắc mới"}
              </Text>

              <Text style={styles.label}>Số lượng (viên/gói/liều...) *</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Ví dụ: 1"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Giờ nhắc *</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {reminderTime.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(Platform.OS === "ios");
                    if (selectedTime) {
                      setReminderTime(selectedTime);
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Chu kỳ lặp *</Text>
              <View style={styles.pickerRow}>
                {REPEAT_INTERVALS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.pickerBtn,
                      repeatInterval === r.value && styles.pickerBtnActive,
                    ]}
                    onPress={() => setRepeatInterval(r.value)}
                  >
                    <Text
                      style={[
                        styles.pickerBtnText,
                        repeatInterval === r.value &&
                          styles.pickerBtnTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>
                Lặp lại mỗi (số{" "}
                {repeatInterval === "daily"
                  ? "ngày"
                  : repeatInterval === "weekly"
                  ? "tuần"
                  : "tháng"}
                ) *
              </Text>
              <TextInput
                style={styles.input}
                value={repeatEvery}
                onChangeText={setRepeatEvery}
                placeholder="1"
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.btnModal, { backgroundColor: COLORS.line300 }]}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Text
                    style={[styles.btnModalText, { color: COLORS.text900 }]}
                  >
                    Hủy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.btnModal,
                    { backgroundColor: COLORS.primary600 },
                  ]}
                  onPress={handleSave}
                >
                  <Text style={[styles.btnModalText, { color: COLORS.white }]}>
                    Lưu
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
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
  caption: { fontSize: 12, color: COLORS.text600 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text900,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text900,
    marginTop: 12,
    marginBottom: 6,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary600,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  pickerColumn: {
    gap: 8,
  },
  prescriptionBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.line300,
  },
  prescriptionBtnActive: {
    backgroundColor: COLORS.primary600,
  },
  prescriptionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text900,
  },
  prescriptionBtnTextActive: {
    color: COLORS.white,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: COLORS.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary600,
  },
  scheduleInfo: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text900,
  },
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
  timePickerButton: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary100,
    borderWidth: 1,
    borderColor: COLORS.line300,
    marginBottom: 16,
  },
  timePickerText: {
    fontSize: 16,
    color: COLORS.text900,
    fontWeight: "600",
    textAlign: "center",
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