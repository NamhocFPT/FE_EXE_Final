// src/screens/HomeScreen.js
import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";
import Chip from "../components/Chip";

/* --- MOCK DATA --- */
const MOCK_ACTIVE_RX = [
  {
    id: "rx1",
    brand: "Panadol",
    ingredient: "Paracetamol 500 mg",
    freq: "2 lần/ngày • uống",
    daysLeft: 12,
    hasAlert: true,
  },
  {
    id: "rx2",
    brand: "Amoxil",
    ingredient: "Amoxicillin 500 mg",
    freq: "3 lần/ngày • uống",
    daysLeft: 5,
    hasAlert: false,
  },
];

const MOCK_FAMILY = [
  { id: "me", label: "Tôi", remindersLeft: 2 },
  { id: "mom", label: "Mẹ", remindersLeft: 0 },
  { id: "dad", label: "Bố", remindersLeft: 1 },
];

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
  todayReminders,
  loadingReminders,
  progress,
  onGoPrescriptions,
  onGoProfiles,
  onGoAddPrescription,
  onGoSchedule,
  activeProfile,
  onRefreshReminders,
}) {
  const remindersCount = todayReminders ? todayReminders.length : 0;

  // Placeholder function cho nút "Đã uống"
  const handleMarkTaken = (id) => {
    console.log("Đánh dấu đã uống:", id);
    if (onRefreshReminders) onRefreshReminders();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* WELCOME */}
      <Card style={{ backgroundColor: COLORS.primary100 }}>
        <Text style={styles.h1}>
          Xin chào, {activeProfile?.name || "Bạn"} <Text>👋</Text>
        </Text>
        <Text style={styles.body}>
          Bạn có <Text style={{ fontWeight: "600" }}>{remindersCount}</Text> lời
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
      {loadingReminders ? (
        <Card>
          <Text style={styles.body}>Đang tải lịch nhắc...</Text>
        </Card>
      ) : todayReminders.length === 0 ? (
        <Card>
          <Text style={styles.body}>Không có lịch nhắc nào hôm nay.</Text>
          <TouchableOpacity onPress={onGoSchedule} style={{ marginTop: 8 }}>
            <Text style={styles.linkBlue}>Thêm lịch nhắc →</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {todayReminders.map((r) => (
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
                  onPress={() => handleMarkTaken(r.scheduleId)}
                />
                <OutlineBtn
                  label="Bỏ qua"
                  color={COLORS.danger}
                  onPress={() => {}}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ACTIVE PRESCRIPTIONS */}
      <Text style={styles.sectionTitle}>Đơn thuốc đang dùng</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 2 }}
      >
        {MOCK_ACTIVE_RX.map((rx) => (
          <Card key={rx.id} style={styles.rxCard}>
            <View style={styles.rxHeaderRow}>
              <Text style={styles.rxBrand}>{rx.brand}</Text>
              {rx.hasAlert ? (
                <Chip
                  label="Kiểm tra cảnh báo"
                  color={COLORS.info}
                  bg="#E8F2FF"
                />
              ) : null}
            </View>
            <Text style={styles.caption}>{rx.ingredient}</Text>
            <Text style={styles.caption}>{rx.freq}</Text>
            <View style={styles.rxFooterRow}>
              <Text style={styles.caption}>Số ngày còn lại: {rx.daysLeft}</Text>
              <TouchableOpacity>
                <Text style={styles.linkBlue}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* SAFETY BANNER */}
      <Card style={{ backgroundColor: COLORS.primary100 }}>
        <Text style={styles.safetyStrong}>
          Có thể trùng thành phần: Paracetamol xuất hiện trong 2 loại thuốc. Vui
          lòng kiểm tra để đảm bảo an toàn.
        </Text>
        <TouchableOpacity style={{ marginTop: 8 }}>
          <Text style={styles.linkBlue}>Xem chi tiết</Text>
        </TouchableOpacity>
      </Card>

      {/* FAMILY OVERVIEW */}
      <Text style={styles.sectionTitle}>Tổng quan gia đình</Text>
      <Card>
        <View style={styles.familyRow}>
          {MOCK_FAMILY.map((f) => (
            <View key={f.id} style={styles.familyItem}>
              <View style={styles.avatarLg} />
              <Text style={styles.bodySm}>{f.label}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{f.remindersLeft}</Text>
              </View>
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
            <Text style={styles.caption}>Tổng nhắc nhở</Text>
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
  rxCard: { width: 260, marginRight: 12 },
  rxHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rxBrand: { fontSize: 16, fontWeight: "600", color: COLORS.text900 },
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