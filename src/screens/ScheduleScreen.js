import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { getIntakeSchedule, updateIntakeStatus } from "../services/intakeService";
import { getProfiles } from "../services/profileService";

const ITEM_WIDTH = 60;

const safeArray = (v) => (Array.isArray(v) ? v : []);

const normalizeIntakeResponse = (res) => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const formatHHmm = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const t = String(iso).split("T")[1] || "";
    return t.substring(0, 5) || "--:--";
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const isSameDay = (a, b) => a?.toDateString?.() === b?.toDateString?.();

export default function ScheduleScreen({ navigation }) {
  const [selectedProfileId, setSelectedProfileId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalData, setModalData] = useState({
    medicationName: "",
    actualTime: "",
    actualDosage: "",
    note: "",
  });

  const flatListRef = useRef(null);
  const [calendarReady, setCalendarReady] = useState(false);

  const calendarDays = useMemo(() => {
    const days = [];
    const base = new Date();
    for (let i = -15; i <= 15; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const selectedIndex = useMemo(() => {
    const idx = calendarDays.findIndex((d) => isSameDay(d, selectedDate));
    return idx >= 0 ? idx : 15;
  }, [calendarDays, selectedDate]);

  useEffect(() => {
    const loadProfiles = async () => {
      setProfilesLoading(true);
      try {
        const data = await getProfiles();
        const list = safeArray(data);
        setProfiles(list);
      } catch (e) {
        console.log("loadProfiles error:", e?.message || e);
        setProfiles([]);
      } finally {
        setProfilesLoading(false);
      }
    };
    loadProfiles();
  }, []);

  useEffect(() => {
    if (!calendarReady) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    });
  }, [calendarReady, selectedIndex]);
  const formatDose = (dose) => {
  if (dose === null || dose === undefined || dose === "") return "--";

  const n = Number(dose);
  if (!Number.isFinite(n)) return "--";

  return n.toFixed(1);
};
  const loadData = useCallback(async () => {
    if (profilesLoading) return;
    if (!profiles || profiles.length === 0) {
      setMedications([]);
      return;
    }

    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const from = `${dateStr}T00:00:00Z`;
      const to = `${dateStr}T23:59:59Z`;

      const patientProfileIds = safeArray(profiles)
        .map((p) => p?.id)
        .filter(Boolean);

      const profileIdsToFetch =
        selectedProfileId === "all"
          ? patientProfileIds
          : [selectedProfileId].filter(Boolean);

      if (profileIdsToFetch.length === 0) {
        setMedications([]);
        return;
      }

      const responses = await Promise.all(
        profileIdsToFetch.map((pid) => getIntakeSchedule(pid, from, to))
      );

      const items = responses.flatMap(normalizeIntakeResponse);

      const sorted = [...items].sort((a, b) => {
        const ta = new Date(a?.scheduled_time || 0).getTime();
        const tb = new Date(b?.scheduled_time || 0).getTime();
        return ta - tb;
      });

      setMedications(sorted);
    } catch (error) {
      console.log("loadData error:", error?.message || error);
      setMedications([]);
    } finally {
      setLoading(false);
    }
  }, [profiles, profilesLoading, selectedProfileId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickStatus = async (eventId, status) => {
    try {
      await updateIntakeStatus(eventId, { status });
      let message = "Đã cập nhật trạng thái";
      if (status === "taken") message = "Đã ghi nhận uống thuốc.";
      if (status === "skipped") message = "Đã đánh dấu bỏ qua.";
      if (status === "delayed") message = "Đã hoãn lịch uống.";
      Alert.alert("Thành công", message);
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", error?.message || "Không thể cập nhật trạng thái.");
    }
  };

  const handleOpenModal = (item) => {
    setSelectedEvent(item);
    setModalData({
      medicationName: item?.regimen?.display_name || item?.display_name || "",
      actualTime: item?.taken_time ? formatHHmm(item.taken_time) : formatHHmm(item.scheduled_time),
      actualDosage: item?.dose_amount_taken || item?.regimen?.total_daily_dose || "",
      note: item?.notes || "",
    });
    setModalVisible(true);
  };

  const handleSaveModal = async () => {
    if (!selectedEvent) return;

    try {
      const payload = {
        status: selectedEvent.status === "unknown" ? "taken" : selectedEvent.status,
        notes: modalData.note,
      };

      if (modalData.actualTime && modalData.actualTime !== "--:--") {
        const [hh, mm] = modalData.actualTime.split(":");
        const takenDate = new Date(selectedEvent.scheduled_time);
        takenDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
        payload.taken_time = takenDate.toISOString();
      }

      if (modalData.actualDosage) {
        const dosageNum = parseFloat(modalData.actualDosage);
        if (!isNaN(dosageNum)) {
          payload.dose_amount_taken = dosageNum;
        }
      }

      await updateIntakeStatus(selectedEvent.id, payload);
      Alert.alert("Thành công", "Đã lưu thông tin tuân thủ.");
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", error?.message || "Không thể lưu thông tin.");
    }
  };

  const renderDateItem = ({ item }) => {
    const isSelected = isSameDay(item, selectedDate);
    const isToday = isSameDay(item, new Date());

    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(item)}
        style={[styles.dateItem, isSelected && styles.dateItemActive]}
        activeOpacity={0.85}
      >
        <Text style={[styles.dateDay, isSelected && styles.textWhite]}>
          {item.toLocaleDateString("en-US", { weekday: "short" })}
        </Text>
        <Text style={[styles.dateNumber, isSelected && styles.textWhite]}>
          {item.getDate()}
        </Text>
        {isToday && !isSelected && <View style={styles.todayDot} />}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedProfileId("all")}
            style={[styles.profileItem, selectedProfileId === "all" && styles.profileActive]}
            activeOpacity={0.85}
          >
            <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary600 }]}>
              <Ionicons name="people" size={24} color="white" />
            </View>
            <Text style={styles.profileLabel}>All</Text>
          </TouchableOpacity>

          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              onPress={() => setSelectedProfileId(profile.id)}
              style={[styles.profileItem, selectedProfileId === profile.id && styles.profileActive]}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: profile.sex === "female" ? "#EC4899" : "#3B82F6" },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {(profile.full_name || "P").charAt(0)}
                </Text>
              </View>
              <Text style={styles.profileLabel}>
                {(profile.full_name || "Profile").split(" ").pop()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.calendarWrapper}>
        <FlatList
          ref={flatListRef}
          data={calendarDays}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderDateItem}
          getItemLayout={(_, index) => ({
            length: ITEM_WIDTH,
            offset: ITEM_WIDTH * index,
            index,
          })}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          onContentSizeChange={() => setCalendarReady(true)}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }, 100);
          }}
        />
      </View>
    </View>
  );

  const renderMedItem = ({ item }) => {
    const medicationName = item?.regimen?.display_name || item?.display_name || "Thuốc";
    const totalDailyDose = item?.regimen?.total_daily_dose || "--";
    const doseUnit = item?.regimen?.dose_unit || "";

    const status = item?.status || "unknown";
    const isUnknown = status === "unknown" || status === "scheduled" || status === "pending";
    const isTaken = status === "taken";
    const isSkipped = status === "skipped";
    const isDelayed = status === "delayed";

    const profile = profiles.find((p) => p.id === item.profile_id);

    return (
      <View style={styles.medCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.medicationTitle}>
              <Ionicons name="medical" size={20} color={COLORS.primary600} />
              <Text style={styles.medName} numberOfLines={1}>
                {medicationName}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Ionicons name="person" size={14} color={COLORS.primary500} />
              <Text style={styles.profileTag}>
                {profile?.full_name || "Hồ sơ"}
              </Text>
            </View>
          </View>

          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary600} />
            <Text style={styles.medTime}>{formatHHmm(item.scheduled_time)}</Text>
          </View>
        </View>

        <View style={styles.doseContainer}>
          <Ionicons name="medical-outline" size={18} color="#64748B" />
          <Text style={styles.doseText}>
            Liều lượng: {formatDose(totalDailyDose)}/{doseUnit}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isTaken && styles.badgeTaken,
            isSkipped && styles.badgeSkipped,
            isDelayed && styles.badgeDelayed,
            isUnknown && styles.badgeUnknown,
          ]}
        >
          <Ionicons
            name={
              isTaken
                ? "checkmark-circle"
                : isSkipped
                ? "close-circle"
                : isDelayed
                ? "alert-circle"
                : "help-circle"
            }
            size={20}
            color={
              isTaken
                ? "#16A34A"
                : isSkipped
                ? "#EF4444"
                : isDelayed
                ? "#F97316"
                : "#EAB308"
            }
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isTaken
                  ? "#16A34A"
                  : isSkipped
                  ? "#EF4444"
                  : isDelayed
                  ? "#F97316"
                  : "#EAB308",
              },
            ]}
          >
            {isTaken
              ? "Đã hoàn uống"
              : isSkipped
              ? "Không uống"
              : isDelayed
              ? "Uống trễ"
              : "Chưa cập nhật"}
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, isTaken && styles.btnTakenActive]}
            onPress={() => handleQuickStatus(item.id, "taken")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={isTaken ? "white" : "#10B981"}
            />
            <Text style={[styles.actionBtnText, isTaken && styles.actionBtnTextActive]}>
              Đã uống
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isSkipped && styles.btnSkippedActive]}
            onPress={() => handleQuickStatus(item.id, "skipped")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={isSkipped ? "white" : "#EF4444"}
            />
            <Text style={[styles.actionBtnText, isSkipped && styles.actionBtnTextActive]}>
              Không uống
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isDelayed && styles.btnDelayedActive]}
            onPress={() => handleQuickStatus(item.id, "delayed")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="alert-circle"
              size={18}
              color={isDelayed ? "white" : "#F97316"}
            />
            <Text style={[styles.actionBtnText, isDelayed && styles.actionBtnTextActive]}>
              Uống trễ
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => handleOpenModal(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary600} />
          <Text style={styles.reportBtnText}>Báo cáo tuân thủ</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const showBusy = profilesLoading || loading;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}

      {showBusy ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={COLORS.primary600} />
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMedItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>Không có lịch uống thuốc trong ngày này.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thực tế</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Tên thuốc</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputDisabled]}
                  value={modalData.medicationName}
                  editable={false}
                  placeholder="Tên thuốc"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Thời gian uống/ trễ/ bỏ</Text>
                <TextInput
                  style={styles.modalInput}
                  value={modalData.actualTime}
                  onChangeText={(text) => setModalData({ ...modalData, actualTime: text })}
                  placeholder="HH:MM"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Số lượng thuốc</Text>
                <TextInput
                  style={styles.modalInput}
                  value={String(modalData.actualDosage)}
                  onChangeText={(text) => setModalData({ ...modalData, actualDosage: text })}
                  placeholder="1.5"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Ghi chú</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={modalData.note}
                  onChangeText={(text) => setModalData({ ...modalData, note: text })}
                  placeholder="Nhập ghi chú..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleSaveModal}>
                <Text style={styles.modalBtnPrimaryText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  headerContainer: {
    backgroundColor: "white",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
    paddingBottom: 15,
  },
  profileScroll: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 15 },
  profileItem: { alignItems: "center", marginRight: 20, opacity: 0.5 },
  profileActive: { opacity: 1 },
  avatarCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    elevation: 2,
  },
  avatarInitial: { color: "white", fontWeight: "bold", fontSize: 20 },
  profileLabel: { fontSize: 12, color: "#475569", fontWeight: "600" },
  calendarWrapper: { marginTop: 5 },
  dateItem: {
    alignItems: "center",
    justifyContent: "center",
    width: ITEM_WIDTH,
    height: 70,
    marginHorizontal: 5,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
  },
  dateItemActive: { backgroundColor: COLORS.primary600, elevation: 3 },
  dateDay: { fontSize: 12, color: "#64748B", textTransform: "uppercase" },
  dateNumber: { fontSize: 18, fontWeight: "bold", marginTop: 2, color: "#0F172A" },
  textWhite: { color: "white" },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary600,
    marginTop: 4,
  },
  listContent: { padding: 20 },
  medCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: { flex: 1, gap: 6 },
  medicationTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  medName: { fontSize: 20, fontWeight: "700", color: "#0F172A", flex: 1 },
  profileInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileTag: { fontSize: 14, color: COLORS.primary500, fontWeight: "500" },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  medTime: { fontSize: 16, fontWeight: "700", color: COLORS.primary600 },
  doseContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  doseText: { fontSize: 16, fontWeight: "700", color: "#475569" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeTaken: { backgroundColor: "#F0FDF4" },
  badgeSkipped: { backgroundColor: "#FEF2F2" },
  badgeDelayed: { backgroundColor: "#FFF7ED" },
  badgeUnknown: { backgroundColor: "#FEF9C3" },
  statusText: { fontSize: 14, fontWeight: "600" },
  actionContainer: { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
  },
  btnTakenActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  btnSkippedActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  btnDelayedActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  actionBtnTextActive: { color: "white" },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary100,
    backgroundColor: "white",
  },
  reportBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.primary600 },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { textAlign: "center", marginTop: 15, color: "#94A3B8", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  modalContent: { padding: 20 },
  modalField: { marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "white",
  },
  modalInputDisabled: { backgroundColor: "#F8FAFC", color: "#94A3B8" },
  modalTextArea: { height: 100, textAlignVertical: "top" },
  modalFooter: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  modalBtnSecondaryText: { fontSize: 16, fontWeight: "600", color: "#64748B" },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary600,
    alignItems: "center",
  },
  modalBtnPrimaryText: { fontSize: 16, fontWeight: "600", color: "white" },
});
