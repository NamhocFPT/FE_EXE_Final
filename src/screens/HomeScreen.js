// src/screens/HomeScreen.js
import React, { useState, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from "react-native";
import { useFocusEffect } from "@react-navigation/native"; 
import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";
import Chip from "../components/Chip";

// --- IMPORT SERVICE ---
import { getProfiles } from "../services/profileService";
import { getPrescriptions, getMedicationRegimens } from "../services/prescriptionService";
import { getDailySchedules, updateScheduleStatus } from "../services/scheduleService";
import { getMyProfile } from "../services/authService"; // <--- MỚI: Lấy thông tin tài khoản chính

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
  navigation,
  activeProfile, // Nhận từ App.js (Global State)
  accessToken,   
  onGoProfiles, 
  onGoPrescriptions,
  onGoAddPrescription,
  onGoSchedule,
}) {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [reminders, setReminders] = useState([]);
  const [activeRx, setActiveRx] = useState([]); 
  const [familyStats, setFamilyStats] = useState([]);
  const [progress, setProgress] = useState({ taken: 0, total: 0, missed: 0 });
  
  // State User Account (Để hiển thị Xin chào chính xác)
  const [userAccount, setUserAccount] = useState(null); 
  
  const [loading, setLoading] = useState(false);

  // --- HÀM TẢI DỮ LIỆU ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const profileId = activeProfile?.id;

      // 1. Gọi song song các API
      const [profilesData, regimensData, schedulesData, accountData] = await Promise.all([
        getProfiles(), 
        profileId ? getMedicationRegimens(profileId) : [],
        profileId ? getDailySchedules(today, profileId) : [],
        getMyProfile() // <--- MỚI: Gọi API lấy thông tin Account
      ]);

      // Lưu thông tin account để hiển thị tên
      setUserAccount(accountData);

      // --- XỬ LÝ DỮ LIỆU (MAPPING UI) ---

      // A. Xử lý "Đơn thuốc đang dùng"
      const myActiveRx = (regimensData || []).map(r => ({
        id: r.id,
        brand: r.medication_name || "Thuốc",
        ingredient: r.medication_name,
        freq: r.frequency_type === 'daily' ? 'Hàng ngày' : r.frequency_type,
        daysLeft: 7, 
        hasAlert: false, 
      }));
      setActiveRx(myActiveRx);

      // B. Xử lý "Hôm nay"
      const myReminders = (schedulesData || []).map(s => {
        const timeObj = new Date(s.scheduled_time);
        const timeStr = timeObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        return {
          id: s.id,
          time: timeStr,
          title: s.medication_name || "Thuốc",
          dose: "1 liều",
          extra: s.status === 'taken' ? 'Đã uống' : (s.status === 'skipped' ? 'Đã bỏ qua' : 'Chưa uống'),
          status: s.status || 'pending'
        };
      });
      
      myReminders.sort((a, b) => a.time.localeCompare(b.time));
      setReminders(myReminders);

      // C. Progress KPI
      const total = myReminders.length;
      const taken = myReminders.filter(r => r.status === 'taken').length;
      const missed = myReminders.filter(r => r.status === 'skipped').length;
      
      setProgress({
        takenPct: total > 0 ? taken / total : 0,
        total: total,
        missed: missed
      });

      // D. Tổng quan gia đình
      const stats = (profilesData || []).map(p => ({
         id: p.id,
         label: p.relationship_to_owner === 'self' ? 'Tôi' : p.full_name,
         remindersLeft: 0 
      }));
      setFamilyStats(stats);

    } catch (error) {
      console.error("Lỗi tải dữ liệu Home:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  // --- AUTO RELOAD ---
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // --- XỬ LÝ CHECK-IN ---
  const handleMarkTaken = async (id, status) => {
    const oldReminders = [...reminders];
    const newReminders = reminders.map(r => 
        r.id === id ? { ...r, status: status, extra: status === 'taken' ? 'Đã uống' : 'Đã bỏ qua' } : r
    );
    setReminders(newReminders);

    try {
        await updateScheduleStatus(id, status);
        const total = newReminders.length;
        const taken = newReminders.filter(r => r.status === 'taken').length;
        setProgress(prev => ({ ...prev, takenPct: taken/total }));
    } catch (error) {
        console.error("Lỗi update status:", error);
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái thuốc");
        setReminders(oldReminders);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} />
      }
    >
      {/* WELCOME CARD */}
      <Card style={{ backgroundColor: COLORS.primary100 }}>
        <Text style={styles.h1}>
          {/* Ưu tiên hiển thị userAccount.full_name */}
          Xin chào, {userAccount?.full_name || activeProfile?.name || "Bạn"} <Text>👋</Text>
        </Text>
        <Text style={styles.body}>
          Bạn có <Text style={{ fontWeight: "600" }}>{reminders.filter(r => r.status === 'pending').length}</Text> lời
          nhắc cần uống hôm nay.
        </Text>

        <View style={styles.welcomeRow}>
          <Chip
            label={
              activeProfile?.relationship_to_owner === "self" || activeProfile?.relationship === "self"
                ? "Hồ sơ: Bản thân"
                : `Hồ sơ: ${activeProfile?.full_name || activeProfile?.name || "Tôi"}`
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
          <TouchableOpacity onPress={onGoAddPrescription} style={{ marginTop: 8 }}>
            <Text style={styles.linkBlue}>+ Thêm thuốc ngay</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {reminders.map((r) => (
            <Card key={r.id} style={r.status !== 'pending' ? {opacity: 0.6} : {}}>
              <View style={styles.reminderRow}>
                <Chip label={r.time} color={r.status === 'taken' ? COLORS.success : COLORS.primary600} />
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[styles.rxTitle, r.status === 'taken' && {textDecorationLine: 'line-through', color: COLORS.text600}]}>
                    {r.title}{" "}
                    <Text style={{ fontWeight: "600" }}>{r.dose}</Text>
                  </Text>
                  <Text style={styles.caption}>{r.extra}</Text>
                </View>
              </View>

              {r.status === 'pending' && (
                  <View style={styles.reminderActions}>
                    <OutlineBtn
                      label="Đã uống"
                      color={COLORS.success}
                      onPress={() => handleMarkTaken(r.id, 'taken')}
                    />
                    <OutlineBtn
                      label="Bỏ qua"
                      color={COLORS.danger}
                      onPress={() => handleMarkTaken(r.id, 'skipped')}
                    />
                  </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* ACTIVE PRESCRIPTIONS */}
      <Text style={styles.sectionTitle}>Thuốc đang dùng</Text>
      {activeRx.length === 0 ? (
          <Text style={[styles.caption, {marginLeft: 4, marginBottom: 10}]}>Chưa có đơn thuốc nào.</Text>
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

      {/* WEEK PROGRESS */}
      <Text style={styles.sectionTitle}>Tiến độ</Text>
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

// --- STYLES (GIỮ NGUYÊN) ---
const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 0, gap: 14 },
  h1: { fontSize: 24, lineHeight: 32, fontWeight: "600", color: COLORS.text900 },
  body: { fontSize: 16, lineHeight: 22, color: COLORS.text900 },
  bodySm: { fontSize: 14, color: COLORS.text900 },
  caption: { fontSize: 12, color: COLORS.text600 },
  linkBlue: { color: COLORS.accent700, fontWeight: "600" },
  sectionTitle: { marginTop: 8, marginBottom: 6, fontSize: 20, lineHeight: 28, fontWeight: "600", color: COLORS.text900 },
  welcomeRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  gridItem: { width: "48%", backgroundColor: COLORS.white, borderRadius: RADIUS.card, paddingVertical: 18, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  gridIcon: { fontSize: 20, marginBottom: 8 },
  gridLabel: { textAlign: "center", color: COLORS.text900 },
  reminderRow: { flexDirection: "row", alignItems: "flex-start" },
  rxTitle: { fontSize: 16, color: COLORS.text900 },
  reminderActions: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end", columnGap: 8 },
  outlineBtn: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.2, borderRadius: 10 },
  outlineBtnText: { fontSize: 12, fontWeight: "700" },
  rxCard: { width: 220, marginRight: 12, padding: 12 },
  rxHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  rxBrand: { fontSize: 16, fontWeight: "600", color: COLORS.text900, flex: 1 },
  rxFooterRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  safetyStrong: { fontSize: 14, lineHeight: 20, color: COLORS.text900 },
  familyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  familyItem: { alignItems: "center" },
  avatarLg: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent700, marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
  badge: { position: "absolute", top: -4, right: -6, backgroundColor: COLORS.primary600, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, color: COLORS.white, fontWeight: "700" },
  kpiRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  kpiItem: { alignItems: "center", flex: 1 },
  kpiMain: { fontSize: 22, fontWeight: "700", color: COLORS.text900 },
  progressTrack: { height: 8, backgroundColor: COLORS.line300, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: COLORS.primary600, borderRadius: 6 },
});