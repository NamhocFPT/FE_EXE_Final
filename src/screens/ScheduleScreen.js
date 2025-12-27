import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, StatusBar, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { getIntakeSchedule, updateIntakeStatus } from '../services/intakeService';
import { MOCK_PROFILES } from '../mock/fakeData';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 60; // Chiều rộng mỗi item ngày

export default function FamilyDashboardScreen({ navigation }) {
  const [selectedProfileId, setSelectedProfileId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  // 1. Tạo danh sách ngày (30 ngày: 15 ngày trước và 15 ngày sau)
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = -15; i <= 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  // 2. Cuộn đến ngày hiện tại (vị trí giữa danh sách)
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: 15, // Vị trí ngày hôm nay
        animated: true,
        viewPosition: 0.5
      });
    }, 500);
  }, []);

  // 3. Load dữ liệu từ Service
  const loadData = async () => {
    setLoading(true);
    try {
      // Định dạng ngày YYYY-MM-DD để gửi lên API
      const dateStr = selectedDate.toISOString().split('T')[0];
      const targetProfile = selectedProfileId === 'all' ? null : selectedProfileId;
      const data = await getIntakeSchedule(targetProfile, dateStr, dateStr);
      setMedications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedProfileId, selectedDate]);

  const handleConfirm = async (eventId, status) => {
    try {
      // status sẽ là 'taken', 'skipped', hoặc 'delayed'
      await updateIntakeStatus(eventId, status);

      let message = "Đã cập nhật trạng thái";
      if (status === 'taken') message = "Đã ghi nhận uống thuốc.";
      if (status === 'skipped') message = "Đã đánh dấu bỏ qua.";
      if (status === 'delayed') message = "Đã hoãn lịch uống.";

      Alert.alert("Thành công", message);
      loadData(); // Load lại để cập nhật giao diện
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái.");
    }
  };

  const renderDateItem = ({ item }) => {
    const isSelected = item.toDateString() === selectedDate.toDateString();
    const isToday = item.toDateString() === new Date().toDateString();

    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(item)}
        style={[styles.dateItem, isSelected && styles.dateItemActive]}
      >
        <Text style={[styles.dateDay, isSelected && styles.textWhite]}>
          {item.toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <Text style={[styles.dateNumber, isSelected && styles.textWhite]}>
          {item.getDate()}
        </Text>
        {isToday && !isSelected && <View style={styles.todayDot} />}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Profile Selector */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileScroll}>
          <TouchableOpacity
            onPress={() => setSelectedProfileId('all')}
            style={[styles.profileItem, selectedProfileId === 'all' && styles.profileActive]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: COLORS.primary600 }]}>
              <Ionicons name="people" size={24} color="white" />
            </View>
            <Text style={styles.profileLabel}>All</Text>
          </TouchableOpacity>

          {MOCK_PROFILES.map(profile => (
            <TouchableOpacity
              key={profile.id}
              onPress={() => setSelectedProfileId(profile.id)}
              style={[styles.profileItem, selectedProfileId === profile.id && styles.profileActive]}
            >
              <View style={[styles.avatarCircle, { backgroundColor: profile.sex === 'female' ? '#EC4899' : '#3B82F6' }]}>
                <Text style={styles.avatarInitial}>{profile.full_name.charAt(0)}</Text>
              </View>
              <Text style={styles.profileLabel}>{profile.full_name.split(' ').pop()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Calendar Strip - Horizontal Scroll */}
      <View style={styles.calendarWrapper}>
        <FlatList
          ref={flatListRef}
          data={calendarDays}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderDateItem}
          getItemLayout={(data, index) => (
            { length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index }
          )}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        />
      </View>
    </View>
  );

  const renderMedItem = ({ item }) => {
    // Xác định trạng thái dựa trên item.status từ database
    const isTaken = item.status === 'taken';
    const isSkipped = item.status === 'skipped';
    const isDelayed = item.status === 'delayed';
    const profile = MOCK_PROFILES.find(p => p.id === item.profile_id);

    return (
      <View style={styles.medCard}>
        <View style={[styles.colorBar, { backgroundColor: profile?.sex === 'female' ? '#EC4899' : '#3B82F6' }]} />
        <View style={styles.cardContent}>
          {/* Header & Details giữ nguyên */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName} numberOfLines={1}>{item.display_name}</Text>
              <Text style={styles.profileTag}>• {profile?.full_name}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={14} color="#1E293B" />
              <Text style={styles.medTime}>{item.scheduled_time.split('T')[1].substring(0, 5)}</Text>
            </View>
          </View>

          <View style={styles.medDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="medical-outline" size={16} color="#64748B" />
              <Text style={styles.medInfo}>{item.dose_amount} {item.dose_unit}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="restaurant-outline" size={16} color="#64748B" />
              <Text style={styles.medInfo}>{item.notes || "Không có ghi chú"}</Text>
            </View>
          </View>

          {/* PHẦN THAY THẾ CHÍNH Ở ĐÂY */}
          {item.status === 'scheduled' ? (
            <View style={styles.actionContainer}>
              {/* Nút Hoãn */}
              <TouchableOpacity
                style={[styles.smallBtn, styles.btnDelayed]}
                onPress={() => handleConfirm(item.id, 'delayed')}
              >
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text style={styles.smallBtnText}>Hoãn</Text>
              </TouchableOpacity>

              {/* Nút Đã uống */}
              <TouchableOpacity
                style={[styles.mainBtn, styles.btnTaken]}
                onPress={() => handleConfirm(item.id, 'taken')}
              >
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text style={styles.mainBtnText}>Đã uống</Text>
              </TouchableOpacity>

              {/* Nút Bỏ qua */}
              <TouchableOpacity
                style={[styles.smallBtn, styles.btnSkipped]}
                onPress={() => handleConfirm(item.id, 'skipped')}
              >
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.smallBtnText}>Bỏ qua</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Hiển thị Badge trạng thái tương ứng sau khi bấm */
            <View style={[
              styles.statusBadge,
              isTaken ? styles.badgeTaken : isSkipped ? styles.badgeSkipped : styles.badgeDelayed
            ]}>
              <Ionicons
                name={isTaken ? "checkmark-circle" : isSkipped ? "close-circle" : "time"}
                size={18}
                color={isTaken ? "#16A34A" : isSkipped ? "#EF4444" : "#F59E0B"}
              />
              <Text style={[
                styles.statusText,
                { color: isTaken ? "#16A34A" : isSkipped ? "#EF4444" : "#F59E0B" }
              ]}>
                {isTaken ? `Đã uống lúc ${item.taken_time?.substring(11, 16)}` : isSkipped ? "Đã bỏ qua" : "Đã hoãn uống"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderHeader()}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={COLORS.primary600} />
      ) : (
        <FlatList
          data={medications}
          keyExtractor={item => item.id}
          renderItem={renderMedItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No medications scheduled for this day.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  headerContainer: { backgroundColor: 'white', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 4, paddingBottom: 15 },
  profileScroll: { paddingHorizontal: 20, paddingTop: 20, marginBottom: 15 },
  profileItem: { alignItems: 'center', marginRight: 20, opacity: 0.5 },
  profileActive: { opacity: 1 },
  avatarCircle: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginBottom: 5, elevation: 2 },
  avatarInitial: { color: 'white', fontWeight: 'bold', fontSize: 20 },
  profileLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },

  calendarWrapper: { marginTop: 5 },
  dateItem: { alignItems: 'center', justifyContent: 'center', width: ITEM_WIDTH, height: 70, marginHorizontal: 5, borderRadius: 15, backgroundColor: '#F8FAFC' },
  dateItemActive: { backgroundColor: COLORS.primary600, elevation: 3 },
  dateDay: { fontSize: 12, color: '#64748B', textTransform: 'uppercase' },
  dateNumber: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  textWhite: { color: 'white' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary600, marginTop: 4 },

  listContent: { padding: 20 },
  medCard: { backgroundColor: 'white', borderRadius: 20, flexDirection: 'row', marginBottom: 16, elevation: 3, overflow: 'hidden' },
  colorBar: { width: 6 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  medName: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  profileTag: { fontSize: 13, color: COLORS.primary600, fontWeight: '600', marginTop: 2 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  medTime: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginLeft: 4 },
  medDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 15 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  medInfo: { fontSize: 14, color: '#64748B' },

  confirmBtn: { backgroundColor: COLORS.primary600, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 12 },
  confirmBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 15 },
  takenBadge: { backgroundColor: '#F0FDF4', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  takenText: { color: '#16A34A', fontWeight: 'bold', marginLeft: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', marginTop: 15, color: '#94A3B8', fontSize: 16 },

  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  mainBtn: {
    flex: 2,
    flexDirection: 'row',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  btnTaken: { backgroundColor: '#10B981' },
  mainBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 5 },

  smallBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  btnDelayed: { borderColor: '#FEF3C7' },
  btnSkipped: { borderColor: '#FEE2E2' },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginTop: 5,
  },
  badgeTaken: { backgroundColor: '#F0FDF4' },
  badgeSkipped: { backgroundColor: '#FEF2F2' },
  badgeDelayed: { backgroundColor: '#FFFBEB' },
  statusText: { fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
});