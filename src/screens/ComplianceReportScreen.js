import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import { COLORS } from "../constants/theme";

import { getProfiles } from "../services/profileService";
import { getComplianceStats } from "../services/intakeService";

// ===== Helpers =====
const pickArray = (res) => {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
};

// ✅ profileId đúng để gọi /patient-profiles/{profileId}
const getProfileId = (p) => p?.id; // nếu BE trả field khác, đổi ở đây

const screenWidth = Dimensions.get("window").width;

export default function ComplianceReportScreen({ navigation, route }) {
    // ===== profile filter =====
    const [profiles, setProfiles] = useState([]);
    const [profilesLoading, setProfilesLoading] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState(null);

    // ===== report =====
    const [timeRange, setTimeRange] = useState("week"); // week | month
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // ===== 1) Load profiles =====
    const loadProfiles = useCallback(async () => {
        setProfilesLoading(true);
        try {
            const res = await getProfiles(); // bạn đã có
            const list = pickArray(res);
            const safe = Array.isArray(list) ? list : [];
            setProfiles(safe);

            if (safe.length === 0) {
                setSelectedProfileId(null);
                return;
            }

            // --- IMPORTANT: chỉ chấp nhận routeId nếu nó nằm trong safe ---
            const routeId = route?.params?.profileId;
            const validRouteId =
                !!routeId && safe.some((p) => getProfileId(p) === routeId);

            const selfProfile = safe.find((p) => p?.relationship_to_owner === "self");
            const fallbackId = getProfileId(selfProfile) || getProfileId(safe[0]);

            const nextId = validRouteId ? routeId : fallbackId;

            // ✅ luôn set (override) để tránh giữ nhầm userId từ route
            setSelectedProfileId(nextId);

            // debug nhanh
            console.log("[Profiles] routeId:", routeId);
            console.log("[Profiles] validRouteId:", validRouteId);
            console.log("[Profiles] ids:", safe.map((p) => getProfileId(p)));
            console.log("[Profiles] selectedProfileId(next):", nextId);
        } catch (e) {
            console.error("loadProfiles error:", e);
            Alert.alert("Lỗi", "Không tải được danh sách hồ sơ.");
            setProfiles([]);
            setSelectedProfileId(null);
        } finally {
            setProfilesLoading(false);
        }
    }, [route?.params?.profileId]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    // ===== 2) Load compliance stats =====
    const loadStats = useCallback(async () => {
        // ✅ chặn gọi khi chưa load xong profiles hoặc chưa có selectedProfileId
        if (profilesLoading) return;
        if (!selectedProfileId) return;

        setLoading(true);
        try {
            console.log("[Compliance] selectedProfileId:", selectedProfileId);
            console.log("[Compliance] timeRange:", timeRange);

            const data = await getComplianceStats(selectedProfileId, timeRange);
            setStats(data);
        } catch (e) {
            console.error("loadStats error:", e);
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                "Không tải được báo cáo tuân thủ.";
            Alert.alert("Lỗi", msg);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [profilesLoading, selectedProfileId, timeRange]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // ===== computed =====
    const selectedProfile = useMemo(
        () => profiles.find((p) => getProfileId(p) === selectedProfileId),
        [profiles, selectedProfileId]
    );

    const pieData = useMemo(() => {
        if (!stats) return [];
        return [
            {
                name: "Đã uống",
                population: Math.max(0, stats.taken_count || 0),
                color: "#10B981",
                legendFontColor: "#7F7F7F",
                legendFontSize: 12,
            },
            {
                name: "Bỏ qua",
                population: Math.max(0, stats.skipped_count || 0),
                color: "#EF4444",
                legendFontColor: "#7F7F7F",
                legendFontSize: 12,
            },
            {
                name: "Quên/Trễ",
                population: Math.max(0, stats.missed_count || 0),
                color: "#F59E0B",
                legendFontColor: "#7F7F7F",
                legendFontSize: 12,
            },
        ];
    }, [stats]);

    const showBusy = profilesLoading || loading;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.h1}>Báo cáo tuân thủ</Text>
                        {!!selectedProfile?.full_name && (
                            <Text style={{ color: "#6B7280", marginTop: 4 }}>
                                Hồ sơ: {selectedProfile.full_name}
                            </Text>
                        )}
                    </View>
                </View>

                {/* PROFILE FILTER */}
                <View style={styles.filterWrapper}>
                    {profilesLoading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="small" color={COLORS.primary600} />
                            <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.profileList}
                        >
                            {profiles.map((p) => {
                                const pid = getProfileId(p);
                                const active = selectedProfileId === pid;
                                const shortName = (p.full_name || p.name || "").split(" ").pop() || "Hồ sơ";
                                const isSelf = p?.relationship_to_owner === "self";

                                return (
                                    <TouchableOpacity
                                        key={pid}
                                        onPress={() => setSelectedProfileId(pid)}
                                        style={[styles.profileItem, active && styles.profileActive]}
                                        activeOpacity={0.85}
                                    >
                                        <View
                                            style={[
                                                styles.avatar,
                                                { backgroundColor: active ? COLORS.primary600 : "#94A3B8" },
                                            ]}
                                        >
                                            <Text style={styles.avatarText}>{shortName.charAt(0)}</Text>
                                        </View>
                                        <Text style={styles.profileName}>{isSelf ? "Bạn" : shortName}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* RANGE TABS */}
                <View style={styles.tabRow}>
                    {["week", "month"].map((r) => {
                        const active = timeRange === r;
                        return (
                            <TouchableOpacity
                                key={r}
                                onPress={() => setTimeRange(r)}
                                style={[styles.rangeTab, active && styles.rangeTabActive]}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.rangeTabText, active && styles.rangeTabTextActive]}>
                                    {r === "week" ? "Tuần này" : "Tháng này"}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* BODY */}
                {showBusy ? (
                    <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 20 }} />
                ) : !selectedProfileId ? (
                    <View style={styles.card}>
                        <Text style={{ color: "#6B7280" }}>Chưa chọn hồ sơ.</Text>
                    </View>
                ) : !stats ? (
                    <View style={styles.card}>
                        <Text style={{ color: "#6B7280" }}>Không có dữ liệu trong khoảng thời gian này.</Text>
                    </View>
                ) : (
                    <>
                        {/* Donut chart */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Tỉ lệ tuân thủ tổng quát</Text>

                            <View style={{ alignItems: "center", position: "relative" }}>
                                <PieChart
                                    data={pieData}
                                    width={screenWidth - 40}
                                    height={220}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[0, 0]}
                                    hasLegend
                                    absolute
                                />
                                <View style={styles.chartOverlay}>
                                    <Text style={styles.percentageText}>{stats.adherence_rate ?? 0}%</Text>
                                </View>
                            </View>
                        </View>

                        {/* Stats grid */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statBox, { backgroundColor: "#ECFDF5" }]}>
                                <Text style={[styles.statValue, { color: "#10B981" }]}>{stats.taken_count ?? 0}</Text>
                                <Text style={styles.statLabel}>Đã uống</Text>
                            </View>

                            <View style={[styles.statBox, { backgroundColor: "#FEF2F2" }]}>
                                <Text style={[styles.statValue, { color: "#EF4444" }]}>{stats.skipped_count ?? 0}</Text>
                                <Text style={styles.statLabel}>Bỏ qua</Text>
                            </View>

                            <View style={[styles.statBox, { backgroundColor: "#FFFBEB" }]}>
                                <Text style={[styles.statValue, { color: "#F59E0B" }]}>{stats.missed_count ?? 0}</Text>
                                <Text style={styles.statLabel}>Quên/Trễ</Text>
                            </View>
                        </View>

                        {/* Most missed */}
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                                <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>
                                    Thuốc bỏ lỡ nhiều nhất
                                </Text>
                            </View>

                            {(stats.most_missed?.length ?? 0) === 0 ? (
                                <Text style={{ marginTop: 10, color: "#64748B" }}>
                                    Không có dữ liệu bỏ lỡ trong khoảng thời gian này.
                                </Text>
                            ) : (
                                (stats.most_missed || []).map((item, idx) => (
                                    <View key={`${item.name}-${idx}`} style={styles.missedItem}>
                                        <Text style={styles.missedName}>{item.name}</Text>
                                        <Text style={styles.missedCount}>Bỏ lỡ {item.count} lần</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const chartConfig = {
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    content: { padding: 16, paddingBottom: 32 },

    headerRow: { marginBottom: 12 },
    h1: { fontSize: 24, fontWeight: "700", color: "#111827" },

    filterWrapper: { backgroundColor: "#F9FAFB", paddingVertical: 6, marginBottom: 10 },
    profileList: { paddingHorizontal: 2 },
    profileItem: { alignItems: "center", marginRight: 16, opacity: 0.6 },
    profileActive: { opacity: 1 },
    avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", marginBottom: 4 },
    avatarText: { color: "white", fontWeight: "bold" },
    profileName: { fontSize: 11, fontWeight: "600", color: "#111827" },

    loadingWrap: { paddingHorizontal: 4, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
    loadingText: { color: "#64748B", fontWeight: "600" },

    tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    rangeTab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center" },
    rangeTabActive: { backgroundColor: COLORS.primary600 },
    rangeTabText: { color: "#475569", fontWeight: "700" },
    rangeTabTextActive: { color: "white" },

    card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
    cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 15 },

    chartOverlay: { position: "absolute", top: "45%", left: 0, right: 0, alignItems: "center" },
    percentageText: { fontSize: 24, fontWeight: "bold", color: COLORS.primary600 },

    statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    statBox: { flex: 1, marginHorizontal: 4, padding: 15, borderRadius: 12, alignItems: "center" },
    statValue: { fontSize: 20, fontWeight: "bold" },
    statLabel: { fontSize: 11, color: "#64748B", marginTop: 4 },

    row: { flexDirection: "row", alignItems: "center" },
    missedItem: { marginTop: 10, padding: 12, backgroundColor: "#F8FAFC", borderRadius: 10, flexDirection: "row", justifyContent: "space-between" },
    missedName: { fontWeight: "600", flex: 1, paddingRight: 10 },
    missedCount: { color: "#F59E0B", fontSize: 12 },
});
