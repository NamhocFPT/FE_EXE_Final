import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/theme';
import { searchMedicines, createMedicationRegimen } from '../services/prescriptionService';

export default function AddManualMedicationScreen({ route, navigation }) {
    // 1. Nhận thông tin profile từ màn hình ProfileDetail truyền sang
    const { profile } = route.params;

    // 2. State quản lý Form
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showManualFields, setShowManualFields] = useState(false);

    const [formData, setFormData] = useState({
        drug_product_id: null,
        brand_name: '',
        strength_text: '',
        form: 'Viên nén',
        route: 'Đường uống',
        dose_amount: '1',
        dose_unit: 'Viên',
        times: ['08:00'],
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Mặc định 7 ngày
        is_ongoing: false,
        is_generic: false,
        manufacturer: '',
    });

    // State cho TimePicker
    const [showPicker, setShowPicker] = useState(false);

    // 3. Logic Tìm kiếm thuốc (UC-RX2/MR2)
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length > 1) {
                const results = await searchMedicines(searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const selectDrug = (drug) => {
        setFormData({
            ...formData,
            drug_product_id: drug.id,
            brand_name: drug.brand_name,
            strength_text: drug.strength_text,
            form: drug.form || formData.form,
        });
        setSearchQuery(drug.brand_name);
        setSearchResults([]);
        setShowManualFields(true); // Hiện các bước tiếp theo
    };

    // 4. Logic Lưu (UC-MR2)
    const handleSave = async () => {
        if (!searchQuery) return Alert.alert("Lỗi", "Vui lòng nhập tên thuốc");
        
        setLoading(true);
        try {
            const payload = {
                profile_id: profile.id,
                prescription_item_id: null, // Bắt buộc null theo UC-MR2
                drug_product_id: formData.drug_product_id,
                display_name: formData.brand_name || searchQuery,
                total_daily_dose: formData.dose_amount,
                dose_unit: formData.dose_unit,
                start_date: formData.start_date.toISOString(),
                end_date: formData.is_ongoing ? null : formData.end_date.toISOString(),
                schedule_type: 'fixed_times',
                schedule_payload: { 
                    times: formData.times,
                    is_generic: formData.is_generic,
                    strength: formData.strength_text
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            await createMedicationRegimen(payload);
            Alert.alert("Thành công", "Đã thêm kế hoạch dùng thuốc tự do.");
            navigation.goBack();
        } catch (error) {
            Alert.alert("Lỗi", "Không thể lưu phác đồ.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Thêm thuốc cho <Text style={{fontWeight: '900'}}>{profile.full_name}</Text>
                </Text>
            </View>

            <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
                {/* Section: Drug Information */}
                <Text style={styles.sectionTitle}>Thông tin thuốc</Text>
                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tên thuốc (Search hoặc nhập tay)</Text>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="VD: Vitamin D3, Panadol..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    
                    {/* Dropdown gợi ý */}
                    {searchResults.length > 0 && (
                        <View style={styles.dropdown}>
                            {searchResults.map(item => (
                                <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => selectDrug(item)}>
                                    <Text style={styles.itemBrand}>{item.brand_name}</Text>
                                    <Text style={styles.itemSub}>{item.strength_text} • {item.form}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Manual Entry Fields */}
                <TouchableOpacity onPress={() => setShowManualFields(!showManualFields)}>
                    <Text style={styles.toggleText}>
                        {showManualFields ? "- Thu gọn chi tiết" : "+ Nhập chi tiết thuốc (Dạng, đường dùng...)"}
                    </Text>
                </TouchableOpacity>

                {showManualFields && (
                    <View style={styles.manualFields}>
                        <View style={styles.row}>
                            <View style={{flex:1, marginRight: 8}}>
                                <Text style={styles.label}>Hàm lượng</Text>
                                <TextInput style={styles.smallInput} value={formData.strength_text} onChangeText={(t)=>setFormData({...formData, strength_text:t})} placeholder="500mg"/>
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.label}>Dạng bào chế</Text>
                                <TextInput style={styles.smallInput} value={formData.form} onChangeText={(t)=>setFormData({...formData, form:t})} />
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.divider} />

                {/* Section: Dosage & Schedule */}
                <Text style={styles.sectionTitle}>Cách dùng & Lịch nhắc</Text>
                <View style={styles.row}>
                    <View style={{flex:1, marginRight: 8}}>
                        <Text style={styles.label}>Liều dùng</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={formData.dose_amount} onChangeText={(t)=>setFormData({...formData, dose_amount:t})} />
                    </View>
                    <View style={{flex:1}}>
                        <Text style={styles.label}>Đơn vị</Text>
                        <TextInput style={styles.input} value={formData.dose_unit} onChangeText={(t)=>setFormData({...formData, dose_unit:t})} />
                    </View>
                </View>

                {/* Times Chips */}
                <Text style={[styles.label, {marginTop: 15}]}>Giờ uống thuốc</Text>
                <View style={styles.timeRow}>
                    {formData.times.map((time, idx) => (
                        <View key={idx} style={styles.timeChip}>
                            <Text style={styles.timeText}>{time}</Text>
                            <TouchableOpacity onPress={() => setFormData({...formData, times: formData.times.filter((_, i) => i !== idx)})}>
                                <Ionicons name="close-circle" size={18} color={COLORS.primary600} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addTimeBtn} onPress={() => setShowPicker(true)}>
                        <Ionicons name="add" size={20} color={COLORS.primary600} />
                        <Text style={{color: COLORS.primary600}}>Thêm giờ</Text>
                    </TouchableOpacity>
                </View>

                {showPicker && (
                    <DateTimePicker
                        value={new Date()}
                        mode="time"
                        is24Hour={true}
                        onChange={(event, date) => {
                            setShowPicker(false);
                            if (date) {
                                const t = date.getHours().toString().padStart(2,'0') + ":" + date.getMinutes().toString().padStart(2,'0');
                                if(!formData.times.includes(t)) setFormData({...formData, times: [...formData.times, t].sort()});
                            }
                        }}
                    />
                )}

                {/* Action Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Lưu kế hoạch uống thuốc</Text>}
                    </TouchableOpacity>
                </View>
                <View style={{height: 50}} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.primary600 },
    header: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 15 },
    headerTitle: { color: 'white', fontSize: 20 },
    card: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 15 },
    label: { fontSize: 14, color: '#64748B', marginBottom: 5 },
    inputGroup: { marginBottom: 15 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0' },
    searchIcon: { paddingLeft: 15 },
    input: { flex: 1, padding: 12, fontSize: 16 },
    smallInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
    dropdown: { backgroundColor: 'white', borderRadius: 12, elevation: 5, marginTop: 5, borderWeight: 1, borderColor: '#EEE' },
    dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    itemBrand: { fontWeight: 'bold', color: '#1E293B' },
    itemSub: { fontSize: 12, color: '#64748B' },
    toggleText: { color: COLORS.primary600, fontSize: 14, marginBottom: 15, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
    timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    timeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 5 },
    timeText: { color: COLORS.primary600, fontWeight: 'bold' },
    addTimeBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary600, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderStyle: 'dashed' },
    footer: { marginTop: 30 },
    btnSave: { backgroundColor: COLORS.primary600, padding: 16, borderRadius: 15, alignItems: 'center' },
    btnSaveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});