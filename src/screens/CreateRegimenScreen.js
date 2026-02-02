import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator,
    Modal,
    FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";

import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";

import { getProfiles } from "../services/profileService";
import { createRegimen } from "../services/regimenService";
import { getDrugProducts } from "../services/drugProductService";

/* ===== Helpers ===== */
const pickArray = (res) => {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
};

const toYMD = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const pad2 = (n) => String(n).padStart(2, "0");
const toHHmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

// list timezone gọn – đủ dùng + dễ search (bạn có thể mở rộng thêm)
const TIMEZONES = [
    "Asia/Ho_Chi_Minh",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Kuala_Lumpur",
    "Asia/Jakarta",
    "Asia/Manila",
    "Asia/Seoul",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Taipei",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
];

const DAYS = [
    { key: 1, label: "T2" },
    { key: 2, label: "T3" },
    { key: 3, label: "T4" },
    { key: 4, label: "T5" },
    { key: 5, label: "T6" },
    { key: 6, label: "T7" },
    { key: 7, label: "CN" },
];
const DOSE_UNITS = [
    { value: "tablet", label: "Viên" },
    { value: "capsule", label: "Nang" },
    { value: "pack", label: "Gói" },
    { value: "sachet", label: "Gói (sachet)" },
    { value: "bottle", label: "Chai" },
    { value: "ampoule", label: "Ống" },
    { value: "vial", label: "Lọ" },
    { value: "ml", label: "ml" },
    { value: "mg", label: "mg" },
    { value: "g", label: "g" },
    { value: "drop", label: "Giọt" },
];


export default function CreateRegimenScreen({ navigation, route }) {
    const presetProfileId = route?.params?.profileId || null;

    /* ===== Profiles ===== */
    const [profiles, setProfiles] = useState([]);
    const [selectedProfileId, setSelectedProfileId] = useState(presetProfileId);
    const [profilesLoading, setProfilesLoading] = useState(true);

    /* ===== Form (UX labels) ===== */
    const [planName, setPlanName] = useState(""); // display_name
    const [selectedDrug, setSelectedDrug] = useState(null); // {id, name,...}
    const [drugQuery, setDrugQuery] = useState("");
    const [drugLoading, setDrugLoading] = useState(false);
    const [drugSuggestions, setDrugSuggestions] = useState([]);
    const [drugDropdownOpen, setDrugDropdownOpen] = useState(false);

    const [linkFromPrescriptionItemId, setLinkFromPrescriptionItemId] = useState(""); // optional (ẩn db name ở label)

    const [dailyDose, setDailyDose] = useState(""); // total_daily_dose optional
    const [doseUnit, setDoseUnit] = useState("tablet"); // dose_unit optional

    const [startDate, setStartDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);

    const [durationDays, setDurationDays] = useState("7"); // duration_days optional

    const [timezone, setTimezone] = useState(Localization.timezone || DEFAULT_TZ);
    const [tzModalOpen, setTzModalOpen] = useState(false);
    const [tzSearch, setTzSearch] = useState("");

    /* ===== Schedule =====
       - fixed_times: times[] (mỗi ngày)
       - interval_hours: interval_hours + start_time
       - custom: times[] + days_of_week[]
    */
    const [scheduleType, setScheduleType] = useState("fixed_times");

    const [times, setTimes] = useState(["08:00"]);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [intervalHours, setIntervalHours] = useState("8");
    const [intervalStartTime, setIntervalStartTime] = useState("08:00");
    const [showIntervalStartPicker, setShowIntervalStartPicker] = useState(false);

    const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]); // mặc định T2-T6 cho custom

    const [submitting, setSubmitting] = useState(false);
    const [doseUnitModalOpen, setDoseUnitModalOpen] = useState(false);
    const getDrugId = (d) => d?.id || d?.drug_product?.id || d?.drug_product_id;

    const doseUnitLabel = useMemo(() => {
        const found = DOSE_UNITS.find((u) => u.value === doseUnit);
        return found?.label || "Chọn đơn vị";
    }, [doseUnit]);

    /* ===== Load profiles ===== */
    const loadProfiles = useCallback(async () => {
        setProfilesLoading(true);
        try {
            const res = await getProfiles();
            const list = pickArray(res);
            setProfiles(list);

            if (!presetProfileId && list.length > 0) {
                const self = list.find((p) => p?.relationship_to_owner === "self");
                setSelectedProfileId(self?.id || list[0]?.id || null);
            }
        } catch (e) {
            console.log("loadProfiles error:", e?.message || e);
            Alert.alert("Lỗi", "Không tải được danh sách hồ sơ.");
            setProfiles([]);
            setSelectedProfileId(null);
        } finally {
            setProfilesLoading(false);
        }
    }, [presetProfileId]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    /* ===== Drug search (debounce + suggestions) ===== */
    const drugTimerRef = useRef(null);
    const lastDrugQueryRef = useRef("");

    useEffect(() => {
        // khi user đã chọn thuốc, không auto search nữa nếu query trùng tên đã chọn
        const q = drugQuery.trim();

        // đóng dropdown nếu rỗng
        if (!q) {
            setDrugSuggestions([]);
            setDrugDropdownOpen(false);
            return;
        }

        // debounce
        if (drugTimerRef.current) clearTimeout(drugTimerRef.current);

        drugTimerRef.current = setTimeout(async () => {
            try {
                lastDrugQueryRef.current = q;
                setDrugLoading(true);

                const res = await getDrugProducts({ q, limit: 10, offset: 0 });
                const list = pickArray(res);

                // nếu query đã đổi trong lúc request -> bỏ
                if (lastDrugQueryRef.current !== q) return;

                setDrugSuggestions(list);
                setDrugDropdownOpen(true);
            } catch (e) {
                console.log("getDrugProducts error:", e?.message || e);
                setDrugSuggestions([]);
                setDrugDropdownOpen(false);
            } finally {
                setDrugLoading(false);
            }
        }, 300);

        return () => drugTimerRef.current && clearTimeout(drugTimerRef.current);
    }, [drugQuery]);

    const drugDisplayName = (d) =>
        d?.drug_product.brand_name ||
        d?.drug_product.display_name ||
        d?.drug_product.name ||
        d?.drug_product.trade_name ||
        d?.drug_product.generic_name ||
        "Thuốc";

    const drugSubtitle = (d) => {

        const subs = Array.isArray(d?.substances) ? d.substances : [];
        const subText =
            subs.length > 0
                ? subs
                    .map((s) => s?.name || s?.substance_name)
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(", ")
                : "";
        return subText ? `Hoạt chất: ${subText}` : "";
    };
    const drugForm = (d) => {
        const form = d?.drug_product.form
        return form ? `Dạng: ${form}` : "";
    };

    const selectDrug = (item) => {
        const normalized = { ...item, id: getDrugId(item) }; // ✅ đưa id lên top-level

        setSelectedDrug(normalized);
        setDrugQuery(drugDisplayName(normalized));
        setDrugDropdownOpen(false);
        setDrugSuggestions([]);

        setPlanName((prev) => (prev.trim() ? prev : drugDisplayName(normalized)));
    };

    const clearDrug = () => {
        setSelectedDrug(null);
        setDrugQuery("");
        setDrugDropdownOpen(false);
        setDrugSuggestions([]);
    };

    /* ===== Time add/remove ===== */
    const onTimeChange = (event, selected) => {
        setShowTimePicker(false);
        if (!selected) return;

        const t = toHHmm(selected);
        setTimes((prev) => {
            if (prev.includes(t)) return prev;
            return [...prev, t].sort();
        });
    };

    const removeTime = (idx) => setTimes((prev) => prev.filter((_, i) => i !== idx));

    const toggleDay = (dayKey) => {
        setDaysOfWeek((prev) => {
            if (prev.includes(dayKey)) return prev.filter((x) => x !== dayKey);
            return [...prev, dayKey].sort();
        });
    };

    /* ===== schedule_payload derived ===== */
    const schedulePayload = useMemo(() => {
        if (scheduleType === "fixed_times") {
            return { times };
        }
        if (scheduleType === "interval_hours") {
            return {
                interval_hours: Number(intervalHours || 0) || 0,
                start_time: intervalStartTime || "08:00",
            };
        }
        // custom
        return {
            times,
            days_of_week: daysOfWeek,
        };
    }, [scheduleType, times, intervalHours, intervalStartTime, daysOfWeek]);

    /* ===== Timezone search ===== */
    const tzList = useMemo(() => {
        const q = tzSearch.trim().toLowerCase();
        const base = TIMEZONES.includes(Localization.timezone) ? TIMEZONES : [Localization.timezone, ...TIMEZONES].filter(Boolean);
        if (!q) return base;
        return base.filter((z) => z.toLowerCase().includes(q));
    }, [tzSearch]);

    /* ===== Validation ===== */
    const validate = () => {
        if (!selectedProfileId) return "Vui lòng chọn hồ sơ bệnh nhân.";
        if (!planName.trim()) return "Vui lòng nhập tên kế hoạch.";
        if (!getDrugId(selectedDrug)) return "Vui lòng chọn thuốc từ gợi ý.";

        if (String(durationDays).trim()) {
            const n = Number(durationDays);
            if (!Number.isFinite(n) || n <= 0) return "Số ngày dùng phải là số > 0.";
        }

        if (!["fixed_times", "interval_hours", "custom"].includes(scheduleType)) {
            return "Kiểu lịch nhắc không hợp lệ.";
        }

        if (!Array.isArray(times) || times.length === 0) return "Vui lòng thêm ít nhất 1 giờ nhắc.";
        if (!times.every((t) => /^\d{2}:\d{2}$/.test(t))) return "Giờ nhắc phải đúng định dạng HH:mm.";

        if (scheduleType === "interval_hours") {
            const n = Number(intervalHours);
            if (!Number.isFinite(n) || n <= 0) return "Nhắc mỗi X giờ phải là số > 0.";
            if (!/^\d{2}:\d{2}$/.test(intervalStartTime || "")) return "Giờ bắt đầu phải dạng HH:mm.";
        }

        if (scheduleType === "custom") {
            if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return "Vui lòng chọn ít nhất 1 ngày trong tuần.";
        }

        return null;
    };

    /* ===== Submit ===== */
    const handleSubmit = async () => {
        const err = validate();
        if (err) {
            Alert.alert("Thiếu thông tin", err);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                // optional link
                prescription_item_id: linkFromPrescriptionItemId.trim() || undefined,

                // required
                drug_product_id: getDrugId(selectedDrug),
                display_name: planName.trim(),

                // optional
                total_daily_dose: String(dailyDose).trim() ? Number(dailyDose) : undefined,
                dose_unit: doseUnit?.trim() || undefined,
                start_date: toYMD(startDate),
                duration_days: String(durationDays).trim() ? Number(durationDays) : undefined,

                schedule_type: scheduleType,
                schedule_payload: schedulePayload,

                timezone: timezone || DEFAULT_TZ,
            };

            Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

            await createRegimen(selectedProfileId, payload);

            Alert.alert("Thành công", "Đã tạo kế hoạch dùng thuốc!", [
                { text: "OK", onPress: () => navigation.goBack() },
            ]);
        } catch (e) {
            console.log("createRegimen error:", e?.message || e);
            Alert.alert("Lỗi", e?.message || "Không tạo được kế hoạch.");
        } finally {
            setSubmitting(false);
        }
    };

    /* ===== UI ===== */
    if (profilesLoading) {
        return (
            <View style={[styles.center, { backgroundColor: "#F9FAFB", flex: 1 }]}>
                <ActivityIndicator size="large" color={COLORS.primary600} />
                <Text style={{ marginTop: 10, color: COLORS.text600 }}>Đang tải hồ sơ…</Text>
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setDrugDropdownOpen(false); }}>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: "#F9FAFB" }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                    </TouchableOpacity>
                    <Text style={styles.h1}>Tạo kế hoạch dùng thuốc</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Card: Profile */}
                    <Card style={styles.card}>
                        <Text style={styles.label}>Hồ sơ bệnh nhân *</Text>
                        {profiles.length === 0 ? (
                            <Text style={{ color: COLORS.text600 }}>Bạn chưa có hồ sơ. Vui lòng tạo hồ sơ trước.</Text>
                        ) : (
                            <View style={styles.chipRow}>
                                {profiles.map((p) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.chip, selectedProfileId === p.id && styles.chipActive]}
                                        onPress={() => setSelectedProfileId(p.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[styles.chipText, selectedProfileId === p.id && styles.chipTextActive]}>
                                            {p.full_name || p.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </Card>

                    {/* Card: Info */}
                    <Card style={styles.card}>
                        <Text style={styles.sectionTitle}>Thông tin kế hoạch</Text>

                        <Text style={styles.label}>Tên kế hoạch *</Text>
                        <TextInput
                            style={styles.input}
                            value={planName}
                            onChangeText={setPlanName}
                            placeholder="VD: Uống Panadol sau ăn"
                        />

                        <Text style={styles.label}>Thuốc *</Text>

                        {/* Selected drug chip */}
                        {selectedDrug?.id ? (
                            <View style={styles.selectedDrugBox}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.selectedDrugName} numberOfLines={1}>
                                        {drugDisplayName(selectedDrug)}
                                    </Text>
                                    {!!drugSubtitle(selectedDrug) && (
                                        <Text style={styles.selectedDrugSub} numberOfLines={1}>
                                            {drugSubtitle(item)} / {drugForm(item)}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={clearDrug} style={{ padding: 6 }}>
                                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <View style={styles.searchRow}>
                                    <Ionicons name="search-outline" size={18} color={COLORS.text600} />
                                    <TextInput
                                        style={styles.searchInput}
                                        value={drugQuery}
                                        onChangeText={(t) => {
                                            setDrugQuery(t);
                                            setSelectedDrug(null);
                                        }}
                                        placeholder="Gõ tên thuốc để tìm…"
                                        onFocus={() => drugQuery.trim() && setDrugDropdownOpen(true)}
                                    />
                                    {drugLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.primary600} />
                                    ) : null}
                                </View>

                                {/* Dropdown suggestions */}
                                {drugDropdownOpen && drugSuggestions.length > 0 && (
                                    <View style={styles.dropdown}>
                                        {drugSuggestions.slice(0, 10).map((item) => {
                                            const id = getDrugId(item) || String(item?.drug_product?.brand_name);
                                            return (
                                                <TouchableOpacity
                                                    key={String(id)}
                                                    style={styles.dropdownItem}
                                                    onPress={() => selectDrug(item)}
                                                    activeOpacity={0.85}
                                                >
                                                    <Text style={styles.dropdownTitle} numberOfLines={1}>
                                                        {drugDisplayName(item)}
                                                    </Text>
                                                    {!!drugSubtitle(item) && (
                                                        <Text style={styles.dropdownSub} numberOfLines={1}>
                                                            {drugSubtitle(item)} / {drugForm(item)}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}

                                    </View>
                                )}

                                {drugDropdownOpen && drugSuggestions.length === 0 && drugQuery.trim().length >= 2 && !drugLoading ? (
                                    <Text style={styles.hint}>Không thấy kết quả phù hợp.</Text>
                                ) : null}
                            </View>
                        )}

                        <Text style={styles.label}>Liên kết từ đơn thuốc (tuỳ chọn)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: "#F3F4F6" }]}
                            value={linkFromPrescriptionItemId}
                            onChangeText={setLinkFromPrescriptionItemId}
                            placeholder="Nếu kế hoạch sinh ra từ đơn thuốc (có thể để trống)"
                            autoCapitalize="none"
                            editable={false}
                        />

                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <View style={{ flex: 4 }}>
                                <Text style={styles.label}>Tổng liều/ngày (tuỳ chọn)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={dailyDose}
                                    onChangeText={setDailyDose}
                                    placeholder="VD: 2"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 2 }}>
                                <Text style={styles.label}>Đơn vị (tuỳ chọn)</Text>

                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setDoseUnitModalOpen(true)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.datePickerText}>{doseUnitLabel}</Text>
                                    <Ionicons name="chevron-down" size={18} color={COLORS.text600} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>Ngày bắt đầu</Text>
                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartPicker(true)}>
                            <Ionicons name="calendar-outline" size={20} color={COLORS.text600} />
                            <Text style={styles.datePickerText}>{startDate.toLocaleDateString("vi-VN")}</Text>
                        </TouchableOpacity>

                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={(e, selected) => {
                                    setShowStartPicker(false);
                                    if (selected) setStartDate(selected);
                                }}
                            />
                        )}

                        <Text style={styles.label}>Số ngày dùng</Text>
                        <TextInput
                            style={styles.input}
                            value={durationDays}
                            onChangeText={setDurationDays}
                            placeholder="VD: 7"
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Múi giờ</Text>
                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setTzModalOpen(true)}>
                            <Ionicons name="globe-outline" size={20} color={COLORS.text600} />
                            <Text style={[styles.datePickerText, { flex: 1 }]} numberOfLines={1}>
                                {timezone || DEFAULT_TZ}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color={COLORS.text600} />
                        </TouchableOpacity>
                    </Card>

                    {/* Card: Schedule */}
                    <Card style={styles.card}>
                        <Text style={styles.sectionTitle}>Lịch nhắc uống</Text>

                        <Text style={styles.label}>Chọn kiểu nhắc</Text>
                        <View style={styles.segmentRow}>
                            {[
                                { key: "fixed_times", label: "Giờ cố định" },
                                { key: "interval_hours", label: "Mỗi X giờ" },
                                { key: "custom", label: "Theo ngày" },
                            ].map((t) => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.segmentBtn, scheduleType === t.key && styles.segmentBtnActive]}
                                    onPress={() => setScheduleType(t.key)}
                                >
                                    <Text style={[styles.segmentText, scheduleType === t.key && styles.segmentTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { marginTop: 12 }]}>Giờ nhắc *</Text>
                        <View style={styles.timeRow}>
                            {times.map((t, idx) => (
                                <View key={`${t}-${idx}`} style={styles.timeTag}>
                                    <Text style={styles.timeTagText}>{t}</Text>
                                    <TouchableOpacity onPress={() => removeTime(idx)} hitSlop={10}>
                                        <Ionicons name="close-circle" size={18} color={COLORS.text600} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.btnAddTime} onPress={() => setShowTimePicker(true)}>
                                <Ionicons name="add" size={20} color={COLORS.primary600} />
                                <Text style={{ color: COLORS.primary600, fontWeight: "700", fontSize: 12 }}>Thêm giờ</Text>
                            </TouchableOpacity>
                        </View>

                        {scheduleType === "interval_hours" && (
                            <>
                                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Nhắc mỗi</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={intervalHours}
                                            onChangeText={setIntervalHours}
                                            keyboardType="numeric"
                                            placeholder="VD: 8 (giờ)"
                                        />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Giờ bắt đầu</Text>
                                        <TouchableOpacity
                                            style={styles.datePickerButton}
                                            onPress={() => setShowIntervalStartPicker(true)}
                                        >
                                            <Ionicons name="time-outline" size={20} color={COLORS.text600} />
                                            <Text style={styles.datePickerText}>{intervalStartTime}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}

                        {scheduleType === "custom" && (
                            <>
                                <Text style={[styles.label, { marginTop: 12 }]}>Ngày nhắc *</Text>
                                <View style={styles.daysRow}>
                                    {DAYS.map((d) => {
                                        const active = daysOfWeek.includes(d.key);
                                        return (
                                            <TouchableOpacity
                                                key={d.key}
                                                style={[styles.dayChip, active && styles.dayChipActive]}
                                                onPress={() => toggleDay(d.key)}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                                                    {d.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <Text style={styles.hint}>Chọn những ngày trong tuần cần nhắc.</Text>
                            </>
                        )}
                    </Card>

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.btnPrimary, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.btnText}>Lưu kế hoạch</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Time picker for adding time */}
                {showTimePicker && (
                    <DateTimePicker
                        value={currentTime}
                        mode="time"
                        is24Hour
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(e, selected) => {
                            if (selected) setCurrentTime(selected);
                            onTimeChange(e, selected);
                        }}
                    />
                )}

                {/* Interval start time picker */}
                {showIntervalStartPicker && (
                    <DateTimePicker
                        value={(() => {
                            const [hh, mm] = String(intervalStartTime || "08:00").split(":");
                            const d = new Date();
                            d.setHours(Number(hh) || 8);
                            d.setMinutes(Number(mm) || 0);
                            return d;
                        })()}
                        mode="time"
                        is24Hour
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(e, selected) => {
                            setShowIntervalStartPicker(false);
                            if (!selected) return;
                            setIntervalStartTime(toHHmm(selected));
                        }}
                    />
                )}

                {/* Timezone modal */}
                <Modal visible={tzModalOpen} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.tzModal}>
                            <View style={styles.tzHeader}>
                                <Text style={styles.tzTitle}>Chọn múi giờ</Text>
                                <TouchableOpacity onPress={() => setTzModalOpen(false)}>
                                    <Ionicons name="close" size={22} color={COLORS.text900} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.searchRow}>
                                <Ionicons name="search-outline" size={18} color={COLORS.text600} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={tzSearch}
                                    onChangeText={setTzSearch}
                                    placeholder="Tìm múi giờ… (VD: Asia, Ho_Chi_Minh)"
                                    autoCapitalize="none"
                                />
                            </View>

                            <FlatList
                                data={tzList}
                                keyExtractor={(z) => z}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setTimezone(item);
                                            setTzModalOpen(false);
                                            setTzSearch("");
                                        }}
                                    >
                                        <Text style={styles.dropdownTitle}>{item}</Text>
                                        {item === Localization.timezone ? (
                                            <Text style={styles.dropdownSub}>Múi giờ theo thiết bị</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
                <Modal visible={doseUnitModalOpen} transparent animationType="slide">
                    {/* overlay */}
                    <TouchableOpacity
                        style={styles.sheetOverlay}
                        activeOpacity={1}
                        onPress={() => setDoseUnitModalOpen(false)}
                    >
                        {/* sheet */}
                        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
                            {/* handle */}
                            <View style={styles.sheetHandle} />

                            {/* header */}
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Chọn đơn vị</Text>
                                <TouchableOpacity onPress={() => setDoseUnitModalOpen(false)} hitSlop={12}>
                                    <Ionicons name="close" size={22} color={COLORS.text900} />
                                </TouchableOpacity>
                            </View>

                            {/* list */}
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 8 }}
                            >
                                {DOSE_UNITS.map((u) => {
                                    const active = u.value === doseUnit;
                                    return (
                                        <TouchableOpacity
                                            key={u.value}
                                            style={[styles.unitRow, active && styles.unitRowActive]}
                                            onPress={() => {
                                                setDoseUnit(u.value);
                                                setDoseUnitModalOpen(false);
                                            }}
                                            activeOpacity={0.9}
                                        >
                                            <Text style={[styles.unitText, active && styles.unitTextActive]}>
                                                {u.label}
                                            </Text>

                                            <View style={[styles.unitCheck, active && styles.unitCheckActive]}>
                                                <Ionicons
                                                    name={active ? "checkmark" : "chevron-forward"}
                                                    size={18}
                                                    color={active ? "white" : COLORS.text600}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>


            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
    center: { justifyContent: "center", alignItems: "center" },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 30,
        height: 60,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    h1: { fontSize: 18, fontWeight: "600", color: COLORS.text900 },

    scrollContent: { padding: 16 },

    card: {
        backgroundColor: "white",
        borderRadius: RADIUS?.md ?? 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },

    sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text900, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: "500", color: COLORS.text600, marginBottom: 6, marginTop: 8 },

    input: {
        borderWidth: 1,
        borderColor: COLORS.line300,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: COLORS.text900,
        backgroundColor: "#F9FAFB",
    },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "transparent",
    },
    chipActive: { backgroundColor: "#EFF6FF", borderColor: COLORS.primary600 },
    chipText: { fontSize: 13, color: COLORS.text600 },
    chipTextActive: { color: COLORS.primary600, fontWeight: "600" },

    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.line300,
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#F9FAFB",
        gap: 8,
    },
    datePickerText: { color: COLORS.text900 },

    /* Drug search */
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.line300,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: "#F9FAFB",
        gap: 8,
    },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text900 },
    dropdown: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        marginTop: 8,
        overflow: "hidden",
        backgroundColor: "white",
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    dropdownTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
    dropdownSub: { marginTop: 2, fontSize: 12, color: "#64748B" },

    selectedDrugBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        padding: 12,
        gap: 10,
    },
    selectedDrugName: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
    selectedDrugSub: { fontSize: 12, color: "#64748B", marginTop: 2 },

    /* Schedule */
    segmentRow: { flexDirection: "row", gap: 8 },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    segmentBtnActive: { backgroundColor: COLORS.primary600 },
    segmentText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
    segmentTextActive: { color: "white" },

    timeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 5 },
    timeTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.primary600,
    },
    timeTagText: { color: COLORS.primary600, fontWeight: "bold", fontSize: 13 },
    btnAddTime: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary600,
        borderStyle: "dashed",
        gap: 4,
    },

    daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
    dayChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "transparent",
    },
    dayChipActive: { backgroundColor: "#EFF6FF", borderColor: COLORS.primary600 },
    dayChipText: { color: COLORS.text600, fontWeight: "700", fontSize: 12 },
    dayChipTextActive: { color: COLORS.primary600 },

    hint: { marginTop: 8, color: COLORS.text600, fontSize: 12, lineHeight: 18 },

    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    btnPrimary: {
        backgroundColor: COLORS.primary600,
        paddingVertical: 14,
        borderRadius: RADIUS?.md ?? 14,
        alignItems: "center",
    },
    btnText: { color: "white", fontSize: 16, fontWeight: "700" },

    /* Timezone modal */
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 },
    tzModal: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 12,
        maxHeight: "80%",
    },
    tzHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 6,
        paddingVertical: 8,
    },
    tzTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text900 },
    sheetOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "flex-end",
    },

    sheet: {
        backgroundColor: "white",
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 12,
        maxHeight: "70%",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -6 },
        elevation: 8,
    },

    sheetHandle: {
        alignSelf: "center",
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#E2E8F0",
        marginBottom: 10,
    },

    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        marginBottom: 10,
    },

    sheetTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: COLORS.text900,
    },

    unitRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 10,
    },

    unitRowActive: {
        backgroundColor: "#EFF6FF",
        borderColor: COLORS.primary600,
    },

    unitText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#0F172A",
    },

    unitTextActive: {
        color: COLORS.primary600,
    },

    unitCheck: {
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
    },

    unitCheckActive: {
        backgroundColor: COLORS.primary600,
        borderColor: COLORS.primary600,
    },

});
