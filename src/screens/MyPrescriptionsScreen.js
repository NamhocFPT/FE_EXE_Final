// MyPrescriptionsScreen.js
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { getBase } from "../utils/apiBase";      // Trỏ về utils
import { COLORS, RADIUS } from "../constants/theme"; // Import theme chung
/* Keep style in-sync with App.js */


/* Reusable */
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Chip = ({
  label,
  color = COLORS.accent700,
  bg = COLORS.primary100,
  onPress,
  active,
}) => {
  const content = (
    <View
      style={[
        styles.chip,
        { backgroundColor: active ? COLORS.primary600 : bg },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? COLORS.white : color }]}>
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
};

/* Screen */
export default function MyPrescriptionsScreen({
  onBackHome,
  activeProfileId,
  activeProfile,
  profiles,
  onSelectProfile,
  accessToken,
  onGoSchedule,
}) {
  const [filter, setFilter] = useState("all"); // all | active | completed
  const [prescriptions, setPrescriptions] = useState([]);
  const [adherenceLogs, setAdherenceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const base = getBase();
      const headers = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch(`${base}/api/prescriptions`, { headers });
      let json = null;
      try {
        json = await res.json();
      } catch (_) {}
      if (!res.ok) {
        const msg =
          (json && (json.message || json.error)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const items = (json && json.data) || [];
      const mapped = items.map((it) => ({
        id: it.id,
        profile: it.tbl_profile || it.Profile || it.profile || null,
        medicine: it.tbl_medicine || it.Medicine || it.medicine || null,
        unit: it.unit,
        dosage: it.dosage,
        note: it.note,
        startDate: it.start_date,
        endDate: it.end_date,
        isActive: !!it.is_active,
        createdAt: it.start_date || new Date().toISOString(),
      }));
      setPrescriptions(mapped);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const fetchAdherenceLogs = useCallback(async () => {
    try {
      const base = getBase();
      const headers = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch(`${base}/api/adherence-logs`, { headers });
      let json = null;
      try {
        json = await res.json();
      } catch (_) {}
      if (res.ok && json && json.data) {
        const logs = json.data
          .filter((log) => {
            // Filter by active profile
            const profile = log.tbl_schedule?.tbl_prescription?.tbl_profile;
            return profile?.id === activeProfileId;
          })
          .map((log) => ({
            id: log.id,
            at: new Date(log.log_time).toLocaleString("vi-VN"),
            action:
              log.status === "taken"
                ? "Đã uống"
                : log.status === "missed"
                ? "Bỏ lỡ"
                : log.status === "skipped"
                ? "Đã bỏ qua"
                : "Chờ",
            med:
              log.tbl_schedule?.tbl_prescription?.tbl_medicine?.name || "Thuốc",
          }));
        setAdherenceLogs(logs);
      }
    } catch (err) {
      console.error("Failed to fetch adherence logs:", err);
    }
  }, [accessToken, activeProfileId]);

  useEffect(() => {
    fetchPrescriptions();
    fetchAdherenceLogs();
  }, [fetchPrescriptions, fetchAdherenceLogs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrescriptions();
    fetchAdherenceLogs();
  }, [fetchPrescriptions, fetchAdherenceLogs]);

  const filteredSorted = useMemo(() => {
    // first filter to active user's prescriptions
    const ownerFiltered = prescriptions.filter((p) => {
      if (activeProfileId) return p.profile?.id === activeProfileId;
      // fallback: prefer profile with relationship 'self'
      return p.profile?.relationship === "self";
    });

    const data =
      filter === "all"
        ? ownerFiltered
        : ownerFiltered.filter((p) => p.isActive === (filter === "active"));
    return [...data].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [filter, prescriptions, activeProfileId]);

  // Group by profile
  const groupedByProfile = useMemo(() => {
    const map = {};
    filteredSorted.forEach((p) => {
      const key = p.profile?.id || "unknown";
      if (!map[key]) map[key] = { profile: p.profile, items: [] };
      map[key].items.push(p);
    });
    return Object.values(map);
  }, [filteredSorted]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Title + Back */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.h1}>Đơn thuốc của tôi</Text>
        <TouchableOpacity onPress={onBackHome} activeOpacity={0.8}>
          <Text style={styles.linkBlue}>‹ Quay lại</Text>
        </TouchableOpacity>
      </View>

      {/* Filter + Refresh */}
      <Card style={{ paddingVertical: 12 }}>
        <View
          style={{ flexDirection: "row", columnGap: 8, alignItems: "center" }}
        >
          <Chip
            label="Tất cả"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label="Đang dùng"
            active={filter === "active"}
            onPress={() => setFilter("active")}
          />
          <Chip
            label="Đã hoàn thành"
            active={filter === "completed"}
            onPress={() => setFilter("completed")}
          />
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.8}>
            <Text style={[styles.linkBlue]}>
              {refreshing ? "Đang tải..." : "Làm mới"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.caption, { marginTop: 8 }]}>
          {loading ? "Đang tải đơn thuốc..." : "Sắp xếp theo mới nhất"}
        </Text>
        {error ? (
          <Text
            style={[styles.caption, { color: COLORS.danger, marginTop: 8 }]}
          >
            {error}
          </Text>
        ) : null}
      </Card>

      {/* List grouped by profile */}
      <View style={{ gap: 12 }}>
        {groupedByProfile.length === 0 && !loading ? (
          <Card>
            <Text style={styles.body}>Không tìm thấy đơn thuốc nào.</Text>
          </Card>
        ) : (
          groupedByProfile.map((grp) => (
            <View key={grp.profile?.id || Math.random()}>
              <Text style={styles.sectionTitle}>
                {grp.profile?.name || "Không xác định"}
              </Text>
              <Card>
                {grp.items.map((rx, idx) => {
                  const isActive = rx.isActive;
                  return (
                    <View
                      key={rx.id}
                      style={[
                        styles.prescriptionCard,
                        idx > 0 && {
                          marginTop: 12,
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: COLORS.line300,
                        },
                      ]}
                    >
                      <View style={styles.prescriptionHeader}>
                        <View style={styles.medicineIconContainer}>
                          <Text style={styles.medicineIcon}>💊</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.medicineName}>
                            {rx.medicine?.name || "Tên thuốc"}
                          </Text>
                          <Text style={styles.dosageText}>
                            {rx.dosage} • {rx.unit}
                          </Text>
                        </View>
                        <Chip
                          label={isActive ? "Đang dùng" : "Hoàn thành"}
                          color={isActive ? COLORS.success : COLORS.text600}
                          bg={isActive ? "#E9FCEB" : "#F3F4F6"}
                        />
                      </View>

                      {rx.note ? (
                        <View style={styles.noteContainer}>
                          <Text style={styles.noteIcon}>📝</Text>
                          <Text style={styles.noteText}>{rx.note}</Text>
                        </View>
                      ) : null}

                      <View style={styles.dateRow}>
                        <View style={styles.dateItem}>
                          <Text style={styles.dateLabel}>Bắt đầu</Text>
                          <Text style={styles.dateValue}>
                            {formatDate(rx.startDate)}
                          </Text>
                        </View>
                        {rx.endDate && (
                          <View style={styles.dateItem}>
                            <Text style={styles.dateLabel}>Kết thúc</Text>
                            <Text style={styles.dateValue}>
                              {formatDate(rx.endDate)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {isActive && (
                        <TouchableOpacity
                          style={styles.reminderButton}
                          activeOpacity={0.8}
                          onPress={() => onGoSchedule && onGoSchedule()}
                        >
                          <Text style={styles.reminderButtonIcon}>⏰</Text>
                          <Text style={styles.reminderButtonText}>
                            Đặt lịch nhắc uống thuốc
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </Card>
            </View>
          ))
        )}
      </View>

      {/* Medication Log */}
      <Text style={styles.sectionTitle}>Nhật ký uống thuốc</Text>
      <Card>
        {adherenceLogs.length === 0 ? (
          <Text style={styles.caption}>Chưa có nhật ký nào.</Text>
        ) : (
          adherenceLogs.map((log, idx) => (
            <View
              key={log.id}
              style={{
                paddingVertical: 10,
                borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: COLORS.line300,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.bodySm}>{log.med}</Text>
                <Text style={styles.caption}>{log.at}</Text>
              </View>
              <Chip
                label={log.action}
                color={
                  /Đã uống/i.test(log.action)
                    ? COLORS.success
                    : /Tạm hoãn/i.test(log.action)
                    ? COLORS.warning
                    : "#EF4444"
                }
                bg={
                  /Đã uống/i.test(log.action)
                    ? "#E9FCEB"
                    : /Tạm hoãn/i.test(log.action)
                    ? "#FFF6E5"
                    : "#FDECEC"
                }
              />
            </View>
          ))
        )}
      </Card>

      <View style={{ height: 84 }} />
    </ScrollView>
  );
}

/* Helpers */
function formatDate(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* Styles */
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
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    color: COLORS.text900,
  },
  linkBlue: { color: COLORS.accent700, fontWeight: "600" },
  caption: { fontSize: 12, color: COLORS.text600 },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: COLORS.text900,
  },
  chip: {
    borderRadius: RADIUS.chip,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  rxBrand: { fontSize: 16, fontWeight: "600", color: COLORS.text900 },
  bodySm: { fontSize: 14, color: COLORS.text900 },
  inputSmall: {
    borderWidth: 1,
    borderColor: COLORS.line300,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 6,
    color: COLORS.text900,
  },
  prescriptionCard: {
    paddingVertical: 0,
  },
  prescriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  medicineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineIcon: {
    fontSize: 24,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text900,
    marginBottom: 2,
  },
  dosageText: {
    fontSize: 13,
    color: COLORS.text600,
  },
  noteContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text900,
  },
  dateRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.text600,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dateValue: {
    fontSize: 14,
    color: COLORS.text900,
    fontWeight: "600",
  },
  reminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary600,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  reminderButtonIcon: {
    fontSize: 18,
  },
  reminderButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
