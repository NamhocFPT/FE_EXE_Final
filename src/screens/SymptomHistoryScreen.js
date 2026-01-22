import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

import { getSymptomEntries } from '../services/symptomService';
import { getProfiles } from '../services/profileService';

/* ================= Helpers ================= */
const getProfileId = (p) => p?.id || p?.profileId || p?._id || p?.profile_id;
const getProfileName = (p) => p?.full_name || p?.fullName || p?.name || p?.display_name || 'Hồ sơ';

const normalizeList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const isValidSelected = (pid, list) =>
  !!pid && (list || []).some((p) => getProfileId(p) === pid);

export default function SymptomHistoryScreen({ navigation, route }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const [symptoms, setSymptoms] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingSymptoms, setLoadingSymptoms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= Load Profiles ================= */
  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const res = await getProfiles();
      const list = normalizeList(res);

      setProfiles(list);

      // ✅ Chọn default profile an toàn:
      // - Ưu tiên route.params.profileId nếu hợp lệ
      // - Nếu không => profile đầu tiên
      const routePid = route?.params?.profileId || null;

      if (list.length > 0) {
        if (routePid && isValidSelected(routePid, list)) {
          setSelectedProfileId(routePid);
        } else {
          setSelectedProfileId(getProfileId(list[0]));
        }
      } else {
        setSelectedProfileId(null);
      }
    } catch (e) {
      console.error('loadProfiles error:', e);
      setProfiles([]);
      setSelectedProfileId(null);
    } finally {
      setLoadingProfiles(false);
    }
  }, [route?.params?.profileId]);

  /* ================= Load Symptoms ================= */
  const loadSymptoms = useCallback(async (profileId) => {
    if (!profileId) return;

    setLoadingSymptoms(true);
    try {
      const res = await getSymptomEntries(profileId);
      const list = normalizeList(res);

      const normalized = (list || []).map((item) => ({
        ...item,
        profile_id: item.profile_id ?? profileId,
        has_linked_meds:
          item.has_linked_meds ??
          (Array.isArray(item.linked_regimens) && item.linked_regimens.length > 0),
      }));

      setSymptoms(normalized);
    } catch (e) {
      // ✅ Nếu profileId hợp lệ mà vẫn 403, vẫn không crash UI
      console.error('loadSymptoms error:', e);
      setSymptoms([]);
    } finally {
      setLoadingSymptoms(false);
    }
  }, []);

  /* ================= Effects ================= */
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // ✅ Chỉ load symptoms khi selectedProfileId hợp lệ trong profiles
  useEffect(() => {
    if (!isValidSelected(selectedProfileId, profiles)) return;
    loadSymptoms(selectedProfileId);
  }, [selectedProfileId, profiles, loadSymptoms]);

  /* ================= Refresh ================= */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh symptoms theo profile đang chọn (nếu hợp lệ)
      if (isValidSelected(selectedProfileId, profiles)) {
        await loadSymptoms(selectedProfileId);
      } else {
        // nếu chưa có profile hợp lệ => reload profiles
        await loadProfiles();
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedProfileId, profiles, loadSymptoms, loadProfiles]);

  /* ================= UI Helpers ================= */
  const getSeverityStyles = (score = 0) => {
    const s = Number(score) || 0;
    if (s <= 3) return { color: '#10B981', bg: '#D1FAE5', label: 'Nhẹ' };
    if (s <= 6) return { color: '#F59E0B', bg: '#FEF3C7', label: 'Trung bình' };
    return { color: '#EF4444', bg: '#FEE2E2', label: 'Nặng' };
  };

  const groupedData = useMemo(() => {
    const groups = symptoms.reduce((acc, item) => {
      const date = item.recorded_at?.split('T')?.[0] || 'Unknown';
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});

    return Object.keys(groups)
      .sort()
      .reverse()
      .map((date) => ({
        date,
        data: groups[date].sort((a, b) => {
          const ta = new Date(a.recorded_at || 0).getTime();
          const tb = new Date(b.recorded_at || 0).getTime();
          return tb - ta;
        }),
      }));
  }, [symptoms]);

  const selectedProfile = profiles.find((p) => getProfileId(p) === selectedProfileId);

  const renderSymptomItem = ({ item }) => {
    const style = getSeverityStyles(item.severity_score);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SymptomDetail', { symptomId: item.id })}
      >
        <View style={[styles.severityBadge, { backgroundColor: style.bg }]}>
          <Text style={[styles.severityScore, { color: style.color }]}>
            {item.severity_score ?? 0}
          </Text>
          <Text style={[styles.severityLabel, { color: style.color }]}>
            {style.label}
          </Text>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.symptomName}>{item.symptom_name || 'Không rõ'}</Text>
          </View>

          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.timeText}>
              {item.recorded_at
                ? new Date(item.recorded_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '--:--'}
            </Text>
          </View>

          {!!item.has_linked_meds && (
            <View style={styles.medLink}>
              <Ionicons name="medkit" size={12} color={COLORS.primary600} />
              <Text style={styles.medLinkText}>Có thuốc liên quan</Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  /* ================= Render ================= */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
        </TouchableOpacity>
        <Text style={styles.h1}>Nhật ký sức khỏe</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* PROFILE PICKER */}
      <View style={styles.filterWrapper}>
        {loadingProfiles ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.primary600} />
            <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="person-circle-outline" size={26} color="#94A3B8" />
            <Text style={styles.emptyText}>Chưa có hồ sơ nào.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileList}
          >
            {profiles.map((p) => {
              const pid = getProfileId(p);
              const active = selectedProfileId === pid;

              const name = getProfileName(p);
              const shortName = name.split(' ').pop() || name;

              return (
                <TouchableOpacity
                  key={pid}
                  onPress={() => setSelectedProfileId(pid)}
                  style={[styles.profileItem, active && styles.profileActive]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: active ? COLORS.primary600 : '#94A3B8' },
                    ]}
                  >
                    <Text style={styles.avatarText}>{shortName.charAt(0)}</Text>
                  </View>
                  <Text style={styles.profileName}>{shortName}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* LIST */}
      {loadingSymptoms ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.primary600} />
          <Text style={styles.loadingText}>
            Đang tải triệu chứng{selectedProfile ? ` • ${getProfileName(selectedProfile)}` : ''}...
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            profiles.length > 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="document-text-outline" size={26} color="#94A3B8" />
                <Text style={styles.emptyText}>Chưa có triệu chứng nào cho hồ sơ này.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.section}>
              <Text style={styles.dateHeader}>{item.date}</Text>
              {item.data.map((symptom) => (
                <View key={symptom.id}>
                  {renderSymptomItem({ item: symptom })}
                </View>
              ))}
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          // ✅ chỉ cho add khi có profile hợp lệ
          if (!isValidSelected(selectedProfileId, profiles)) return;
          navigation.navigate('AddSymptom', { profileId: selectedProfileId });
        }}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  h1: { fontSize: 18, fontWeight: '600', color: '#0F172A' },

  filterWrapper: { backgroundColor: '#F9FAFB', paddingVertical: 6 },
  profileList: { paddingHorizontal: 16 },
  profileItem: { alignItems: 'center', marginRight: 20, opacity: 0.6 },
  profileActive: { opacity: 1 },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: { color: 'white', fontWeight: 'bold' },
  profileName: { fontSize: 11, fontWeight: '600' },

  listContent: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 20 },
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
  },
  severityBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityScore: { fontSize: 20, fontWeight: 'bold' },
  severityLabel: { fontSize: 8, fontWeight: '700' },

  cardInfo: { flex: 1, marginLeft: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  symptomName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },

  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  timeText: { fontSize: 13, color: '#64748B' },

  medLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  medLinkText: { fontSize: 10, fontWeight: '700', color: COLORS.primary600 },

  fab: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary600,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  loadingWrap: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { color: '#64748B', fontWeight: '600' },

  emptyWrap: { padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: '#94A3B8', fontWeight: '600' },
});
