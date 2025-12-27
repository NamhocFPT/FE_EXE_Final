import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from "react-native-chart-kit";
import { COLORS } from '../constants/theme';
import { getComplianceStats, getIntakeSchedule } from '../services/intakeService';
import { MOCK_PROFILES } from '../mock/fakeData';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get("window").width;

export default function ComplianceReportScreen({ route, navigation }) {
    const [selectedProfileId, setSelectedProfileId] = useState(route.params?.profileId || 'all');
    const [timeRange, setTimeRange] = useState('week'); // 'week' | 'month'
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadStats();
    }, [selectedProfileId, timeRange]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await getComplianceStats(selectedProfileId === 'all' ? null : selectedProfileId, timeRange);
            setStats(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Dữ liệu cho biểu đồ tròn (Pie)
    const pieData = stats ? [
        { name: "Đã uống", population: stats.taken_count, color: "#10B981", legendFontColor: "#7F7F7F", legendFontSize: 12 },
        { name: "Bỏ qua", population: stats.skipped_count, color: "#EF4444", legendFontColor: "#7F7F7F", legendFontSize: 12 },
        { name: "Quên/Trễ", population: stats.missed_count, color: "#F59E0B", legendFontColor: "#7F7F7F", legendFontSize: 12 },
    ] : [];

    const handleExportPDF = () => {
        Alert.alert("Thông báo", "Chức năng xuất PDF đang được xử lý bởi hệ thống...");
    };

    return (
        <View style={styles.container}>
            
            {/* Header & Filter */}
            <View style={styles.header}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileScroll}>
                    <TouchableOpacity
                        onPress={() => setSelectedProfileId('all')}
                        style={[styles.profileItem, selectedProfileId === 'all' && styles.profileActive]}
                    >
                        <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary600 }]}><Ionicons name="people" size={20} color="white" /></View>
                        <Text style={styles.profileLabel}>Tất cả</Text>
                    </TouchableOpacity>
                    {MOCK_PROFILES.map(profile => (
                        <TouchableOpacity key={profile.id} onPress={() => setSelectedProfileId(profile.id)} style={[styles.profileItem, selectedProfileId === profile.id && styles.profileActive]}>
                            <View style={[styles.avatarCircle, { backgroundColor: profile.sex === 'female' ? '#EC4899' : '#3B82F6' }]}><Text style={styles.avatarText}>{profile.full_name.charAt(0)}</Text></View>
                            <Text style={styles.profileLabel}>{profile.full_name.split(' ').pop()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.tabContainer}>
                    {['week', 'month'].map(r => (
                        <TouchableOpacity key={r} onPress={() => setTimeRange(r)} style={[styles.tab, timeRange === r && styles.tabActive]}>
                            <Text style={[styles.tabText, timeRange === r && styles.tabTextActive]}>{r === 'week' ? 'Tuần này' : 'Tháng này'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? <ActivityIndicator size="large" color={COLORS.primary600} /> : stats && (
                    <>
                        {/* Biểu đồ Donut */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Tỉ lệ tuân thủ tổng quát</Text>
                            <View style={{ alignItems: 'center', position: 'relative' }}>
                                <PieChart
                                    data={pieData}
                                    width={screenWidth - 60}
                                    height={200}
                                    chartConfig={chartConfig}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[0, 0]}
                                    hasLegend={true}
                                    absolute
                                />
                                <View style={styles.chartOverlay}>
                                    <Text style={styles.percentageText}>{stats.adherence_rate}%</Text>
                                </View>
                            </View>
                        </View>

                        {/* Thống kê chi tiết */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statBox, { backgroundColor: '#ECFDF5' }]}>
                                <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.taken_count}</Text>
                                <Text style={styles.statLabel}>Đã uống</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: '#FEF2F2' }]}>
                                <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.skipped_count}</Text>
                                <Text style={styles.statLabel}>Bỏ qua</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: '#FFFBEB' }]}>
                                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.missed_count}</Text>
                                <Text style={styles.statLabel}>Quên/Trễ</Text>
                            </View>
                        </View>

                        {/* Insight */}
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                                <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Thuốc bỏ lỡ nhiều nhất</Text>
                            </View>
                            <View style={styles.missedItem}>
                                <Text style={styles.missedName}>Panadol Extra</Text>
                                <Text style={styles.missedCount}>Bỏ lỡ 3 lần</Text>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF}>
                <Ionicons name="download" size={24} color="white" />
                <Text style={styles.exportBtnText}>Xuất báo cáo PDF cho Bác sĩ</Text>
            </TouchableOpacity>
        </View>
    );
}

const chartConfig = {
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { backgroundColor: 'white', paddingVertical: 15, elevation: 4 },
    profileScroll: { paddingHorizontal: 15 },
    profileItem: { alignItems: 'center', marginRight: 15, opacity: 0.5 },
    profileActive: { opacity: 1 },
    avatarCircle: { width: 55, height: 55, borderRadius: 33, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    avatarText: { color: 'white', fontWeight: 'bold' },
    profileLabel: { fontSize: 10, color: '#333' },
    tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 15, backgroundColor: '#F1F5F9', borderRadius: 10, p: 4 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: 'white', elevation: 2 },
    tabText: { color: '#64748B', fontSize: 13 },
    tabTextActive: { color: COLORS.primary600, fontWeight: 'bold' },
    content: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 2 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
    chartOverlay: { position: 'absolute', top: '40%', left: '26%' },
    percentageText: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary600 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    statBox: { flex: 1, marginHorizontal: 4, padding: 15, borderRadius: 12, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold' },
    statLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    missedItem: { marginTop: 10, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
    missedName: { fontWeight: '600' },
    missedCount: { color: '#F59E0B', fontSize: 12 },
    exportBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: COLORS.primary600, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, elevation: 8 },
    exportBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 }
});