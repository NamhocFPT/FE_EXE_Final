import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, SafeAreaView, StatusBar, KeyboardAvoidingView,
    Platform, Alert, ActivityIndicator
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import Card from '../components/Card';
import { createSymptomEntry } from '../services/symptomService';
import { getActiveRegimensForLink } from '../services/regimenService';

const COMMON_SYMPTOMS = ["Đau đầu", "Buồn nôn", "Mệt mỏi", "Chóng mặt", "Đau bụng", "Phát ban"];

export default function AddSymptomScreen({ navigation, route }) {
    const { profileId } = route.params || {};
    
    // States
    const [symptomName, setSymptomName] = useState("");
    const [severity, setSeverity] = useState(5);
    const [relationToMed, setRelationToMed] = useState("unknown"); // before_medication, after_medication, unrelated, unknown
    const [selectedMeds, setSelectedMeds] = useState([]);
    const [description, setDescription] = useState(""); // Mô tả triệu chứng
    const [notes, setNotes] = useState(""); // Ghi chú của người chăm sóc
    const [loading, setLoading] = useState(false);
    const [activeMeds, setActiveMeds] = useState([]);
    const [loadingMeds, setLoadingMeds] = useState(true);

    // Load active medications when component mounts
    useEffect(() => {
        loadActiveMedications();
    }, [profileId]);

    const loadActiveMedications = async () => {
        if (!profileId) {
            setLoadingMeds(false);
            return;
        }

        try {
            setLoadingMeds(true);
            const regimens = await getActiveRegimensForLink(profileId);
            
            // Transform regimen data to medication format
            const meds = (regimens || []).map(r => ({
                id: r.id,
                name: r.display_name || 'Thuốc không tên',
                dosage: `${r.dose_amount || ''} ${r.dose_unit || ''}`.trim() || 'Chưa rõ liều'
            }));
            
            setActiveMeds(meds);
        } catch (error) {
            console.error('Lỗi khi tải danh sách thuốc:', error);
            Alert.alert('Thông báo', 'Không thể tải danh sách thuốc đang sử dụng');
            setActiveMeds([]);
        } finally {
            setLoadingMeds(false);
        }
    };

    const getSeverityInfo = (value) => {
        if (value <= 3) return { color: '#10B981', label: "Nhẹ", bg: '#D1FAE5' };
        if (value <= 6) return { color: '#F59E0B', label: "Trung bình", bg: '#FEF3C7' };
        return { color: '#EF4444', label: "Nặng", bg: '#FEE2E2' };
    };

    const severityInfo = getSeverityInfo(severity);

    const toggleMedication = (id) => {
        setSelectedMeds(prev => 
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (!symptomName) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập tên triệu chứng");
            return;
        }

        setLoading(true);
        try {
            await createSymptomEntry(profileId, {
                symptomName,
                severityScore: severity,
                relationToMed: relationToMed,
                description: description,
                notes: notes,
                linkedRegimenIds: selectedMeds
            });
            Alert.alert("Thành công", "Đã ghi lại triệu chứng", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert("Lỗi", "Không thể lưu triệu chứng");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header đồng bộ với AddPrescription */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
                </TouchableOpacity>
                <Text style={styles.h1}>Ghi triệu chứng</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <Text style={[styles.saveBtn, loading && { opacity: 0.5 }]}>Lưu</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Tên triệu chứng */}
                    <Card style={styles.card}>
                        <Text style={styles.label}>Triệu chứng của bạn *</Text>
                        <TextInput
                            style={styles.input}
                            value={symptomName}
                            onChangeText={setSymptomName}
                            placeholder="VD: Đau đầu, Chóng mặt..."
                        />
                        <View style={styles.chipRow}>
                            {COMMON_SYMPTOMS.map((s, i) => (
                                <TouchableOpacity 
                                    key={i} 
                                    style={styles.chip}
                                    onPress={() => setSymptomName(s)}
                                >
                                    <Text style={styles.chipText}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Mức độ - Severity Slider */}
                    <Card style={styles.card}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Mức độ nghiêm trọng</Text>
                            <View style={[styles.severityLabel, { backgroundColor: severityInfo.bg }]}>
                                <Text style={{ color: severityInfo.color, fontWeight: '700' }}>
                                    {severity} - {severityInfo.label}
                                </Text>
                            </View>
                        </View>
                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={0}
                            maximumValue={10}
                            step={1}
                            value={severity}
                            onValueChange={setSeverity}
                            minimumTrackTintColor={severityInfo.color}
                            maximumTrackTintColor="#E5E7EB"
                            thumbTintColor={severityInfo.color}
                        />
                        <View style={styles.rowBetween}>
                            <Text style={styles.subText}>Nhẹ</Text>
                            <Text style={styles.subText}>Trung bình</Text>
                            <Text style={styles.subText}>Nặng</Text>
                        </View>
                    </Card>

                    {/* Thuốc nghi ngờ liên quan */}
                    <Card style={styles.card}>
                        <Text style={styles.sectionTitle}>Thuốc nghi ngờ liên quan</Text>
                        <Text style={styles.subText}>Chọn các loại thuốc bạn vừa uống trước khi bị triệu chứng này</Text>
                        <View style={{ marginTop: 12 }}>
                            {loadingMeds ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={COLORS.primary600} />
                                    <Text style={[styles.subText, { marginLeft: 8 }]}>Đang tải danh sách thuốc...</Text>
                                </View>
                            ) : activeMeds.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="medical-outline" size={32} color={COLORS.text600} />
                                    <Text style={styles.emptyText}>Chưa có thuốc đang sử dụng</Text>
                                    <Text style={styles.subText}>Vui lòng thêm đơn thuốc trước</Text>
                                </View>
                            ) : (
                                activeMeds.map(med => (
                                    <TouchableOpacity 
                                        key={med.id} 
                                        style={[
                                            styles.medOption, 
                                            selectedMeds.includes(med.id) && styles.medOptionActive
                                        ]}
                                        onPress={() => toggleMedication(med.id)}
                                    >
                                        <Ionicons 
                                            name={selectedMeds.includes(med.id) ? "checkbox" : "square-outline"} 
                                            size={22} 
                                            color={selectedMeds.includes(med.id) ? COLORS.primary600 : COLORS.text600} 
                                        />
                                        <View style={{ marginLeft: 10 }}>
                                            <Text style={styles.medName}>{med.name}</Text>
                                            <Text style={styles.subText}>{med.dosage}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </Card>

                    {/* Mối liên hệ với thuốc */}
                    <Card style={styles.card}>
                        <Text style={styles.label}>Triệu chứng xảy ra khi nào? *</Text>
                        <View style={styles.relationRow}>
                            {[
                                { value: 'before_medication', label: 'Trước khi uống thuốc', icon: 'time-outline' },
                                { value: 'after_medication', label: 'Sau khi uống thuốc', icon: 'medical-outline' },
                                { value: 'unknown', label: 'Không rõ', icon: 'help-circle-outline' }
                            ].map(option => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.relationOption,
                                        relationToMed === option.value && styles.relationOptionActive
                                    ]}
                                    onPress={() => setRelationToMed(option.value)}
                                >
                                    <Ionicons 
                                        name={option.icon} 
                                        size={20} 
                                        color={relationToMed === option.value ? COLORS.primary600 : COLORS.text600} 
                                    />
                                    <Text style={[
                                        styles.relationText,
                                        relationToMed === option.value && styles.relationTextActive
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Mô tả triệu chứng */}
                    <Card style={styles.card}>
                        <Text style={styles.label}>Mô tả chi tiết triệu chứng</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="VD: Đau âm ỉ vùng thái dương, kéo dài 30 phút..."
                            multiline
                        />
                    </Card>

                    {/* Ghi chú của người chăm sóc */}
                    <Card style={styles.card}>
                        <Text style={styles.label}>Ghi chú thêm (tùy chọn)</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="VD: Đã cho uống thuốc giảm đau, cần theo dõi thêm..."
                            multiline
                        />
                    </Card>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        height: 60,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB"
    },
    h1: { fontSize: 18, fontWeight: "600", color: COLORS.text900 },
    saveBtn: { color: COLORS.primary600, fontWeight: "700", fontSize: 16 },
    scrollContent: { padding: 16 },
    card: {
        backgroundColor: "white", borderRadius: RADIUS.md, padding: 16, marginBottom: 16,
        shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
    },
    label: { fontSize: 14, fontWeight: "600", color: COLORS.text600, marginBottom: 8 },
    input: {
        borderWidth: 1, borderColor: COLORS.line300, borderRadius: 8,
        padding: 12, fontSize: 15, color: COLORS.text900, backgroundColor: "#F9FAFB"
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    chip: {
        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
        backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "transparent"
    },
    chipText: { fontSize: 12, color: COLORS.text600 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    severityLabel: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text900 },
    subText: { fontSize: 12, color: COLORS.text600 },
    medOption: {
        flexDirection: 'row', alignItems: 'center', padding: 12, 
        backgroundColor: '#F9FAFB', borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: 'transparent'
    },
    medOptionActive: { backgroundColor: '#EFF6FF', borderColor: COLORS.primary600 },
    medName: { fontSize: 14, fontWeight: '600', color: COLORS.text900 },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', padding: 24 },
    emptyText: { fontSize: 14, fontWeight: '600', color: COLORS.text600, marginTop: 8 },
    relationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    relationOption: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12,
        backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
        flex: 1, minWidth: '48%'
    },
    relationOptionActive: { backgroundColor: '#EFF6FF', borderColor: COLORS.primary600 },
    relationText: { fontSize: 13, color: COLORS.text600, fontWeight: '500', flex: 1 },
    relationTextActive: { color: COLORS.primary600, fontWeight: '700' }
});