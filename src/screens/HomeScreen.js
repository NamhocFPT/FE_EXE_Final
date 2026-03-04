// src/screens/HomeScreen.js
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";
import Chip from "../components/Chip";
import { Ionicons } from "@expo/vector-icons";

// --- IMPORT SERVICE ---
import { getProfiles } from "../services/profileService";
import { getTodayIntakeEvents, updateIntakeStatus } from "../services/intakeService";
import { getMyProfile } from "../services/authService"; // <--- MỚI: Lấy thông tin tài khoản chính
import { getInUseRegimens } from "../services/regimenService";
import { getMedicationWarnings } from "../services/medicationWarningService"; // ✅ NEW: safety hint

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
  updateActiveProfile, // Bổ sung để chọn profile trực tiếp
}) {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [reminders, setReminders] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({}); // <--- MỚI: State lưu trạng thái mở rộng của từng nhóm thuốc
  const [activeRx, setActiveRx] = useState([]);
  const [availableProfiles, setAvailableProfiles] = useState([]); // <--- Thêm list profiles
  const [familyStats, setFamilyStats] = useState([]);
  const [progress, setProgress] = useState({ taken: 0, total: 0, missed: 0, takenPct: 0 });
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  // State User Account (Để hiển thị Xin chào chính xác)
  const [userAccount, setUserAccount] = useState(null);

  const [loading, setLoading] = useState(false);

  // ✅ Safety hint (hiện 5s đầu nếu duplicates/interactions đều rỗng)
  const [showSafetyHint, setShowSafetyHint] = useState(false);
  const [safetyHintText, setSafetyHintText] = useState("");
  // const safetyHintTimerRef = useRef(null);
  // const didFirstProfileFetchRef = useRef(false);

  // useEffect(() => {
  //   return () => {
  //     if (safetyHintTimerRef.current) clearTimeout(safetyHintTimerRef.current);
  //   };
  // }, []);

  const toggleExpand = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- HÀM TẢI DỮ LIỆU ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Lấy account + profiles trước
      const [accountData, profilesData] = await Promise.all([
        getMyProfile(),
        getProfiles(),
      ]);

      setUserAccount(accountData);

      const profiles = Array.isArray(profilesData) ? profilesData : [];
      setAvailableProfiles(profiles); // Lưu lại để render selector
      const ids = profiles.map(p => p.id);

      // 2) Chọn profileId hợp lệ:
      // - Ưu tiên activeProfile.id nếu nó tồn tại trong profilesData
      // - Nếu không, fallback về profile đầu tiên
      const candidateId = activeProfile?.id;
      const effectiveProfileId = ids.includes(candidateId) ? candidateId : ids[0];

      // Đồng bộ lại UI nếu candidate (dữ liệu rỗng) khác effective (đầu tiên)
      if (effectiveProfileId !== candidateId && effectiveProfileId) {
        const pObj = profiles.find(p => p.id === effectiveProfileId);
        if (pObj && updateActiveProfile) {
          updateActiveProfile({ id: pObj.id, name: pObj.full_name || pObj.name, relationship: pObj.relationship_to_owner });
        }
      }

      // Không có profile nào -> không gọi API phụ thuộc profileId
      if (!effectiveProfileId) {
        setActiveRx([]);
        setReminders([]);
        setProgress({ takenPct: 0, total: 0, missed: 0, taken: 0 });
        setFamilyStats([]);
        setShowSafetyHint(false);
        setSafetyHintText("");
        return;
      }

      // 3) Gọi các API phụ thuộc profileId
      const [regimensRes, schedulesRes, warningsRes] = await Promise.all([
        getInUseRegimens(effectiveProfileId),
        getTodayIntakeEvents(effectiveProfileId),
        getMedicationWarnings(effectiveProfileId), // ✅ NEW
      ]);

      const regimensData = regimensRes || [];
      const schedulesData = schedulesRes || [];

      // ✅ Safety hint logic
      const warnings = warningsRes?.data ?? warningsRes;
      const duplicates = Array.isArray(warnings?.duplicates) ? warnings.duplicates : [];
      const interactions = Array.isArray(warnings?.interactions) ? warnings.interactions : [];


      if (duplicates.length > 0 || interactions.length > 0) {

        let messages = [];

        // ✅ HIỆN TÊN HOẠT CHẤT TRÙNG
        if (duplicates.length > 0) {
          duplicates.forEach(d => {
            const name = d?.substance?.name || "Không rõ";
            const count = d?.count || 2;
            messages.push(` Cảnh báo sử dụng trùng hợp chất ${name} (${count} lần)`);
          });
        }

        // ✅ HIỆN TÊN CÁC CHẤT TƯƠNG TÁC
        if (interactions.length > 0) {
          interactions.forEach(i => {
            const a = i?.substance_a?.name || i?.left?.name || "Chất A";
            const b = i?.substance_b?.name || i?.right?.name || "Chất B";
            messages.push(`hợp chất ${a} có tương tác với hợp chất ${b}`);
          });
        }

        setSafetyHintText(messages.join("\n"));
        setShowSafetyHint(true);

      } else {
        setShowSafetyHint(false);
        setSafetyHintText("");
      }

      // --- MAPPING UI ---
      const myActiveRx = (regimensData || []).map(r => {
        const startDate = new Date(r.start_date || new Date());
        let endDate = r.end_date ? new Date(r.end_date) : null;

        let daysLeft = 0;
        let totalDays = 1;
        let progressPct = 0;
        const today = new Date();

        if (endDate) {
          daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) daysLeft = 0;
          totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
          progressPct = Math.min(100, Math.max(0, ((totalDays - daysLeft) / totalDays) * 100));
        }

        return {
          id: r.id,
          brand: r.drugProduct?.brand_name || r.display_name || "Chưa rõ",
          ingredient: `${r.drugProduct?.strength_text || ""} ${r.drugProduct?.form || ""}`.trim() || "Chưa rõ thành phần",
          freq: r.schedule_type === "fixed_times" && r.schedule_payload?.times?.length
            ? `Hàng ngày, ${r.schedule_payload.times.length} lần/ngày`
            : `Liều dùng: ${r.total_daily_dose || "1 liều/ngày"}`,
          daysLeft,
          totalDays,
          progressPct,
          hasAlert: false,
          isPermanent: !endDate
        };
      });
      setActiveRx(myActiveRx);

      const myRemindersGrouped = {};
      (schedulesData || []).forEach(s => {
        const rId = s.regimen_id || 'unknown';
        if (!myRemindersGrouped[rId]) {
          myRemindersGrouped[rId] = {
            regimen_id: rId,
            title: s.regimen?.drugProduct?.brand_name || s.regimen?.display_name || s.medication_name || "Thuốc",
            total: 0,
            taken: 0,
            events: []
          };
        }

        myRemindersGrouped[rId].total++;
        if (s.status === "taken") {
          myRemindersGrouped[rId].taken++;
        }

        const timeObj = new Date(s.scheduled_time);
        const timeStr = timeObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });

        myRemindersGrouped[rId].events.push({
          id: s.id,
          time: timeStr,
          scheduled_time: s.scheduled_time,
          title: s.medication_name || s.display_name || "Thuốc",
          dose: "1 liều",
          extra: s.status === "taken" ? "Đã uống" : (s.status === "skipped" ? "Đã bỏ qua" : "Chưa uống"),
          status: s.status || "unknown",
        });
      });

      const myReminders = Object.values(myRemindersGrouped);
      // Sort events within each group
      myReminders.forEach(group => {
        group.events.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
      });

      // Sort groups by earliest schedule time
      myReminders.sort((a, b) => {
        if (a.events.length === 0) return 1;
        if (b.events.length === 0) return -1;
        return new Date(a.events[0].scheduled_time) - new Date(b.events[0].scheduled_time);
      });

      setReminders(myReminders);

      const total = (schedulesData || []).length;
      const taken = (schedulesData || []).filter(r => r.status === "taken").length;
      const missed = (schedulesData || []).filter(r => r.status === "skipped" || r.status === "missed").length;

      setProgress({
        takenPct: total > 0 ? taken / total : 0,
        taken,
        total,
        missed,
      });

      const stats = profiles.map(p => ({
        id: p.id,
        label: p.relationship_to_owner === "self" ? "Tôi" : p.full_name,
        remindersLeft: 0,
      }));
      setFamilyStats(stats);

    } catch (error) {
      console.error("Lỗi tải dữ liệu Home:", error);
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, updateActiveProfile]);

  // --- AUTO RELOAD ---
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );


  // ✅ Re-check when switching profiles (Home stays focused, so useFocusEffect may not re-run)
  useEffect(() => {
    if (!activeProfile?.id) return;
    // Avoid double call on first mount (useFocusEffect already ran)
    // if (!didFirstProfileFetchRef.current) {
    //   didFirstProfileFetchRef.current = true;
    //   return;
    // }
    fetchData();
  }, [activeProfile?.id, fetchData]);

  // --- XỬ LÝ CHECK-IN ---
  const handleMarkTaken = async (id, status) => {
    let oldProgress = { ...progress };
    const oldReminders = [...reminders];

    // Tìm index của group chứa event cần update
    let updatedGroupIdx = -1;
    let updatedEventIdx = -1;

    for (let i = 0; i < reminders.length; i++) {
      const evIdx = reminders[i].events.findIndex(e => e.id === id);
      if (evIdx !== -1) {
        updatedGroupIdx = i;
        updatedEventIdx = evIdx;
        break;
      }
    }

    if (updatedGroupIdx !== -1) {
      const newReminders = [...reminders];
      const group = { ...newReminders[updatedGroupIdx] };
      const events = [...group.events];
      const oldStatus = events[updatedEventIdx].status;

      events[updatedEventIdx] = {
        ...events[updatedEventIdx],
        status: status,
        extra: status === 'taken' ? 'Đã uống' : (status === 'skipped' ? 'Đã bỏ qua' : 'Chưa uống')
      };

      // Update group count
      if (status === 'taken' && oldStatus !== 'taken') {
        group.taken++;
      } else if (status !== 'taken' && oldStatus === 'taken') {
        group.taken--;
      }

      group.events = events;
      newReminders[updatedGroupIdx] = group;
      setReminders(newReminders);

      // Cập nhật lại progress bar local
      let totalTaken = 0;
      newReminders.forEach(g => totalTaken += g.taken);
      let totalMissed = 0;
      newReminders.forEach(g => {
        totalMissed += g.events.filter(e => e.status === 'skipped' || e.status === 'missed').length;
      });

      setProgress(prev => ({
        ...prev,
        taken: totalTaken,
        missed: totalMissed,
        takenPct: prev.total > 0 ? totalTaken / prev.total : 0
      }));
    }

    try {
      await updateIntakeStatus(id, { status });
    } catch (error) {
      console.error("Lỗi update status:", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái thuốc");
      setReminders(oldReminders);
      setProgress(oldProgress);
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
          Xin chào, {userAccount?.full_name || activeProfile?.name || "Bạn"} <Text>👋</Text>
        </Text>
        <Text style={styles.body}>
          Bạn có <Text style={{ fontWeight: "600" }}>{progress.total - progress.taken - progress.missed}</Text> lịch
          nhắc chưa uống hôm nay.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 16, marginBottom: 8, color: COLORS.text700 }]}>Đang xem hồ sơ:</Text>
        <View style={{ height: 60 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {availableProfiles.length === 0 ? <Text style={styles.caption}>Đang tải hồ sơ...</Text> : null}
            {availableProfiles.map(p => {
              const isSelected = activeProfile?.id === p.id;
              let label = p.full_name || p.name || "None";
              if (p.relationship_to_owner === "self") label = "Tôi";
              const initial = label.charAt(0).toUpperCase();

              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => updateActiveProfile && updateActiveProfile({ id: p.id, name: p.full_name || p.name, relationship: p.relationship_to_owner })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelected ? COLORS.white : 'rgba(255, 255, 255, 0.4)',
                    borderRadius: 24,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: isSelected ? COLORS.primary600 : 'transparent',
                    opacity: isSelected ? 1 : 0.8,
                    height: 44
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isSelected ? COLORS.primary600 : COLORS.primary300, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{initial}</Text>
                  </View>
                  <Text style={[styles.caption, { fontWeight: isSelected ? '700' : '500', color: isSelected ? COLORS.primary700 : COLORS.text700, fontSize: 14 }]} numberOfLines={1}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </Card>

      {/* ✅ Safety hint: hiện 5s đầu nếu duplicates/interactions đều [] */}
      {showSafetyHint && !!safetyHintText && (
        <Card style={styles.warningCard}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Ionicons name="warning-outline" size={18} color="#D97706" />
            <Text style={styles.warningText}>
              {safetyHintText}
            </Text>
          </View>
        </Card>
      )}

      {/* QUICK ACTIONS GRID */}
      <View style={styles.grid}>
        {[
          {
            label: "Đơn thuốc của tôi",
            icon: "👥",
            onPress: () => navigation.navigate('MyPrescriptions', { profileId: activeProfile?.id })
          },
          {
            label: "Nhật ký sức khỏe",
            icon: "📝",
            onPress: () => navigation.navigate('SymptomHistory', { profileId: activeProfile?.id })
          },
          { label: "Hồ sơ gia đình", icon: "👨‍👩‍👧", onPress: () => navigation.navigate('Profiles', { profileId: activeProfile?.id }) },
          {
            label: "Kế hoạch dùng thuốc",
            icon: "💊",
            onPress: () => navigation.navigate("CreateRegimen", { profileId: activeProfile?.id }),
          },
          { label: "Lịch nhắc", icon: "⏰", onPress: () => navigation.navigate('Schedule', { profileId: activeProfile?.id }) },
          { label: "Lịch sử & Thống kê", icon: "📈", onPress: () => navigation.navigate('ComplianceReport', { profileId: activeProfile?.id }) },
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
      <Text style={styles.sectionTitle}>Thuốc sử dụng trong hôm nay</Text>
      {loading && reminders.length === 0 ? (
        <Card>
          <Text style={styles.body}>Đang tải thuốc phải uống hôm nay...</Text>
        </Card>
      ) : reminders.length === 0 ? (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Ionicons name="checkmark-done-circle-outline" size={54} color={COLORS.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.body, { textAlign: 'center', color: COLORS.text600 }]}>Hôm nay không có lịch uống thuốc nào.</Text>
            <TouchableOpacity onPress={onGoAddPrescription} style={{ marginTop: 16, backgroundColor: COLORS.primary100, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }}>
              <Text style={[styles.linkBlue, { fontSize: 16 }]}>+ Thêm thuốc ngay</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {reminders.map((group) => (
            <Card key={group.regimen_id} style={group.taken === group.total ? { opacity: 0.8, borderColor: COLORS.success, borderWidth: 1 } : {}}>
              <View style={[styles.reminderRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: group.taken === group.total ? '#F0FDF4' : '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="medical" size={24} color={group.taken === group.total ? COLORS.success : COLORS.primary600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rxTitle, { fontWeight: '700' }, group.taken === group.total && { color: COLORS.success }]}>
                      {group.title}
                    </Text>
                    <View style={{ marginTop: 6, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.text500} style={{ marginRight: 4 }} />
                        <Text style={[styles.caption, { color: COLORS.text700 }]}>
                          Số lần cần dùng: <Text style={{ fontWeight: '700', color: COLORS.text900, fontSize: 13 }}>{group.total}</Text>
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={group.taken > 0 ? COLORS.success : COLORS.text500} style={{ marginRight: 4 }} />
                        <Text style={[styles.caption, { color: COLORS.text700 }]}>
                          Đã dùng: <Text style={{ fontWeight: '700', color: group.taken > 0 ? COLORS.success : COLORS.text900, fontSize: 13 }}>{group.taken}</Text> lần
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity onPress={() => toggleExpand(group.regimen_id)} style={{ padding: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.linkBlue, { marginRight: 4 }]}>{expandedGroups[group.regimen_id] ? "Thu gọn" : "Chi tiết"}</Text>
                  <Ionicons name={expandedGroups[group.regimen_id] ? "chevron-up" : "chevron-down"} size={16} color={COLORS.accent700} />
                </TouchableOpacity>
              </View>

              {expandedGroups[group.regimen_id] && (
                <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: COLORS.line300, paddingTop: 16 }}>
                  {group.events.map((r) => {
                    const isTaken = r.status === 'taken';
                    const isSkipped = r.status === 'skipped';
                    const isUnknown = r.status === 'unknown' || r.status === 'pending';

                    return (
                      <View key={r.id} style={{ backgroundColor: isTaken ? '#F0FDF4' : (isSkipped ? '#FEF2F2' : '#F8FAFC'), padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: isTaken ? '#DCFCE7' : (isSkipped ? '#FEE2E2' : '#F1F5F9') }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isUnknown ? 12 : 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={20} color={COLORS.text700} />
                            <Text style={[styles.body, { fontWeight: '700', marginLeft: 6, color: COLORS.text900 }]}>{r.time}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons
                              name={isTaken ? "checkmark-circle" : (isSkipped ? "close-circle" : "help-circle")}
                              size={18}
                              color={isTaken ? COLORS.success : (isSkipped ? COLORS.danger : COLORS.text500)}
                            />
                            <Text style={[styles.caption, { fontWeight: '600', marginLeft: 4, color: isTaken ? COLORS.success : (isSkipped ? COLORS.danger : COLORS.text500) }]}>
                              {r.extra}
                            </Text>
                          </View>
                        </View>

                        {isUnknown && (
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                              style={[styles.actionBtn, { flex: 1, backgroundColor: 'white', borderColor: '#E2E8F0' }]}
                              onPress={() => handleMarkTaken(r.id, 'taken')}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Đã uống</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, { flex: 1, backgroundColor: 'white', borderColor: '#E2E8F0' }]}
                              onPress={() => handleMarkTaken(r.id, 'skipped')}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="close-circle" size={18} color="#EF4444" />
                              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Bỏ qua</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* ACTIVE PRESCRIPTIONS */}
      <Text style={styles.sectionTitle}>Thuốc đang dùng</Text>
      {activeRx.length === 0 ? (
        <Card style={{ paddingVertical: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="medical-outline" size={48} color={COLORS.bg300} style={{ marginBottom: 8 }} />
            <Text style={[styles.caption, { color: COLORS.text500 }]}>Chưa có đơn thuốc nào đang dùng.</Text>
            <TouchableOpacity onPress={onGoAddPrescription} style={{ marginTop: 12 }}>
              <Text style={styles.linkBlue}>+ Thêm đơn thuốc</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 16, gap: 12 }}
        >
          {activeRx.map((rx) => (
            <Card key={rx.id} style={[styles.rxCard, { width: 280, padding: 16, borderColor: '#E2E8F0', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="medkit" size={26} color={COLORS.primary600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rxBrand, { fontSize: 16, lineHeight: 22, color: COLORS.text900 }]} numberOfLines={2}>
                    {rx.brand}
                  </Text>
                  <Text style={[styles.caption, { color: COLORS.text600, marginTop: 4 }]} numberOfLines={1}>
                    {rx.ingredient}
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="sync-outline" size={16} color={COLORS.text500} style={{ marginRight: 6 }} />
                  <Text style={[styles.caption, { color: COLORS.text700, fontWeight: '500' }]} numberOfLines={1}>
                    {rx.freq}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 'auto' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={[styles.caption, { fontWeight: '600', color: COLORS.text700 }]}>
                    {rx.isPermanent ? "Dùng vô thời hạn" : `Còn ${rx.daysLeft} ngày`}
                  </Text>
                  {!rx.isPermanent && (
                    <Text style={[styles.caption, { color: COLORS.text500 }]}>
                      {rx.progressPct.toFixed(0)}%
                    </Text>
                  )}
                </View>

                {!rx.isPermanent && (
                  <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${rx.progressPct}%`, backgroundColor: COLORS.primary600, borderRadius: 3 }} />
                  </View>
                )}
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

// --- STYLES (GIỮ NGUYÊN + thêm safety hint) ---
const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 0, gap: 14 },
  h1: { fontSize: 24, lineHeight: 32, fontWeight: "600", color: COLORS.text900 },
  body: { fontSize: 16, lineHeight: 22, color: COLORS.text900 },
  bodySm: { fontSize: 14, color: COLORS.text900 },
  caption: { fontSize: 12, color: COLORS.text600 },
  linkBlue: { color: COLORS.accent700, fontWeight: "600" },
  sectionTitle: { marginTop: 8, marginBottom: 6, fontSize: 20, lineHeight: 28, fontWeight: "600", color: COLORS.text900 },
  welcomeRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  // ✅ Safety hint styles
  safetyHintCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  safetyHintText: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.text700,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  gridItem: { width: "48%", backgroundColor: COLORS.white, borderRadius: RADIUS.card, paddingVertical: 18, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  gridIcon: { fontSize: 20, marginBottom: 8 },
  gridLabel: { textAlign: "center", color: COLORS.text900 },
  reminderRow: { flexDirection: "row", alignItems: "flex-start" },
  rxTitle: { fontSize: 16, color: COLORS.text900 },
  reminderActions: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end", columnGap: 8 },
  outlineBtn: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.2, borderRadius: 10 },
  outlineBtnText: { fontSize: 12, fontWeight: "700" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "white" },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
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
  warningCard: {
    backgroundColor: "#FEF9C3", // vàng nhạt
    borderWidth: 1,
    borderColor: "#FACC15",     // viền vàng đậm
  },

  warningText: {
    fontSize: 13,
    color: "#92400E",           // chữ vàng đậm
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
});
