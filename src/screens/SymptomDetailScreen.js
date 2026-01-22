import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { getSymptomDetail, deleteSymptomEntry, updateSymptomEntry } from '../services/symptomService';
import { getActiveRegimensForLink } from '../services/regimenService';

const formatDateTime = (iso) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return `${d.toLocaleDateString('vi-VN')} • ${d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
};

const relationLabel = (v) => {
    if (v === 'before_medication') return { text: 'Trước khi uống thuốc', icon: 'arrow-up-circle-outline' };
    if (v === 'after_medication') return { text: 'Sau khi uống thuốc', icon: 'arrow-down-circle-outline' };
    return { text: 'Không rõ liên quan thuốc', icon: 'help-circle-outline' };
};

export default function SymptomDetailScreen({ navigation, route }) {
    const { symptomId } = route.params;

    const [symptom, setSymptom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [regimens, setRegimens] = useState([]);
    const [loadingRegimens, setLoadingRegimens] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [editData, setEditData] = useState({
        symptomName: '',
        severityScore: 5,
        relationToMed: 'unknown',
        description: '',
        notes: '',
        recordedAt: null,            // ✅ ISO string
        linkedRegimenIds: [],        // ✅ array regimen_id
    });
    const dirtyRef = React.useRef(new Set());
    const markDirty = (key) => dirtyRef.current.add(key);
    const resetDirty = () => (dirtyRef.current = new Set());

    useEffect(() => {
        loadDetail();
    }, [symptomId]);

    useEffect(() => {
        if (!modalVisible) return;

        const profileId = symptom?.profile_id;
        if (!profileId) return;

        (async () => {
            try {
                setLoadingRegimens(true);
                const res = await getActiveRegimensForLink(profileId);
                const list = Array.isArray(res) ? res : (res?.data ?? res?.data?.data ?? []);
                setRegimens(list || []);
            } catch (e) {
                console.error('load regimens error', e);
                setRegimens([]);
            } finally {
                setLoadingRegimens(false);
            }
        })();
    }, [modalVisible, symptom?.profile_id]);

    const loadDetail = async () => {
        try {
            setLoading(true);
            const data = await getSymptomDetail(symptomId);
            const detail = data?.data ?? data;
            console.log("GET detail linked_regimens:", detail?.linked_regimens);
            setSymptom(detail);
            setEditData({
                symptomName: detail?.symptom_name || '',
                severityScore: Number(detail?.severity_score ?? 5),
                relationToMed: detail?.relation_to_med || 'unknown',
                description: detail?.description || '',
                notes: detail?.notes || '',
                recordedAt: detail?.recorded_at || null,
                linkedRegimenIds: Array.isArray(detail?.linked_regimens)
                    ? detail.linked_regimens.map(x => x.regimen_id).filter(Boolean)
                    : [],
            });
            resetDirty();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải chi tiết triệu chứng');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };
    const toggleRegimen = (regimenId) => {
        setEditData(prev => {
            const exists = prev.linkedRegimenIds.includes(regimenId);
            const next = exists
                ? prev.linkedRegimenIds.filter(id => id !== regimenId)
                : [...prev.linkedRegimenIds, regimenId];
            console.log("toggleRegimen =>", next); // ✅ log tại đây
            return { ...prev, linkedRegimenIds: next };
        });
        markDirty('linkedRegimenIds');
    };
    const handleUpdate = async () => {
        console.log("linkedRegimenIds:", editData.linkedRegimenIds);
        const name = editData.symptomName.trim();
        if (!name) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên triệu chứng');
            return;
        }
        if (!editData.recordedAt) {
            Alert.alert('Lỗi', 'Vui lòng chọn thời điểm ghi nhận');
            return;
        }

        // ✅ tạo payload chỉ chứa field đã sửa
        const dirty = dirtyRef.current;
        const payload = {};

        // luôn cập nhật symptomName nếu user sửa
        if (dirty.has('symptomName')) payload.symptomName = name;
        if (dirty.has('severityScore')) payload.severityScore = Number(editData.severityScore);
        if (dirty.has('relationToMed')) payload.relationToMed = editData.relationToMed;
        if (dirty.has('description')) payload.description = editData.description;
        if (dirty.has('notes')) payload.notes = editData.notes;
        if (dirty.has('recordedAt')) payload.recordedAt = editData.recordedAt;

        // links
        if (dirty.has('linkedRegimenIds')) payload.linkedRegimenIds = editData.linkedRegimenIds;

        // Nếu user chỉ mở modal rồi bấm lưu mà không sửa gì
        if (Object.keys(payload).length === 0) {
            setModalVisible(false);
            return;
        }

        try {
            setSaving(true);
            const res = await updateSymptomEntry(symptomId, payload);

            // nếu PATCH trả detail mới thì set luôn
            const updated = res?.data ?? res;
            if (updated?.id) setSymptom(updated);
            else await loadDetail();

            setModalVisible(false);
            resetDirty();
            Alert.alert('Thành công', 'Đã cập nhật thay đổi');
        } catch (error) {
            Alert.alert('Lỗi', error?.message || 'Cập nhật thất bại');
        } finally {
            setSaving(false);
        }
    };



    const handleDelete = () => {
        Alert.alert('Xác nhận xóa', 'Bản ghi này sẽ bị xóa vĩnh viễn khỏi hệ thống.', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setSaving(true);
                        await deleteSymptomEntry(symptomId);
                        navigation.goBack();
                    } catch (e) {
                        Alert.alert('Lỗi', e?.message || 'Xóa thất bại');
                    } finally {
                        setSaving(false);
                    }
                },
            },
        ]);
    };

    const getSeverityStyles = (score = 0) => {
        const s = Number(score) || 0;
        if (s <= 3) return { color: '#10B981', bg: '#D1FAE5', label: 'Nhẹ' };
        if (s <= 6) return { color: '#F59E0B', bg: '#FEF3C7', label: 'Trung bình' };
        return { color: '#EF4444', bg: '#FEE2E2', label: 'Nặng' };
    };

    const severity = useMemo(() => getSeverityStyles(symptom?.severity_score), [symptom]);
    const editSeverity = useMemo(() => getSeverityStyles(editData.severityScore), [editData.severityScore]);

    if (loading && !symptom) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary600} />
            </View>
        );
    }

    const relation = relationLabel(symptom?.relation_to_med);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} disabled={saving}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                </TouchableOpacity>

                <Text style={styles.h1}>Chi tiết triệu chứng</Text>

                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconBtn} disabled={saving}>
                    <Ionicons name="create-outline" size={24} color={COLORS.primary600} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero */}
                <View style={[styles.card, styles.heroCard, { borderLeftColor: severity.color }]}>
                    <Text style={styles.symptomName}>{symptom?.symptom_name}</Text>

                    <View style={styles.metaRow}>
                        <View style={[styles.severityPill, { backgroundColor: severity.bg }]}>
                            <View style={[styles.dot, { backgroundColor: severity.color }]} />
                            <Text style={[styles.severityText, { color: severity.color }]}>
                                {severity.label} • {symptom?.severity_score}/10
                            </Text>
                        </View>

                        <View style={styles.timeChip}>
                            <Ionicons name="time-outline" size={14} color={COLORS.text600} />
                            <Text style={styles.timeText}>{formatDateTime(symptom?.recorded_at)}</Text>
                        </View>
                    </View>

                    <View style={styles.relationChip}>
                        <Ionicons name={relation.icon} size={16} color={COLORS.primary600} />
                        <Text style={styles.relationText}>{relation.text}</Text>
                    </View>
                </View>

                {/* Suspected meds */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Thuốc bạn nghi ngờ liên quan</Text>
                    <Text style={styles.hintText}>
                        Đây là thông tin tham khảo do bạn ghi nhận. Không tự ý ngừng/đổi thuốc nếu chưa có chỉ định của bác sĩ.
                    </Text>

                    {symptom?.linked_regimens?.length > 0 ? (
                        symptom.linked_regimens.map((reg) => {
                            const key = reg.regimen_id || reg.id; // ✅ API trả regimen_id
                            return (
                                <View key={key} style={styles.medLinkItem}>
                                    <View style={styles.medIconBg}>
                                        {/* ✅ Ionicons không có "pill" */}
                                        <Ionicons name="medkit" size={18} color="white" />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.medName}>{reg.display_name}</Text>

                                        {/* API bạn trả total_daily_dose + dose_unit */}
                                        {!!(reg.total_daily_dose || reg.dose_unit) && (
                                            <Text style={styles.medDose}>
                                                Tổng liều/ngày: {reg.total_daily_dose ?? '--'} {reg.dose_unit ?? ''}
                                            </Text>
                                        )}

                                        {!!reg.link_note && (
                                            <View style={styles.linkNoteBox}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.text600} />
                                                <Text style={styles.linkNoteText}>{reg.link_note}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>Không có thuốc liên kết.</Text>
                    )}
                </View>

                {/* Description */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Mô tả</Text>
                    <Text style={styles.notesText}>{symptom?.description || 'Không có mô tả.'}</Text>
                </View>

                {/* Notes */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Ghi chú</Text>
                    <Text style={styles.notesText}>{symptom?.notes || 'Không có ghi chú.'}</Text>
                </View>

                {/* Suggestion */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Gợi ý tham khảo</Text>
                    <Text style={styles.notesText}>
                        {symptom?.relation_to_med === 'after_medication'
                            ? 'Triệu chứng xuất hiện sau khi dùng thuốc. Hãy theo dõi thời điểm uống và thời điểm xuất hiện triệu chứng để cung cấp cho bác sĩ.'
                            : symptom?.relation_to_med === 'before_medication'
                                ? 'Triệu chứng xuất hiện trước khi dùng thuốc. Có thể không liên quan trực tiếp đến thuốc vừa uống, nhưng vẫn nên theo dõi.'
                                : 'Bạn chưa xác định rõ triệu chứng liên quan đến thuốc. Hãy ghi nhận thêm thời điểm và thuốc đã dùng để bác sĩ dễ đánh giá.'}
                    </Text>

                    <View style={styles.warningBox}>
                        <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
                        <Text style={styles.warningText}>
                            CareDose không thay thế tư vấn y khoa. Nếu triệu chứng nặng hoặc kéo dài, hãy đi khám ngay.
                        </Text>
                    </View>
                </View>

                {/* Delete */}
                <TouchableOpacity
                    style={[styles.deleteBtn, saving && { opacity: 0.6 }]}
                    onPress={handleDelete}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="trash-outline" size={20} color="white" />
                            <Text style={styles.deleteBtnText}>Xóa bản ghi</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* EDIT MODAL */}
            <Modal
                animationType="slide"
                transparent
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chỉnh sửa</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} disabled={saving}>
                                    <Ionicons name="close" size={24} color={COLORS.text600} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* recorded_at */}
                                <Text style={styles.inputLabel}>Thời điểm ghi nhận *</Text>
                                <TouchableOpacity
                                    style={styles.dateRow}
                                    onPress={() => setShowDatePicker(true)}
                                    disabled={saving}
                                >
                                    <Ionicons name="calendar-outline" size={18} color={COLORS.text600} />
                                    <Text style={styles.dateText}>
                                        {editData.recordedAt ? formatDateTime(editData.recordedAt) : 'Chọn ngày/giờ'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                    <TouchableOpacity
                                        style={[styles.smallBtn]}
                                        onPress={() => setShowDatePicker(true)}
                                        disabled={saving}
                                    >
                                        <Text style={styles.smallBtnText}>Chọn ngày</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.smallBtn]}
                                        onPress={() => setShowTimePicker(true)}
                                        disabled={saving}
                                    >
                                        <Text style={styles.smallBtnText}>Chọn giờ</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Date picker */}
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={editData.recordedAt ? new Date(editData.recordedAt) : new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_, date) => {
                                            setShowDatePicker(false);
                                            if (!date) return;
                                            const current = editData.recordedAt ? new Date(editData.recordedAt) : new Date();
                                            current.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                            const iso = current.toISOString();
                                            setEditData(prev => ({ ...prev, recordedAt: iso }));
                                            markDirty('recordedAt');
                                        }}
                                    />
                                )}

                                {/* Time picker */}
                                {showTimePicker && (
                                    <DateTimePicker
                                        value={editData.recordedAt ? new Date(editData.recordedAt) : new Date()}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_, date) => {
                                            setShowTimePicker(false);
                                            if (!date) return;
                                            const current = editData.recordedAt ? new Date(editData.recordedAt) : new Date();
                                            current.setHours(date.getHours(), date.getMinutes(), 0, 0);
                                            const iso = current.toISOString();
                                            setEditData(prev => ({ ...prev, recordedAt: iso }));
                                            markDirty('recordedAt');
                                        }}
                                    />
                                )}

                                {/* symptom name */}
                                <Text style={styles.inputLabel}>Tên triệu chứng *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={editData.symptomName}
                                    onChangeText={(val) => {
                                        setEditData({ ...editData, symptomName: val });
                                        markDirty('symptomName');
                                    }}
                                    placeholder="Nhập tên..."
                                />

                                {/* severity */}
                                <View style={styles.sliderHeader}>
                                    <Text style={styles.inputLabel}>Mức độ: {editData.severityScore}/10</Text>
                                    <Text style={{ color: editSeverity.color, fontWeight: '700' }}>{editSeverity.label}</Text>
                                </View>

                                <Slider
                                    style={{ width: '100%', height: 40 }}
                                    minimumValue={0}
                                    maximumValue={10}
                                    step={1}
                                    value={Number(editData.severityScore)}
                                    onValueChange={(val) => {
                                        setEditData({ ...editData, severityScore: Number(val) });
                                        markDirty('severityScore');
                                    }}
                                    minimumTrackTintColor={editSeverity.color}
                                    thumbTintColor={editSeverity.color}
                                />

                                {/* relation */}
                                <Text style={styles.inputLabel}>Liên quan thuốc</Text>
                                <View style={styles.relationPicker}>
                                    {[
                                        { key: 'before_medication', label: 'Trước khi uống' },
                                        { key: 'after_medication', label: 'Sau khi uống' },
                                        { key: 'unknown', label: 'Không rõ' },
                                    ].map((opt) => {
                                        const active = editData.relationToMed === opt.key;
                                        return (
                                            <TouchableOpacity
                                                key={opt.key}
                                                onPress={() => {
                                                    setEditData({ ...editData, relationToMed: opt.key });
                                                    markDirty('relationToMed');
                                                }}
                                                style={[styles.relationBtn, active && styles.relationBtnActive]}
                                            >
                                                <Text style={[styles.relationBtnText, active && styles.relationBtnTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* description */}
                                <Text style={styles.inputLabel}>Mô tả</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                                    multiline
                                    value={editData.description}
                                    onChangeText={(val) => {
                                        setEditData({ ...editData, description: val });
                                        markDirty('description');
                                    }}
                                    placeholder="Nhập mô tả..."
                                />

                                {/* notes */}
                                <Text style={styles.inputLabel}>Ghi chú</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                                    multiline
                                    value={editData.notes}
                                    onChangeText={(val) => {
                                        setEditData({ ...editData, notes: val });
                                        markDirty('notes');
                                    }}
                                    placeholder="Nhập ghi chú..."
                                />

                                {/* Linked regimens */}
                                <Text style={styles.inputLabel}>Thuốc nghi ngờ liên quan</Text>
                                {loadingRegimens ? (
                                    <View style={{ paddingVertical: 10 }}>
                                        <ActivityIndicator color={COLORS.primary600} />
                                    </View>
                                ) : regimens.length === 0 ? (
                                    <Text style={styles.emptyText}>Không có thuốc đang dùng để liên kết.</Text>
                                ) : (
                                    <View style={{ gap: 8, marginBottom: 16 }}>
                                        {regimens.map(r => {
                                            const id = r.id || r.regimen_id;
                                            const checked = editData.linkedRegimenIds.includes(id);
                                            return (
                                                <TouchableOpacity
                                                    key={id}
                                                    style={[styles.regimenRow, checked && styles.regimenRowActive]}
                                                    onPress={() => toggleRegimen(id)}
                                                    disabled={saving}
                                                >
                                                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                                        {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
                                                    </View>
                                                    <Text style={styles.regimenName}>{r.display_name || r.name || 'Regimen'}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)} disabled={saving}>
                                    <Text style={styles.btnCancelText}>Hủy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.btnSave, saving && { opacity: 0.8 }]} onPress={handleUpdate} disabled={saving}>
                                    {saving ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Lưu</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        height: 56,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ECEEF2',
        marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    h1: { fontSize: 18, fontWeight: '600', color: COLORS.text900 },
    iconBtn: { padding: 8 },

    scrollContent: { padding: 16 },

    card: {
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 3,
    },
    heroCard: { borderLeftWidth: 6 },

    symptomName: { fontSize: 24, fontWeight: '700', color: COLORS.text900, marginBottom: 10 },

    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },

    severityPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    severityText: { fontSize: 13, fontWeight: '700' },

    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    timeText: { color: COLORS.text600, fontWeight: '700', fontSize: 12 },

    relationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    relationText: { color: COLORS.primary600, fontWeight: '800', fontSize: 13 },

    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.text500,
        marginBottom: 12,
        textTransform: 'uppercase',
    },

    hintText: { color: COLORS.text600, fontSize: 12, lineHeight: 18, marginBottom: 12 },

    medLinkItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        backgroundColor: '#F0F7FF',
        borderRadius: 12,
        marginBottom: 10,
    },
    medIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary600,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    medName: { fontSize: 15, fontWeight: '800', color: COLORS.text900 },
    medDose: { fontSize: 12, color: COLORS.text600, marginTop: 2 },

    linkNoteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    linkNoteText: { flex: 1, color: COLORS.text700, fontSize: 12, lineHeight: 18, fontWeight: '600' },

    notesText: { fontSize: 15, color: COLORS.text800, lineHeight: 22 },
    emptyText: { color: COLORS.text500, fontStyle: 'italic', textAlign: 'center' },

    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    warningText: { flex: 1, color: '#92400E', fontWeight: '700', fontSize: 12, lineHeight: 18 },

    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        padding: 16,
        borderRadius: RADIUS.md,
        gap: 8,
    },
    deleteBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text900 },

    inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text600, marginBottom: 8 },
    textInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        backgroundColor: '#F9FAFB',
        marginBottom: 16,
        color: COLORS.text900,
    },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    relationPicker: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    relationBtn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    relationBtnActive: { backgroundColor: COLORS.primary600 },
    relationBtnText: { color: COLORS.text600, fontWeight: '800', fontSize: 12 },
    relationBtnTextActive: { color: 'white' },

    modalFooter: { flexDirection: 'row', gap: 12, marginTop: 10 },
    btnCancel: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6' },
    btnCancelText: { fontWeight: '800', color: COLORS.text600 },
    btnSave: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary600 },
    btnSaveText: { fontWeight: '900', color: 'white' },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#F9FAFB',
        marginBottom: 10,
    },
    dateText: { color: COLORS.text900, fontWeight: '700' },

    smallBtn: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    smallBtnText: { color: COLORS.text600, fontWeight: '800' },

    regimenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    regimenRowActive: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary600,
        borderColor: COLORS.primary600,
    },
    regimenName: { flex: 1, color: COLORS.text900, fontWeight: '800' },

    noteInfoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    noteInfoText: { flex: 1, color: COLORS.text600, fontWeight: '700', fontSize: 12, lineHeight: 18 },

});
