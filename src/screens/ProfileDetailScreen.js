import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StatusBar,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

// ✅ Services đúng theo UC-P3: profile detail + quyền truy cập
import { getProfileActiveRegimens, getProfileDetail } from "../services/profileService";

// ✅ Prescriptions + Regimens nên nằm cùng prescriptionService (hoặc regimenService)
import {
    getProfilePrescriptions,
} from "../services/prescriptionService";
import { updateRegimen } from "../services/regimenService";

const RELATIONSHIP_LABEL = {
    self: "Bản thân",
    father: "Bố",
    mother: "Mẹ",
    son: "Con trai",
    daughter: "Con gái",
    spouse: "Vợ/Chồng",
    sister: "Chị/Em gái",
    brother: "Anh/Em trai",
    other: "Khác",
};

const GENDER_LABEL = { male: "Nam", female: "Nữ", other: "Khác" };

export default function ProfileDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();

    // ✅ Chỉ lấy profileId làm key (route có thể truyền profile object cũng được, nhưng chỉ dùng fallback)
    const routeProfile = route.params?.profile ?? null;
    const routeProfileId = route.params?.profileId ?? routeProfile?.id ?? null;

    const profileId = useMemo(() => {
        if (!routeProfileId || typeof routeProfileId === "object") return null;
        return routeProfileId;
    }, [routeProfileId]);

    // ===== State =====
    const [profile, setProfile] = useState(routeProfile); // fallback hiển thị tạm
    const [activeTab, setActiveTab] = useState("prescriptions"); // prescriptions | meds | symptoms
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [prescriptions, setPrescriptions] = useState([]);
    const [activeRegimens, setActiveRegimens] = useState([]);
    const [stoppingId, setStoppingId] = useState(null);

    const pickArray = (res) => {
        const payload = res?.data ?? res;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.data?.items)) return payload.data.items;
        return [];
    };

    const formatDate = (isoOrDate) => {
        if (!isoOrDate) return "N/A";
        const d = new Date(isoOrDate);
        if (Number.isNaN(d.getTime())) return "N/A";
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${d.getFullYear()}`;
    };

    // ===== Load Profile Detail (UC-P3) =====
    const loadProfile = useCallback(async () => {
        if (!profileId) {
            setLoading(false);
            setError("ID hồ sơ không hợp lệ.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // ✅ Backend sẽ check quyền: owner hoặc shared
            const res = await getProfileDetail(profileId);
            const payload = res?.data ?? res;
            setProfile(payload);
        } catch (e) {
            const msg = e?.message || "Không thể tải hồ sơ.";

            // ✅ Nếu không có quyền (401/403) => báo rõ và back
            if (String(msg).includes("401") || String(msg).includes("403") || String(msg).toLowerCase().includes("không được phép")) {
                Alert.alert("Không có quyền", "Bạn không có quyền truy cập hồ sơ này.", [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
                return;
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [profileId, navigation]);

    // ===== Load Prescriptions & Regimens =====
    const loadTabsData = useCallback(async () => {
        if (!profileId) return;

        try {
            // Prescriptions list: đúng contract GET /patient-profiles/{profileId}/prescriptions
            const presRes = await getProfilePrescriptions(profileId, {
                // tuỳ bạn: có thể để status "active" hoặc "all"
                limit: 50,
                offset: 0,
            });
            setPrescriptions(pickArray(presRes));

            // Active regimens: GET /patient-profiles/{profileId}/regimens?is_active=true
            const regRes = await getProfileActiveRegimens(profileId, { is_active: true });
            setActiveRegimens(pickArray(regRes));
        } catch (e) {
            console.error("❌ loadTabsData error:", e);
            // Không block cả screen nếu fail tab data
            setPrescriptions([]);
            setActiveRegimens([]);
        }
    }, [profileId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        // Sau khi profile load xong thì load data tab
        if (!profileId) return;
        loadTabsData();
    }, [profileId, loadTabsData]);

    // ===== UC-MR6: Stop regimen =====
    const handleStopRegimen = (regimenId) => {
        Alert.alert(
            "Dừng nhắc thuốc",
            "Bạn có chắc chắn muốn dừng kế hoạch uống thuốc này không?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Dừng",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setStoppingId(regimenId);
                            await updateRegimen(regimenId, { is_active: false });
                            Alert.alert("Thành công", "Đã dừng nhắc thuốc.");
                            await loadTabsData();
                        } catch (e) {
                            Alert.alert("Lỗi", e?.message || "Không thể dừng phác đồ.");
                        } finally {
                            setStoppingId(null);
                        }
                    },
                },
            ]
        );
    };

    // ===== Render helpers =====
    const renderPrescriptionCard = (p) => {
        const status = p.status || "unknown";
        const statusLabel =
            status === "active" ? "Đang dùng" : status === "completed" ? "Hoàn thành" : status === "cancelled" ? "Đã hủy" : status;

        return (
            <TouchableOpacity
                key={p.id}
                style={styles.presCard}
                // onPress={() => navigation.navigate("PrescriptionDetail", { prescriptionId: p.id, profileId })}
                activeOpacity={0.8}
            >
                <View style={styles.presHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.presName}>{p.prescriber_name || "Bác sĩ (chưa rõ)"}</Text>
                        <Text style={styles.presMeta}>
                            {p.facility_name || "Cơ sở (chưa rõ)"} • {formatDate(p.issued_date)}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,
                            status === "active" ? styles.statusActive : status === "completed" ? styles.statusDone : styles.statusOther,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,
                                status === "active" ? styles.statusTextActive : status === "completed" ? styles.statusTextDone : styles.statusTextOther,
                            ]}
                        >
                            {statusLabel}
                        </Text>
                    </View>
                </View>

                {!!p.note && <Text style={styles.noteLine} numberOfLines={2}>Ghi chú: {p.note}</Text>}
            </TouchableOpacity>
        );
    };

    const renderRegimenCard = (r) => {
        const times = r?.schedule_payload?.times || [];
        const isActive = r?.is_active !== false; // mặc định true

        return (
            <TouchableOpacity
                key={r.id}
                style={styles.presCard}
                onPress={() => navigation.navigate("RegimenDetail", { regimenId: r.id, profileId })}
                activeOpacity={0.8}
            >
                <View style={styles.presHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.presName}>{r.display_name || "Thuốc (chưa rõ)"}</Text>
                        <Text style={styles.regimenDetail}>
                            {r.total_daily_dose ? `${r.total_daily_dose} ` : ""}
                            {r.dose_unit || ""} {r.schedule_type ? `• ${r.schedule_type}` : ""}
                        </Text>

                        <View style={styles.timeTagRow}>
                            <Ionicons name="time-outline" size={14} color={COLORS.primary600} />
                            <Text style={styles.regimenTime}>
                                {times.length ? times.join(", ") : "Chưa đặt giờ"}
                            </Text>
                        </View>
                    </View>

                    {isActive && (
                        <TouchableOpacity
                            style={styles.stopButton}
                            disabled={stoppingId === r.id}
                            onPress={() => handleStopRegimen(r.id)}
                        >
                            {stoppingId === r.id ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <Text style={styles.stopButtonText}>Dừng</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // ===== UI guard =====
    if (!profileId) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={{ color: "#111827" }}>ID hồ sơ không hợp lệ.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
                    <Text style={{ color: COLORS.primary600, fontWeight: "700" }}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const displayName = profile?.full_name || profile?.name || "Hồ sơ";
    const relationshipLabel = RELATIONSHIP_LABEL[profile?.relationship_to_owner] || profile?.relationship_to_owner || "—";
    const genderLabel = GENDER_LABEL[profile?.sex] || profile?.sex || "—";

    const canShare = useMemo(() => {
        const r = profile?.my_role || profile?.role || profile?.access_role;
        if (r) return String(r).toLowerCase() === "owner";
        return route.params?.isOwner === true; // fallback
    }, [profile, route.params?.isOwner]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                    <Text style={styles.backText}>Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Chi tiết hồ sơ</Text>

                <View style={{ width: 44, alignItems: "flex-end" }}>
                    {canShare ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate("ShareProfile", { profile: profile || routeProfile, profileId })}
                            style={{ padding: 6 }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="share-social-outline" size={22} color={COLORS.primary600} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 22 }} />
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* HERO */}
                <View style={styles.hero}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>

                    <Text style={styles.nameText}>{displayName}</Text>
                    <Text style={styles.subText}>{relationshipLabel} • {genderLabel}</Text>
                </View>

                {/* NOTES */}
                <View style={styles.section}>
                    <View style={styles.notesCard}>
                        <View style={styles.notesHeader}>
                            <Ionicons name="medical" size={18} color={COLORS.primary600} />
                            <Text style={styles.notesTitle}>Ghi chú sức khỏe</Text>
                        </View>
                        <Text style={styles.notesText}>{profile?.notes || "Không có ghi chú."}</Text>
                    </View>
                </View>

                {/* LOADING / ERROR */}
                {loading ? (
                    <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 16 }} />
                ) : !!error ? (
                    <View style={{ paddingHorizontal: 16 }}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={loadProfile} style={{ marginTop: 10 }}>
                            <Text style={{ color: COLORS.primary600, fontWeight: "700" }}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* TAB BAR */}
                {!loading && !error && (
                    <>
                        <View style={styles.tabBar}>
                            <TouchableOpacity
                                style={[styles.tabItem, activeTab === "prescriptions" && styles.tabActive]}
                                onPress={() => setActiveTab("prescriptions")}
                            >
                                <Text style={[styles.tabLabel, activeTab === "prescriptions" && styles.tabLabelActive]}>
                                    Đơn thuốc
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabItem, activeTab === "meds" && styles.tabActive]}
                                onPress={() => setActiveTab("meds")}
                            >
                                <Text style={[styles.tabLabel, activeTab === "meds" && styles.tabLabelActive]}>
                                    Đang uống
                                </Text>
                            </TouchableOpacity>

                            {/* <TouchableOpacity
                                style={[styles.tabItem, activeTab === "symptoms" && styles.tabActive]}
                                onPress={() => setActiveTab("symptoms")}
                            >
                                <Text style={[styles.tabLabel, activeTab === "symptoms" && styles.tabLabelActive]}>
                                    Triệu chứng
                                </Text>
                            </TouchableOpacity> */}
                        </View>

                        {/* CONTENT */}
                        <View style={styles.content}>
                            {activeTab === "prescriptions" && (
                                prescriptions.length ? (
                                    prescriptions.map(renderPrescriptionCard)
                                ) : (
                                    <Text style={styles.emptyText}>Chưa có đơn thuốc nào.</Text>
                                )
                            )}

                            {activeTab === "meds" && (
                                activeRegimens.length ? (
                                    activeRegimens.map(renderRegimenCard)
                                ) : (
                                    <Text style={styles.emptyText}>Chưa có thuốc nào đang sử dụng.</Text>
                                )
                            )}

                            {activeTab === "symptoms" && (
                                <Text style={styles.emptyText}>
                                    Tab triệu chứng: bạn có thể nối sang màn Symptoms theo profileId.
                                </Text>
                            )}
                        </View>

                        <View style={{ height: 110 }} />
                    </>
                )}
            </ScrollView>

            {/* FAB */}
            {/* <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate("AddManualMedication", { profileId })}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.fabLabel}>Thêm thuốc tự do</Text>
            </TouchableOpacity> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8F9FA" },
    center: { justifyContent: "center", alignItems: "center" },

    header: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    backButton: { flexDirection: "row", alignItems: "center" },
    backText: { color: COLORS.primary600, fontSize: 16, marginLeft: 4 },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.text900 },

    hero: { alignItems: "center", padding: 24, backgroundColor: "white" },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary600,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { color: "white", fontSize: 32, fontWeight: "bold" },
    nameText: { fontSize: 22, fontWeight: "bold", marginTop: 12, color: COLORS.text900 },
    subText: { color: "#666", marginTop: 4 },

    section: { padding: 16 },
    notesCard: {
        backgroundColor: "#EBF2FF",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#D0E1FF",
    },
    notesHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    notesTitle: { fontWeight: "bold", color: COLORS.primary600, marginLeft: 8 },
    notesText: { color: "#444", lineHeight: 20, fontSize: 14 },

    tabBar: {
        flexDirection: "row",
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderColor: "#EEE",
    },
    tabItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
    tabActive: { borderBottomWidth: 2, borderColor: COLORS.primary600 },
    tabLabel: { fontSize: 14, fontWeight: "600", color: "#888" },
    tabLabelActive: { color: COLORS.primary600 },

    content: { padding: 16 },

    presCard: {
        backgroundColor: "white",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    presHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    presName: { fontSize: 16, fontWeight: "bold", color: COLORS.text900, flex: 1, marginRight: 8 },
    presMeta: { fontSize: 13, color: "#6B7280", marginTop: 6 },

    noteLine: { marginTop: 10, color: "#4B5563", fontSize: 13, lineHeight: 18 },

    // Regimen
    regimenDetail: { fontSize: 14, color: "#4B5563", marginTop: 4 },
    timeTagRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 },
    regimenTime: { fontSize: 13, color: COLORS.primary600, fontWeight: "600" },

    stopButton: {
        backgroundColor: "#FEE2E2",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FECACA",
        minWidth: 54,
        alignItems: "center",
        justifyContent: "center",
    },
    stopButtonText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },

    // status badges
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusActive: { backgroundColor: "#DCFCE7" },
    statusDone: { backgroundColor: "#F3F4F6" },
    statusOther: { backgroundColor: "#FEF3C7" },

    statusText: { fontSize: 10, fontWeight: "700" },
    statusTextActive: { color: "#16A34A" },
    statusTextDone: { color: "#6B7280" },
    statusTextOther: { color: "#92400E" },

    emptyText: { textAlign: "center", color: "#999", marginTop: 30 },
    errorText: { textAlign: "center", color: "#EF4444", marginTop: 16 },

    fab: {
        position: "absolute",
        bottom: 30,
        right: 20,
        backgroundColor: COLORS.primary600,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 30,
        flexDirection: "row",
        alignItems: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 1000,
    },
    fabLabel: { color: "white", fontWeight: "bold", marginLeft: 8, fontSize: 15 },
});
