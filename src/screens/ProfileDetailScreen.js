import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StatusBar,
    Alert, // Thêm Alert cho UC-MR6
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

// ✅ Import các service cần thiết
import {
    getProfilePrescriptions,
    getProfileActiveRegimens,
} from "../services/profileService";
// import { updateMedicationRegimen } from "../services/prescriptionService"; // Giả định service update

export default function ProfileDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();

    /* =======================
        PARAMS SAFETY
    ======================= */
    const profile = route.params?.profile ?? null;
    const isOwner = route.params?.isOwner ?? false;

    const profileId = useMemo(() => {
        if (!profile?.id || typeof profile.id === "object") return null;
        return profile.id;
    }, [profile]);

    /* =======================
        STATE
    ====================== */
    const [activeTab, setActiveTab] = useState("prescriptions");
    const [prescriptions, setPrescriptions] = useState([]);
    const [activeRegimens, setActiveRegimens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* =======================
        HANDLERS
    ======================= */
    
    // UC-MR6: Dừng một regimen
    const handleStopRegimen = (regimenId) => {
        Alert.alert(
            "Dừng nhắc thuốc",
            "Bạn có chắc chắn muốn dừng kế hoạch uống thuốc này không? Hành động này không thể hoàn tác.",
            [
                { text: "Hủy", style: "cancel" },
                { 
                    text: "Xác nhận dừng", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Gọi API set is_active = false
                            // await updateMedicationRegimen(regimenId, { is_active: false });
                            
                            // Cập nhật local state để UI mất thuốc đó ngay
                            setActiveRegimens(prev => prev.filter(r => r.id !== regimenId));
                            Alert.alert("Thành công", "Đã dừng nhắc nhở thuốc.");
                        } catch (err) {
                            Alert.alert("Lỗi", "Không thể dừng phác đồ. Vui lòng thử lại.");
                        }
                    }
                }
            ]
        );
    };

    /* =======================
        LOAD DATA (UC-MR3)
    ======================= */
    useEffect(() => {
        if (!profileId) {
            setLoading(false);
            setError("ID hồ sơ không hợp lệ.");
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load song song cả đơn thuốc và các phác đồ đang uống
                const [presData, regData] = await Promise.all([
                    getProfilePrescriptions(profileId),
                    getProfileActiveRegimens(profileId)
                ]);

                setPrescriptions(presData || []);
                setActiveRegimens(regData || []);
            } catch (err) {
                console.error("❌ Load profile detail error:", err);
                setError("Không thể tải dữ liệu hồ sơ.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [profileId]);

    /* =======================
        RENDER HELPERS
    ======================= */

    // Render danh sách Regimens (UC-MR3, UC-MR4, UC-MR6)
    const renderRegimenCard = (regimen) => (
        <TouchableOpacity 
            key={regimen.id} 
            style={styles.presCard}
            onPress={() => navigation.navigate("RegimenDetail", { regimen })} // UC-MR4
        >
            <View style={styles.presHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.presName}>{regimen.display_name || "Thuốc không tên"}</Text>
                    <Text style={styles.regimenDetail}>
                        {regimen.dose_amount} {regimen.dose_unit} • {regimen.schedule_type}
                    </Text>
                    <View style={styles.timeTagRow}>
                        <Ionicons name="time-outline" size={14} color={COLORS.primary600} />
                        <Text style={styles.regimenTime}>
                            {regimen.schedule_payload?.times?.join(", ") || "Chưa đặt giờ"}
                        </Text>
                    </View>
                </View>
                
                {regimen.is_active && (
                    <TouchableOpacity 
                        style={styles.stopButton} 
                        onPress={() => handleStopRegimen(regimen.id)}
                    >
                        <Text style={styles.stopButtonText}>Dừng</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    if (!profile) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>Không tìm thấy thông tin hồ sơ.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backLink}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    /* =======================
        MAIN RENDER
    ======================= */
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {isOwner && (
                        <TouchableOpacity onPress={() => navigation.navigate("ShareProfile", { profile })}>
                            <Ionicons name="share-social-outline" size={24} color={COLORS.primary600} />
                        </TouchableOpacity>
                    )}
                    {isOwner && (
                        <TouchableOpacity onPress={() => navigation.navigate("Profiles", { editingProfile: profile })}>
                            <Ionicons name="create-outline" size={24} color={COLORS.primary600} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* HERO AREA */}
                <View style={styles.hero}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarText}>
                            {(profile.full_name || profile.name || "P").charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.nameText}>{profile.full_name || profile.name}</Text>
                    <Text style={styles.subText}>
                        {profile.relationship_to_owner || "Cá nhân"} • {profile.sex === "female" ? "Nữ" : "Nam"}
                    </Text>
                </View>

                {/* HEALTH NOTES */}
                <View style={styles.section}>
                    <View style={styles.notesCard}>
                        <View style={styles.notesHeader}>
                            <Ionicons name="medical" size={18} color={COLORS.primary600} />
                            <Text style={styles.notesTitle}>Ghi chú sức khỏe</Text>
                        </View>
                        <Text style={styles.notesText}>{profile.notes || "Không có ghi chú bệnh lý."}</Text>
                    </View>
                </View>

                {/* TAB BAR */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === "prescriptions" && styles.tabActive]}
                        onPress={() => setActiveTab("prescriptions")}
                    >
                        <Text style={[styles.tabLabel, activeTab === "prescriptions" && styles.tabLabelActive]}>Đơn thuốc</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === "meds" && styles.tabActive]}
                        onPress={() => setActiveTab("meds")}
                    >
                        <Text style={[styles.tabLabel, activeTab === "meds" && styles.tabLabelActive]}>Đang uống</Text>
                    </TouchableOpacity>
                </View>

                {/* CONTENT LIST */}
                <View style={styles.content}>
                    {loading && <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 20 }} />}
                    {!loading && error && <Text style={styles.errorText}>{error}</Text>}

                    {/* Tab 1: Đơn thuốc */}
                    {!loading && !error && activeTab === "prescriptions" && (
                        prescriptions.length > 0 ? (
                            prescriptions.map((item) => (
                                <View key={item.id} style={styles.presCard}>
                                    <View style={styles.presHeader}>
                                        <Text style={styles.presName}>{item.prescription_name || "Đơn thuốc"}</Text>
                                        <View style={[styles.statusBadge, item.status === "active" ? styles.statusActive : styles.statusDone]}>
                                            <Text style={[styles.statusText, item.status === "active" ? styles.statusTextActive : styles.statusTextDone]}>
                                                {item.status === "active" ? "Đang điều trị" : "Hoàn thành"}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.presDiagnosis}>{item.diagnosis}</Text>
                                    <Text style={styles.presMeta}>{item.doctor_name} • {item.clinic_name}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>Chưa có đơn thuốc nào.</Text>
                        )
                    )}

                    {/* Tab 2: Kế hoạch uống thuốc (UC-MR3) */}
                    {!loading && !error && activeTab === "meds" && (
                        activeRegimens.length > 0 ? (
                            activeRegimens.map(renderRegimenCard)
                        ) : (
                            <Text style={styles.emptyText}>Chưa có thuốc nào đang sử dụng.</Text>
                        )
                    )}
                </View>

                {/* Khoảng trống để không bị FAB che */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* NÚT FAB: THÊM THUỐC TỰ DO (UC-MR2) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate("AddManualMedication", {
                    isManualAdd: true,
                    profile: profile 
                })}
            >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.fabLabel}>Thêm thuốc tự do</Text>
            </TouchableOpacity>
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
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.primary600,
        justifyContent: "center", alignItems: "center",
    },
    avatarText: { color: "white", fontSize: 32, fontWeight: "bold" },
    nameText: { fontSize: 22, fontWeight: "bold", marginTop: 12, color: COLORS.text900 },
    subText: { color: "#666", marginTop: 4 },

    section: { padding: 16 },
    notesCard: {
        backgroundColor: "#EBF2FF", padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: "#D0E1FF",
    },
    notesHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    notesTitle: { fontWeight: "bold", color: COLORS.primary600, marginLeft: 8 },
    notesText: { color: "#444", lineHeight: 20, fontSize: 14 },

    tabBar: { flexDirection: "row", backgroundColor: "white", borderBottomWidth: 1, borderColor: "#EEE" },
    tabItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
    tabActive: { borderBottomWidth: 2, borderColor: COLORS.primary600 },
    tabLabel: { fontSize: 14, fontWeight: "600", color: "#888" },
    tabLabelActive: { color: COLORS.primary600 },

    content: { padding: 16 },

    presCard: {
        backgroundColor: "white", padding: 16, borderRadius: 16,
        marginBottom: 12, elevation: 2, shadowColor: "#000",
        shadowOpacity: 0.05, shadowRadius: 5,
    },
    presHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    presName: { fontSize: 16, fontWeight: "bold", color: COLORS.text900, flex: 1, marginRight: 8 },
    
    // Regimen Styles
    regimenDetail: { fontSize: 14, color: "#4B5563", marginTop: 4 },
    timeTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
    regimenTime: { fontSize: 13, color: COLORS.primary600, fontWeight: '600' },
    
    stopButton: {
        backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1, borderColor: "#FECACA",
    },
    stopButtonText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusActive: { backgroundColor: "#DCFCE7" },
    statusDone: { backgroundColor: "#F3F4F6" },
    statusText: { fontSize: 10 },
    statusTextActive: { color: "#16A34A" },
    statusTextDone: { color: "#6B7280" },

    presDiagnosis: { fontSize: 14, color: "#4B5563", marginTop: 4 },
    presMeta: { fontSize: 13, color: "#6B7280", marginTop: 8 },

    emptyText: { textAlign: "center", color: "#999", marginTop: 40 },
    errorText: { textAlign: "center", color: "red", marginTop: 20 },

    // Floating Action Button
    fab: {
        position: "absolute",
        bottom: 30, right: 20,
        backgroundColor: COLORS.primary600,
        paddingHorizontal: 20, paddingVertical: 14,
        borderRadius: 30, flexDirection: "row",
        alignItems: "center", elevation: 8,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 4,
        zIndex: 1000,
    },
    fabLabel: { color: "white", fontWeight: "bold", marginLeft: 8, fontSize: 15 },
});