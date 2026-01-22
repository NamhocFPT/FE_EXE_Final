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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { getIntakeSchedule, updateIntakeStatus } from "../services/intakeService";
import { getProfiles } from "../services/profileService";

const ITEM_WIDTH = 60;

const safeArray = (v) => (Array.isArray(v) ? v : []);

const normalizeIntakeResponse = (res) => {
  // IMPORTANT: request.js của bạn đã return response.data rồi
  // nên ở đây thường res đã là data.
  const payload = res?.data ?? res;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  return [];
};

// lấy HH:mm an toàn
const formatHHmm = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // fallback nếu server trả string kiểu "2026-01-01T08:00:00Z"
    const t = String(iso).split("T")[1] || "";
    return t.substring(0, 5) || "--:--";
  }
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const isSameDay = (a, b) => a?.toDateString?.() === b?.toDateString?.();

export default function FamilyDashboardScreen({ navigation }) {
  const [selectedProfileId, setSelectedProfileId] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // calendar
  const flatListRef = useRef(null);
  const [calendarReady, setCalendarReady] = useState(false);

  // ===== calendarDays: 31 ngày (-15..+15)
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

  // index của selectedDate trong calendarDays
  const selectedIndex = useMemo(() => {
    const idx = calendarDays.findIndex((d) => isSameDay(d, selectedDate));
    return idx >= 0 ? idx : 15;
  }, [calendarDays, selectedDate]);

  // ===== load profiles
  useEffect(() => {
    const loadProfiles = async () => {
      setProfilesLoading(true);
      try {
        const data = await getProfiles();
        const list = safeArray(data);
        setProfiles(list);

        // ✅ default profile: ưu tiên self nếu muốn
        // Nếu bạn muốn chọn self mặc định thay vì all:
        // const self = list.find(p => p?.relationship_to_owner === 'self');
        // setSelectedProfileId(self?.id || 'all');
      } catch (e) {
        console.log("loadProfiles error:", e?.message || e);
        setProfiles([]);
      } finally {
        setProfilesLoading(false);
      }
    };

    loadProfiles();
  }, []);

  // ===== scroll tới selected date khi calendar ready hoặc selectedDate đổi
  useEffect(() => {
    if (!calendarReady) return;

    // tránh crash nếu list chưa mount xong
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    });
  }, [calendarReady, selectedIndex]);

  // ===== load intake events
  const loadData = useCallback(async () => {
    // ✅ chờ profiles load xong
    if (profilesLoading) return;

    // ✅ nếu chưa có profiles thì thôi
    if (!profiles || profiles.length === 0) {
      setMedications([]);
      return;
    }

    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];

      // query from/to theo contract. Dùng Z là ok.
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

      // ✅ sort theo scheduled_time tăng dần
      const sorted = [...items].sort((a, b) => {
        const ta = new Date(a?.scheduled_time || 0).getTime();
        const tb = new Date(b?.scheduled_time || 0).getTime();
        return ta - tb;
      });

      setMedications(sorted);
    } catch (error) {
      console.log("loadData error:", error?.message || error);
      setMedications([]);
      // bạn có thể show Alert nếu muốn:
      // Alert.alert("Lỗi", error?.message || "Không tải được lịch uống thuốc.");
    } finally {
      setLoading(false);
    }
  }, [profiles, profilesLoading, selectedProfileId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== update status
  const handleConfirm = async (eventId, status) => {
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

  // ===== render date item
  const renderDateItem = ({ item, index }) => {
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
      {/* Profile Selector */}
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

      {/* Calendar Strip */}
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
            // ✅ fallback chống crash
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
    // status từ BE: scheduled / taken / skipped / delayed ...
    const status = item?.status;

    // ✅ cho linh hoạt nếu BE dùng "pending" thay "scheduled"
    const isSchedulable = status === "scheduled" || status === "pending";

    const isTaken = status === "taken";
    const isSkipped = status === "skipped";
    const isDelayed = status === "delayed";

    const profile = profiles.find((p) => p.id === item.profile_id);

    return (
      <View style={styles.medCard}>
        <View
          style={[
            styles.colorBar,
            { backgroundColor: profile?.sex === "female" ? "#EC4899" : "#3B82F6" },
          ]}
        />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName} numberOfLines={1}>
                {item.display_name || "Thuốc"}
              </Text>
              <Text style={styles.profileTag}>• {profile?.full_name || "Hồ sơ"}</Text>
            </View>

            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#1E293B" />
              <Text style={styles.medTime}>{formatHHmm(item.scheduled_time)}</Text>
            </View>
          </View>

          <View style={styles.medDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="medical-outline" size={16} color="#64748B" />
              <Text style={styles.medInfo}>
                {item.dose_amount ?? "--"} {item.dose_unit ?? ""}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="restaurant-outline" size={16} color="#64748B" />
              <Text style={styles.medInfo}>{item.notes || "Không có ghi chú"}</Text>
            </View>
          </View>

          {isSchedulable ? (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.btnDelayed]}
                onPress={() => handleConfirm(item.id, "delayed")}
                activeOpacity={0.85}
              >
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text style={styles.smallBtnText}>Hoãn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainBtn, styles.btnTaken]}
                onPress={() => handleConfirm(item.id, "taken")}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text style={styles.mainBtnText}>Đã uống</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, styles.btnSkipped]}
                onPress={() => handleConfirm(item.id, "skipped")}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.smallBtnText}>Bỏ qua</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.statusBadge,
                isTaken ? styles.badgeTaken : isSkipped ? styles.badgeSkipped : styles.badgeDelayed,
              ]}
            >
              <Ionicons
                name={isTaken ? "checkmark-circle" : isSkipped ? "close-circle" : "time"}
                size={18}
                color={isTaken ? "#16A34A" : isSkipped ? "#EF4444" : "#F59E0B"}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isTaken ? "#16A34A" : isSkipped ? "#EF4444" : "#F59E0B" },
                ]}
              >
                {isTaken
                  ? `Đã uống lúc ${formatHHmm(item.taken_time)}`
                  : isSkipped
                    ? "Đã bỏ qua"
                    : "Đã hoãn uống"}
              </Text>
            </View>
          )}
        </View>
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
              <Text style={styles.emptyText}>No medications scheduled for this day.</Text>
            </View>
          }
        />
      )}
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
    borderRadius: 20,
    flexDirection: "row",
    marginBottom: 16,
    elevation: 3,
    overflow: "hidden",
  },
  colorBar: { width: 6 },
  cardContent: { flex: 1, padding: 16 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medName: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  profileTag: { fontSize: 13, color: COLORS.primary600, fontWeight: "600", marginTop: 2 },

  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medTime: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginLeft: 4 },

  medDetails: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 15 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  medInfo: { fontSize: 14, color: "#64748B", flexShrink: 1 },

  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { textAlign: "center", marginTop: 15, color: "#94A3B8", fontSize: 16 },

  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  mainBtn: {
    flex: 2,
    flexDirection: "row",
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  btnTaken: { backgroundColor: "#10B981" },
  mainBtnText: { color: "white", fontWeight: "bold", marginLeft: 5 },

  smallBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  btnDelayed: { borderColor: "#FEF3C7" },
  btnSkipped: { borderColor: "#FEE2E2" },
  smallBtnText: { fontSize: 11, fontWeight: "600", color: "#64748B", marginTop: 2 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    marginTop: 5,
  },
  badgeTaken: { backgroundColor: "#F0FDF4" },
  badgeSkipped: { backgroundColor: "#FEF2F2" },
  badgeDelayed: { backgroundColor: "#FFFBEB" },
  statusText: { fontWeight: "bold", marginLeft: 8, fontSize: 13 },
});
