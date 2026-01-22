import React, { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    StatusBar,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/theme";

import { getNotifications, pickArray } from "../services/notificationService";

const typeLabel = (t) => {
    if (t === "medication_reminder") return "Nhắc uống thuốc";
    if (t === "system") return "Hệ thống";
    return t || "Thông báo";
};

const statusLabel = (s) => {
    if (s === "pending") return "Chờ gửi";
    if (s === "sent") return "Đã gửi";
    if (s === "failed") return "Thất bại";
    return s || "—";
};

export default function NotificationsScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const profileId = route.params?.profileId; // optional (lọc theo profile)

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");

    // filter local (UI) – bạn có thể mở rộng sau
    const [type, setType] = useState("");    // "", "medication_reminder", ...
    const [status, setStatus] = useState(""); // "", "sent", "failed", ...

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setErr("");

            const res = await getNotifications({
                profile_id: profileId,
                type: type || undefined,
                status: status || undefined,
                limit: 50,
                offset: 0,
            });

            setItems(pickArray(res));
        } catch (e) {
            console.log("getNotifications error:", e);
            setItems([]);
            setErr(e?.message || "Không thể tải lịch sử thông báo.");
        } finally {
            setLoading(false);
        }
    }, [profileId, type, status]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const filters = useMemo(() => {
        return [
            { key: "all", label: "Tất cả", onPress: () => { setType(""); setStatus(""); } },
            { key: "med", label: "Nhắc thuốc", onPress: () => { setType("medication_reminder"); setStatus(""); } },
            { key: "sent", label: "Đã gửi", onPress: () => { setType(""); setStatus("sent"); } },
            { key: "failed", label: "Thất bại", onPress: () => { setType(""); setStatus("failed"); } },
        ];
    }, []);

    const renderItem = (n) => {
        const title =
            n?.title ||
            n?.payload?.title ||
            typeLabel(n?.type);

        const body =
            n?.body ||
            n?.message ||
            n?.payload?.body ||
            n?.payload?.text ||
            "";

        const createdAt = n?.created_at || n?.createdAt;
        const timeText = createdAt ? new Date(createdAt).toLocaleString("vi-VN") : "";

        const badgeBg = n?.status === "sent" ? "#DCFCE7" : n?.status === "failed" ? "#FEE2E2" : "#EFF6FF";
        const badgeColor = n?.status === "sent" ? "#16A34A" : n?.status === "failed" ? "#EF4444" : COLORS.primary600;

        return (
            <View key={n?.id || `${title}-${timeText}`} style={styles.card}>
                <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
                        {!!timeText && <Text style={styles.cardTime}>{timeText}</Text>}
                    </View>

                    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.badgeText, { color: badgeColor }]}>{statusLabel(n?.status)}</Text>
                    </View>
                </View>

                {!!body && <Text style={styles.cardBody} numberOfLines={3}>{body}</Text>}

                <View style={styles.metaRow}>
                    <Ionicons name="pricetag-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{typeLabel(n?.type)}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                    <Text style={styles.backText}>Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Thông báo</Text>

                <TouchableOpacity onPress={loadData} style={styles.headerIconBtn} disabled={loading}>
                    <Feather name="refresh-cw" size={18} color={COLORS.primary600} />
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
                {filters.map((f) => (
                    <TouchableOpacity key={f.key} onPress={f.onPress} style={styles.filterChip} activeOpacity={0.85}>
                        <Text style={styles.filterText}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary600} />
                </View>
            ) : err ? (
                <View style={[styles.center, { paddingHorizontal: 16 }]}>
                    <Text style={styles.errorText}>{err}</Text>
                    <TouchableOpacity onPress={loadData} style={{ marginTop: 10 }}>
                        <Text style={{ color: COLORS.primary600, fontWeight: "700" }}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    {items.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="notifications-off-outline" size={20} color="#6B7280" />
                            <Text style={styles.emptyText}>
                                Chưa có thông báo nào.
                            </Text>
                        </View>
                    ) : (
                        items.map(renderItem)
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    header: {
        height: 56,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    backBtn: { flexDirection: "row", alignItems: "center" },
    backText: { color: COLORS.primary600, fontSize: 16, marginLeft: 4 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    headerIconBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "#F3F4F6",
        justifyContent: "center", alignItems: "center",
    },

    filterBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    filterText: { fontSize: 12, fontWeight: "700", color: "#111827" },

    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 12,
    },
    rowTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
    cardTime: { marginTop: 4, fontSize: 12, color: "#6B7280" },
    cardBody: { marginTop: 10, fontSize: 13, color: "#374151", lineHeight: 18 },

    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    badgeText: { fontSize: 10, fontWeight: "800" },

    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6 },
    metaText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

    emptyBox: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
        gap: 8,
    },
    emptyText: { color: "#6B7280", fontWeight: "600" },
    errorText: { color: "#EF4444", fontWeight: "700", textAlign: "center" },
});
