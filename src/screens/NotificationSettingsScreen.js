// src/screens/NotificationSettingsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Alert,
    TextInput,
    Switch,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

import {
    getNotificationPreferences,
    upsertNotificationPreference,
    pickArray,
    pickObject,
} from "../services/notificationPreferenceService";

const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

const isValidHHmm = (value) => {
    // Accept "HH:mm" (00-23):(00-59)
    if (!value) return true; // allow empty -> nghĩa là không set quiet hours
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    return !!m;
};

const normalizeHHmm = (value) => (value || "").trim();

export default function NotificationSettingsScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();

    // nếu bạn muốn cấu hình theo hồ sơ: truyền profileId + profileName
    const profileId = route.params?.profileId ?? null;
    const profileName = route.params?.profileName ?? "Hồ sơ";

    // mode: global | profile
    const [mode, setMode] = useState(profileId ? "profile" : "global");

    const queryProfileId = useMemo(() => {
        if (mode === "profile") return profileId;
        return undefined;
    }, [mode, profileId]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [allowPush, setAllowPush] = useState(true);
    const [allowEmail, setAllowEmail] = useState(false);
    const [quietStart, setQuietStart] = useState(""); // "HH:mm"
    const [quietEnd, setQuietEnd] = useState("");     // "HH:mm"
    const [timezone, setTimezone] = useState(DEFAULT_TZ);

    const loadPrefs = useCallback(async () => {
        try {
            setLoading(true);

            const res = await getNotificationPreferences({ profile_id: queryProfileId });
            // API contract của bạn ghi Res: [{notification_preference}]
            const arr = pickArray(res);
            // thường backend trả 0 hoặc 1 bản ghi cho mỗi scope
            const first = arr?.[0] ?? null;
            const pref = pickObject(first);

            // nếu chưa có pref => set default
            setAllowPush(pref?.allow_push ?? true);
            setAllowEmail(pref?.allow_email ?? false);
            setQuietStart(pref?.quiet_hours_start ?? "");
            setQuietEnd(pref?.quiet_hours_end ?? "");
            setTimezone(pref?.timezone ?? DEFAULT_TZ);
        } catch (e) {
            console.log("getNotificationPreferences error:", e);
            Alert.alert("Lỗi", e?.message || "Không thể tải cài đặt thông báo.");
        } finally {
            setLoading(false);
        }
    }, [queryProfileId]);

    useEffect(() => {
        loadPrefs();
    }, [loadPrefs]);

    const onSave = async () => {
        const qs = normalizeHHmm(quietStart);
        const qe = normalizeHHmm(quietEnd);

        if (!isValidHHmm(qs) || !isValidHHmm(qe)) {
            Alert.alert("Sai định dạng", "Quiet hours phải theo dạng HH:mm (ví dụ 22:30).");
            return;
        }

        // Nếu user nhập 1 đầu mà bỏ 1 đầu -> cảnh báo nhẹ
        if ((!!qs && !qe) || (!qs && !!qe)) {
            Alert.alert("Thiếu thông tin", "Bạn cần nhập cả giờ bắt đầu và giờ kết thúc quiet hours.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...(mode === "profile" ? { profile_id: profileId } : {}),
                allow_push: !!allowPush,
                allow_email: !!allowEmail,
                ...(qs ? { quiet_hours_start: qs } : { quiet_hours_start: "" }),
                ...(qe ? { quiet_hours_end: qe } : { quiet_hours_end: "" }),
                timezone: timezone || DEFAULT_TZ,
            };

            await upsertNotificationPreference(payload);

            Alert.alert("Thành công", "Đã lưu cài đặt thông báo.");
            await loadPrefs();
        } catch (e) {
            Alert.alert("Lỗi", e?.message || "Không thể lưu cài đặt.");
        } finally {
            setSaving(false);
        }
    };

    const titleScope =
        mode === "profile"
            ? `Theo hồ sơ: ${profileName}`
            : "Toàn bộ tài khoản";

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header đồng bộ style */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                    <Text style={styles.backText}>Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Cài đặt thông báo</Text>

                <TouchableOpacity onPress={loadPrefs} style={styles.iconBtn} activeOpacity={0.7}>
                    <Feather name="refresh-cw" size={18} color={COLORS.primary600} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary600} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Card: scope (global/profile) */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Phạm vi áp dụng</Text>

                        {!profileId ? (
                            <View style={styles.pillInfo}>
                                <Text style={styles.pillInfoText}>Ứng dụng cho toàn bộ tài khoản</Text>
                            </View>
                        ) : (
                            <View style={styles.segment}>
                                <TouchableOpacity
                                    style={[styles.segmentBtn, mode === "global" && styles.segmentBtnActive]}
                                    onPress={() => setMode("global")}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.segmentText, mode === "global" && styles.segmentTextActive]}>
                                        Tài khoản
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.segmentBtn, mode === "profile" && styles.segmentBtnActive]}
                                    onPress={() => setMode("profile")}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.segmentText, mode === "profile" && styles.segmentTextActive]}>
                                        Hồ sơ
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.scopeNote}>{titleScope}</Text>
                    </View>

                    {/* Card: toggles */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Kênh thông báo</Text>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowLabel}>Bật thông báo đẩy (Push)</Text>
                                <Text style={styles.rowHint}>Nhắc uống thuốc, thông báo hệ thống</Text>
                            </View>
                            <Switch
                                value={allowPush}
                                onValueChange={setAllowPush}
                                trackColor={{ false: "#E5E7EB", true: "#BFDBFE" }}
                                thumbColor={allowPush ? COLORS.primary600 : "#9CA3AF"}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowLabel}>Bật Email</Text>
                                <Text style={styles.rowHint}>Nhận báo cáo hoặc thông báo tổng hợp</Text>
                            </View>
                            <Switch
                                value={allowEmail}
                                onValueChange={setAllowEmail}
                                trackColor={{ false: "#E5E7EB", true: "#BFDBFE" }}
                                thumbColor={allowEmail ? COLORS.primary600 : "#9CA3AF"}
                            />
                        </View>
                    </View>

                    {/* Card: Quiet hours */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Giờ yên lặng (Quiet hours)</Text>
                        <Text style={styles.cardDesc}>
                            Trong khoảng giờ này, backend/worker nên tôn trọng và không gửi thông báo.
                        </Text>

                        <View style={styles.timeRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Bắt đầu</Text>
                                <TextInput
                                    value={quietStart}
                                    onChangeText={setQuietStart}
                                    placeholder="22:00"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.timeInput}
                                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                                />
                            </View>

                            <View style={{ width: 12 }} />

                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Kết thúc</Text>
                                <TextInput
                                    value={quietEnd}
                                    onChangeText={setQuietEnd}
                                    placeholder="06:30"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.timeInput}
                                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setQuietStart("");
                                setQuietEnd("");
                            }}
                            style={styles.linkBtn}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.linkText}>Tắt quiet hours</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Card: timezone */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Timezone</Text>
                        <Text style={styles.cardDesc}>Dùng để tính giờ nhắc chính xác.</Text>

                        <TextInput
                            value={timezone}
                            onChangeText={setTimezone}
                            placeholder={DEFAULT_TZ}
                            placeholderTextColor="#9CA3AF"
                            style={styles.textInput}
                            autoCapitalize="none"
                        />

                        <TouchableOpacity
                            onPress={() => setTimezone(DEFAULT_TZ)}
                            style={styles.linkBtn}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.linkText}>Dùng Asia/Ho_Chi_Minh</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Save button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={onSave}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Feather name="save" size={18} color="white" />
                                <Text style={styles.saveText}>Lưu cài đặt</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 32 }} />
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
        paddingHorizontal: 16,
        justifyContent: "space-between",
    },
    backBtn: { flexDirection: "row", alignItems: "center" },
    backText: { color: COLORS.primary600, fontSize: 16, marginLeft: 4 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },

    scroll: { padding: 16, gap: 14 },

    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
    cardDesc: { marginTop: 6, fontSize: 12, color: "#6B7280", lineHeight: 16 },

    pillInfo: {
        marginTop: 12,
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    pillInfoText: { color: "#1E40AF", fontWeight: "600" },

    segment: {
        marginTop: 12,
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        padding: 4,
        gap: 6,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    segmentBtnActive: { backgroundColor: "white" },
    segmentText: { color: "#6B7280", fontWeight: "700" },
    segmentTextActive: { color: COLORS.primary600 },

    scopeNote: { marginTop: 10, fontSize: 12, color: "#6B7280" },

    row: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 12 },
    rowLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
    rowHint: { marginTop: 4, fontSize: 12, color: "#6B7280" },
    divider: { height: 1, backgroundColor: "#F3F4F6", marginTop: 14 },

    timeRow: { flexDirection: "row", marginTop: 12 },
    inputLabel: { fontSize: 12, color: "#6B7280", marginBottom: 6, fontWeight: "600" },
    timeInput: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 12,
        fontSize: 15,
        color: "#111827",
    },

    textInput: {
        marginTop: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 12,
        fontSize: 15,
        color: "#111827",
    },

    linkBtn: { marginTop: 10, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 4 },
    linkText: { color: COLORS.primary600, fontWeight: "700" },

    saveBtn: {
        marginTop: 4,
        height: 52,
        borderRadius: 14,
        backgroundColor: COLORS.primary600,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: COLORS.primary600,
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 4,
    },
    saveText: { color: "white", fontSize: 16, fontWeight: "800" },
});
