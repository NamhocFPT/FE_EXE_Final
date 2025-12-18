// src/screens/HomeScreen.js
import React, { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native"; // Cần import cái này để auto-reload
import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";
import Chip from "../components/Chip";

// --- IMPORT SERVICE ---
import { getProfiles } from "../services/profileService";
import { getPrescriptions } from "../services/prescriptionService";
import { getAllSchedules } from "../services/scheduleService";

/* --- LOCAL COMPONENTS --- */
const OutlineBtn = ({ label, color, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={[styles.outlineBtn, { borderColor: color }]}
  >
    <Text style={[styles.outlineBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

export default function HomeScreen({
  navigation, // Dùng navigation để chuyển trang
  activeProfile, // Nhận từ App.js (Global State)
  accessToken,   // Nhận từ App.js
  onGoProfiles, // Các hàm điều hướng từ App.js (giữ nguyên nếu muốn)
  onGoPrescriptions,
  onGoAddPrescription,
  onGoSchedule,
}) {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [reminders, setReminders] = useState([]);
  const [activeRx, setActiveRx] = useState([]);
  const [familyStats, setFamilyStats] = useState([]);
  const [progress, setProgress] = useState({ taken: 0, total: 0, missed: 0 });
  const [loading, setLoading] = useState(false);

  // --- HÀM TẢI DỮ LIỆU ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Gọi song song 3 API (Profile, Đơn thuốc, Lịch nhắc)
      const [profilesData, prescriptionsData, schedulesData] = await Promise.all([
        getProfiles(accessToken),
        getPrescriptions(accessToken),
        getAllSchedules(accessToken),
      ]);

      // --- XỬ LÝ DỮ LIỆU (MAPPING) ---

      // A. Xử lý Đơn thuốc đang dùng (Active Prescriptions)
      // Lọc thuốc của Active Profile và đang Active
      const myActiveRx = prescriptionsData.filter(p => {
        const isMyProfile = activeProfile ? p.tbl_profile?.id === activeProfile.id : true;
        return isMyProfile && p.is_active;
      }).map(p => ({
        id: p.id,
        brand: p.tbl_medicine?.name || "Thuốc",
        ingredient: p.tbl_medicine?.active_ingredient || "Hoạt chất",
        freq: p.note || "Theo chỉ định",
        daysLeft: calculateDaysLeft(p.end_date),
        hasAlert: false, // Logic cảnh báo sau này làm
      }));
      setActiveRx(myActiveRx);

      // B. Xử lý Lịch nhắc hôm nay (Today Reminders)
      // Lấy lịch của Active Profile
      const myReminders = schedulesData.filter(s => {
         // Cần tìm prescription tương ứng để check profile
         const relatedRx = prescriptionsData.find(p => p.id === s.prescription_id);
         const isMyProfile = activeProfile && relatedRx ? relatedRx.tbl_profile?.id === activeProfile.id : true;
         return isMyProfile; 
      }).map(s => {
        const relatedRx = prescriptionsData.find(p => p.id === s.prescription_id);
        return {
          id: s.id,
          scheduleId: s.id,
          time: s.reminder_time,
          title: relatedRx?.tbl_medicine?.name || "Thuốc",
          dose: `${s.quantity} ${relatedRx?.unit || 'liều'}`,
          extra: relatedRx?.note || "Uống đúng giờ",
          status: "pending" 
        };
      });
      // Sắp xếp theo giờ
      myReminders.sort((a, b) => a.time.localeCompare(b.time));
      setReminders(myReminders);

      // C. Xử lý Tổng quan gia đình (Family Overview)
      const stats = profilesData.map(p => {
        // Đếm số lịch nhắc của từng người
        const count = schedulesData.reduce((acc, s) => {
          const rx = prescriptionsData.find(rx => rx.id === s.prescription_id);
          return (rx && rx.tbl_profile?.id === p.id) ? acc + 1 : acc;
        }, 0);

        return {
          id: p.id,
          label: p.relationship === 'self' ? 'Tôi' : p.name,
          remindersLeft: count // Tạm tính tổng lịch, sau này tính active/pending
        };
      });
      setFamilyStats(stats);

      // D. Mock Progress (Vì chưa có API Log chi tiết hôm nay)
      setProgress({
        takenPct: 0.3, // Giả lập 30%
        total: myReminders.length,
        missed: 0
      });

    } catch (error) {
      console.error("Lỗi tải dữ liệu Home:", error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeProfile]);

  // --- AUTO RELOAD KHI VÀO MÀN HÌNH ---
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Helper tính ngày còn lại
  const calculateDaysLeft = (endDateStr) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = Math.abs(end - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
  };

  const handleMarkTaken = (id) => {
    // Logic giả lập đánh dấu đã uống
    // Sau này gọi API: adherenceService.logAction(...)
    const newReminders = reminders.filter(r => r.id !== id);
    setReminders(newReminders);
    
    // Update progress giả
    setProgress(prev => ({
      ...prev,
      takenPct: Math.min(1, prev.takenPct + (1/prev.total) || 0)
    }));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} />
      }
    >
      {/* WELCOME */}
      <Card style={{ backgroundColor: COLORS.primary100 }}>
        <Text style={styles.h1}>
          Xin chào, {activeProfile?.name || "Bạn"} <Text>👋</Text>
        </Text>
        <Text style={styles.body}>
          Bạn có <Text style={{ fontWeight: "600" }}>{reminders.length}</Text> lời
          nhắc hôm nay.
        </Text>

        <View style={styles.welcomeRow}>
          <Chip
            label={
              activeProfile?.relationship === "self"
                ? "Hồ sơ: Bản thân"
                : `Hồ sơ: ${activeProfile?.name || "Tôi"}`
            }
          />
          <TouchableOpacity onPress={onGoProfiles}>
            <Text style={styles.linkBlue}>Đổi hồ sơ</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* QUICK ACTIONS GRID */}
      <View style={styles.grid}>
        {[
          {
            label: "Đơn thuốc của tôi",
            icon: "👥",
            onPress: onGoPrescriptions,
          },
          { label: "Đơn thuốc mới", icon: "➕", onPress: onGoAddPrescription },
          { label: "Hồ sơ gia đình", icon: "👨‍👩‍👧", onPress: onGoProfiles },
          { label: "Kiểm tra an toàn", icon: "🛡️" },
          { label: "Nhắc nhở", icon: "⏰", onPress: onGoSchedule },
          { label: "Lịch sử & Thống kê", icon: "📈" },
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.gridItem}
            onPress={item.onPress}
          >
            <Text style={styles.gridIcon}>{item.icon}</Text>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TODAY */}
      <Text style={styles.sectionTitle}>Hôm nay</Text>
      {loading && reminders.length === 0 ? (
        <Card>
          <Text style={styles.body}>Đang tải lịch nhắc...</Text>
        </Card>
      ) : reminders.length === 0 ? (
        <Card>
          <Text style={styles.body}>Không có lịch nhắc nào hôm nay.</Text>
          <TouchableOpacity onPress={onGoSchedule} style={{ marginTop: 8 }}>
            <Text style={styles.linkBlue}>Thêm lịch nhắc →</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {reminders.map((r) => (
            <Card key={r.id}>
              <View style={styles.reminderRow}>
                <Chip label={r.time} />
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={styles.rxTitle}>
                    {r.title}{" "}
                    <Text style={{ fontWeight: "600" }}>{r.dose}</Text>
                  </Text>
                  <Text style={styles.caption}>{r.extra}</Text>
                </View>
              </View>

              <View style={styles.reminderActions}>
                <OutlineBtn
                  label="Đã uống"
                  color={COLORS.success}
                  onPress={() => handleMarkTaken(r.id)}
                />
                <OutlineBtn
                  label="Bỏ qua"
                  color={COLORS.danger}
                  onPress={() => handleMarkTaken(r.id)} // Tạm thời xóa khỏi list
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ACTIVE PRESCRIPTIONS */}
      <Text style={styles.sectionTitle}>Đơn thuốc đang dùng</Text>
      {activeRx.length === 0 ? (
          <Text style={[styles.caption, {marginLeft: 4}]}>Chưa có đơn thuốc đang dùng.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 2 }}
        >
          {activeRx.map((rx) => (
            <Card key={rx.id} style={styles.rxCard}>
              <View style={styles.rxHeaderRow}>
                <Text style={styles.rxBrand}>{rx.brand}</Text>
                {rx.hasAlert ? (
                  <Chip
                    label="Cảnh báo"
                    color={COLORS.info}
                    bg="#E8F2FF"
                  />
                ) : null}
              </View>
              <Text style={styles.caption} numberOfLines={1}>{rx.ingredient}</Text>
              <Text style={styles.caption} numberOfLines={1}>{rx.freq}</Text>
              <View style={styles.rxFooterRow}>
                <Text style={styles.caption}>Còn {rx.daysLeft} ngày</Text>
                <TouchableOpacity onPress={onGoPrescriptions}>
                  <Text style={styles.linkBlue}>Chi tiết</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {/* SAFETY BANNER */}
      <Card style={{ backgroundColor: COLORS.primary100, marginTop: 12 }}>
        <Text style={styles.safetyStrong}>
          Mẹo sức khỏe: Đừng quên cập nhật hồ sơ nếu bạn có dị ứng thuốc mới nhé!
        </Text>
      </Card>

      {/* FAMILY OVERVIEW */}
      <Text style={styles.sectionTitle}>Tổng quan gia đình</Text>
      <Card>
        <View style={styles.familyRow}>
          {familyStats.map((f) => (
            <View key={f.id} style={styles.familyItem}>
              <View style={styles.avatarLg}>
                 <Text style={{fontSize: 20, color: 'white', fontWeight: 'bold'}}>
                    {f.label.charAt(0).toUpperCase()}
                 </Text>
              </View>
              <Text style={styles.bodySm}>{f.label}</Text>
              {f.remindersLeft > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{f.remindersLeft}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* WEEK PROGRESS */}
      <Text style={styles.sectionTitle}>Tiến độ tuần này</Text>
      <Card>
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiMain}>
              {Math.round(progress.takenPct * 100)}%
            </Text>
            <Text style={styles.caption}>Đúng giờ</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiMain}>{progress.missed}</Text>
            <Text style={styles.caption}>Bỏ lỡ</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiMain}>{progress.total}</Text>
            <Text style={styles.caption}>Tổng nhắc</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress.takenPct * 100}%` },
            ]}
          />
        </View>
      </Card>

      <View style={{ height: 84 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 0, gap: 14 },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: COLORS.text900,
  },
  body: { fontSize: 16, lineHeight: 22, color: COLORS.text900 },
  bodySm: { fontSize: 14, color: COLORS.text900 },
  caption: { fontSize: 12, color: COLORS.text600 },
  linkBlue: { color: COLORS.accent700, fontWeight: "600" },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: COLORS.text900,
  },
  welcomeRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  gridItem: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  gridIcon: { fontSize: 20, marginBottom: 8 },
  gridLabel: { textAlign: "center", color: COLORS.text900 },
  reminderRow: { flexDirection: "row", alignItems: "flex-start" },
  rxTitle: { fontSize: 16, color: COLORS.text900 },
  reminderActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    columnGap: 8,
  },
  outlineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderRadius: 10,
  },
  outlineBtnText: { fontSize: 12, fontWeight: "700" },
  rxCard: { width: 220, marginRight: 12, padding: 12 },
  rxHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rxBrand: { fontSize: 16, fontWeight: "600", color: COLORS.text900, flex: 1 },
  rxFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  safetyStrong: { fontSize: 14, lineHeight: 20, color: COLORS.text900 },
  familyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  familyItem: { alignItems: "center" },
  avatarLg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent700,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: COLORS.primary600,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTxt: { fontSize: 10, color: COLORS.white, fontWeight: "700" },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  kpiItem: { alignItems: "center", flex: 1 },
  kpiMain: { fontSize: 22, fontWeight: "700", color: COLORS.text900 },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.line300,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: COLORS.primary600,
    borderRadius: 6,
  },
});