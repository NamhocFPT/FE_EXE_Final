import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/theme";

import { getNotifications, pickArray } from "../services/notificationService";

// Format timestamp to DD/MM/YYYY, HH:mm (GMT+7)
const formatSentAt = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
};

const ITEMS_PER_PAGE = 10;

export default function NotificationsScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState([]);
    const [err, setErr] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const loadData = useCallback(async (page = 1, isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setErr("");

            const offset = (page - 1) * ITEMS_PER_PAGE;

            const res = await getNotifications({
                limit: ITEMS_PER_PAGE,
                offset,
            });

            // Parse response - try different structure possibilities
            let newItems = [];
            let paginationInfo = {};

            // Case 1: res.data is the response object { data: [...], pagination: {...} }
            if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
                if (Array.isArray(res.data.data)) {
                    newItems = res.data.data;
                    paginationInfo = res.data.pagination || {};
                }
            }
            
            // Case 2: res itself is the response object
            if (newItems.length === 0 && res && typeof res === 'object') {
                if (Array.isArray(res.data)) {
                    newItems = res.data;
                    paginationInfo = res.pagination || {};
                }
            }

            // Case 3: res.data is array directly
            if (newItems.length === 0 && Array.isArray(res?.data)) {
                newItems = res.data;
                paginationInfo = res.pagination || {};
            }

            setItems(newItems);
            setCurrentPage(page);
            setTotalItems(paginationInfo.total || 0);
            setTotalPages(Math.ceil((paginationInfo.total || 0) / ITEMS_PER_PAGE));
        } catch (e) {
            console.log("❌ getNotifications error:", e);
            setItems([]);
            setErr(e?.message || "Không thể tải lịch sử thông báo.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData(1);
        }, [loadData])
    );

    const handleRefresh = () => {
        loadData(currentPage, true);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            loadData(page);
        }
    };

    const renderNotificationCard = ({ item: n }) => {
        const title = n?.payload?.title || "Thông báo";
        const sender = n?.profile?.full_name || "Hệ thống";
        const content = n?.payload?.body || "";
        const sentAt = formatSentAt(n?.sent_at);
        const isMedicationReminder = n?.type === "medication_reminder";

        return (
            <View
                style={[
                    styles.card,
                    isMedicationReminder && styles.cardMedication,
                ]}
            >
                <View style={styles.cardContent}>
                    {/* Icon */}
                    <View
                        style={[
                            styles.iconContainer,
                            isMedicationReminder && styles.iconContainerMedication,
                        ]}
                    >
                        <Ionicons
                            name={isMedicationReminder ? "medical" : "notifications"}
                            size={22}
                            color={isMedicationReminder ? "#10B981" : COLORS.primary600}
                        />
                    </View>

                    {/* Content */}
                    <View style={styles.textContainer}>
                        {/* Badge for medication reminder */}
                        {isMedicationReminder && (
                            <View style={styles.medicationBadge}>
                                <Ionicons name="alarm" size={12} color="#10B981" />
                                <Text style={styles.medicationBadgeText}>Nhắc uống thuốc</Text>
                            </View>
                        )}

                        {/* Title */}
                        <Text
                            style={[
                                styles.cardTitle,
                                isMedicationReminder && styles.cardTitleMedication,
                            ]}
                            numberOfLines={2}
                        >
                            {title}
                        </Text>

                        {/* Sender */}
                        <Text style={styles.cardSender}>Của hồ sơ: {sender}</Text>

                        {/* Body */}
                        {!!content && (
                            <Text style={styles.cardBody} numberOfLines={3}>
                                {content}
                            </Text>
                        )}

                        {/* Sent At */}
                        {!!sentAt && (
                            <View style={styles.timeRow}>
                                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                <Text style={styles.cardTime}>{sentAt}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderPaginationControls = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 3;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <View style={styles.paginationContainer}>
                {/* <View style={styles.paginationInfo}>
                    <Text style={styles.paginationText}>
                        Trang {currentPage} / {totalPages} • Tổng: {totalItems} thông báo
                    </Text>
                </View> */}

                <View style={styles.paginationButtons}>
                    {/* Previous */}
                    <TouchableOpacity
                        style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                        onPress={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={18}
                            color={currentPage === 1 ? "#CBD5E1" : COLORS.primary600}
                        />
                    </TouchableOpacity>

                    {/* First page */}
                    {startPage > 1 && (
                        <>
                            <TouchableOpacity
                                style={styles.pageBtn}
                                onPress={() => handlePageChange(1)}
                            >
                                <Text style={styles.pageBtnText}>1</Text>
                            </TouchableOpacity>
                            {startPage > 2 && <Text style={styles.pageDots}>...</Text>}
                        </>
                    )}

                    {/* Page numbers */}
                    {pages.map((page) => (
                        <TouchableOpacity
                            key={page}
                            style={[
                                styles.pageBtn,
                                currentPage === page && styles.pageBtnActive,
                            ]}
                            onPress={() => handlePageChange(page)}
                        >
                            <Text
                                style={[
                                    styles.pageBtnText,
                                    currentPage === page && styles.pageBtnTextActive,
                                ]}
                            >
                                {page}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Last page */}
                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <Text style={styles.pageDots}>...</Text>}
                            <TouchableOpacity
                                style={styles.pageBtn}
                                onPress={() => handlePageChange(totalPages)}
                            >
                                <Text style={styles.pageBtnText}>{totalPages}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Next */}
                    <TouchableOpacity
                        style={[
                            styles.pageBtn,
                            currentPage === totalPages && styles.pageBtnDisabled,
                        ]}
                        onPress={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={currentPage === totalPages ? "#CBD5E1" : COLORS.primary600}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyBox}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
                <Text style={styles.emptySubtitle}>
                    Các thông báo quan trọng sẽ xuất hiện ở đây
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                    <Text style={styles.backText}>Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Thông báo</Text>

                <TouchableOpacity
                    onPress={handleRefresh}
                    style={styles.headerIconBtn}
                    disabled={loading || refreshing}
                >
                    <Ionicons name="refresh" size={20} color={COLORS.primary600} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading && currentPage === 1 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary600} />
                    <Text style={styles.loadingText}>Đang tải thông báo...</Text>
                </View>
            ) : err && items.length === 0 ? (
                <View style={[styles.center, { paddingHorizontal: 16 }]}>
                    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                    <Text style={styles.errorText}>{err}</Text>
                    <TouchableOpacity
                        onPress={() => loadData(1)}
                        style={styles.retryBtn}
                    >
                        <Text style={styles.retryBtnText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[COLORS.primary600]}
                                tintColor={COLORS.primary600}
                            />
                        }
                    >
                        {items.length === 0 ? (
                            renderEmpty()
                        ) : (
                            items.map((item) => (
                                <View key={item?.id || String(Math.random())}>
                                    {renderNotificationCard({ item })}
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* Pagination Controls */}
                    {renderPaginationControls()}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },

    header: {
        height: 60,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { color: COLORS.primary600, fontSize: 16, fontWeight: "600" },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },

    listContent: { padding: 16, paddingBottom: 24 },

    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },

    cardMedication: {
        // Removed border and background - keep card clean
    },

    cardContent: {
        flexDirection: "row",
        gap: 12,
    },

    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },

    iconContainerMedication: {
        backgroundColor: "#D1FAE5",
    },

    textContainer: {
        flex: 1,
        gap: 6,
    },

    medicationBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 4,
    },

    medicationBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#10B981",
        textTransform: "uppercase",
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        lineHeight: 22,
    },

    cardTitleMedication: {
        color: "#059669",
    },

    cardSender: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6366F1",
        lineHeight: 18,
    },

    cardBody: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
        marginTop: 2,
    },

    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },

    cardTime: {
        fontSize: 12,
        color: "#94A3B8",
        fontWeight: "500",
    },

    footerLoader: {
        paddingVertical: 20,
        alignItems: "center",
        gap: 8,
    },

    footerText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },

    emptyBox: {
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 32,
    },

    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#475569",
        marginBottom: 8,
    },

    emptySubtitle: {
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
        lineHeight: 20,
    },

    loadingText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },

    errorText: {
        color: "#EF4444",
        fontWeight: "700",
        textAlign: "center",
        fontSize: 16,
        marginTop: 12,
        marginBottom: 16,
    },

    retryBtn: {
        backgroundColor: COLORS.primary600,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },

    retryBtnText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },

    // Pagination styles
    paginationContainer: {
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingVertical: 16,
        paddingHorizontal: 16,
    },

    paginationInfo: {
        alignItems: "center",
        marginBottom: 12,
    },

    paginationText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },

    paginationButtons: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },

    pageBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },

    pageBtnActive: {
        backgroundColor: COLORS.primary600,
        borderColor: COLORS.primary600,
    },

    pageBtnDisabled: {
        opacity: 0.3,
    },

    pageBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },

    pageBtnTextActive: {
        color: "white",
    },

    pageDots: {
        fontSize: 14,
        color: "#94A3B8",
        paddingHorizontal: 4,
    },

    scrollContent: { padding: 16, paddingBottom: 24 },
});
