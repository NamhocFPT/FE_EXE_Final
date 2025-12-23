import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  Alert
} from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { Ionicons, Feather } from "@expo/vector-icons";
import ImageView from "react-native-image-viewing";
// --- SERVICES ---
import {
  getPrescriptions,
  getAdherenceLogs,
  updatePrescriptionStatus
} from "../services/prescriptionService";

import AddPrescriptionScreen from "./AddPrescriptionScreen";

/* Reusable Components */
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Chip = ({ label, color = COLORS.accent700, bg = COLORS.primary100, onPress, active }) => (
  <TouchableOpacity disabled={!onPress} onPress={onPress} activeOpacity={0.8}
    style={[styles.chip, { backgroundColor: active ? COLORS.primary600 : bg }]}
  >
    <Text style={[styles.chipText, { color: active ? COLORS.white : color }]}>{label}</Text>
  </TouchableOpacity>
);

export default function MyPrescriptionsScreen({ onBackHome, activeProfileId, navigation }) {
  const [filter, setFilter] = useState("active");
  const [prescriptions, setPrescriptions] = useState([]);
  const [adherenceLogs, setAdherenceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imagesForView = selectedPrescription?.prescription_files?.map(f => ({ uri: f.file_url })) || [];
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // UC-RX3: Lấy dữ liệu đơn thuốc lồng nhau
      const [rxData, logsData] = await Promise.all([
        getPrescriptions(activeProfileId),
        getAdherenceLogs(activeProfileId)
      ]);
      setPrescriptions(rxData || []);
      setAdherenceLogs(logsData || []);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeProfileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSorted = useMemo(() => {
    let data = filter === "all" ? prescriptions : prescriptions.filter(p => p.status === filter);
    return [...data].sort((a, b) => new Date(b.issued_date) - new Date(a.issued_date));
  }, [filter, prescriptions]);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title & Add Button (UC-RX1) */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Đơn thuốc của Tôi</Text>

          </View>
          {/* <TouchableOpacity style={styles.btnAddMain} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.btnTextWhite}>Thêm đơn</Text>
          </TouchableOpacity> */}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          <Chip label="Đang dùng" active={filter === "active"} onPress={() => setFilter("active")} />
          <Chip label="Hoàn thành" active={filter === "completed"} onPress={() => setFilter("completed")} />
          <Chip label="Tất cả" active={filter === "all"} onPress={() => setFilter("all")} />
        </View>

        {/* Danh sách đơn thuốc hiển thị thuốc cụ thể (UC-RX3) */}
        {loading ? <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 20 }} /> : (
          filteredSorted.map((pres) => (
            <TouchableOpacity key={pres.id} onPress={() => setSelectedPrescription(pres)}>
              <Card style={styles.prescriptionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}><Ionicons name="document-text" size={24} color={COLORS.primary600} /></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.doctorName}>{pres.prescriber_name}</Text>
                    <Text style={styles.facilityName}>{pres.facility_name}</Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: pres.status === 'active' ? '#DCFCE7' : '#F3F4F6' }]}>
                    <Text style={{ fontSize: 10, color: pres.status === 'active' ? '#16A34A' : '#6B7280' }}>
                      {pres.status === 'active' ? "Đang dùng" : "Xong"}
                    </Text>
                  </View>
                </View>

                {/* HIỂN THỊ TÊN THUỐC CỤ THỂ (SỬA LỖI DẤU *) */}
                <View style={styles.medicineListInner}>
                  {pres.prescription_items?.map((item, idx) => (
                    <View key={idx} style={styles.medicineRow}>
                      <Ionicons name="medical" size={12} color={COLORS.primary600} />
                      <Text style={styles.medicineText}>{item.original_name_text || item.medication_name}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.footerRow}>
                  <Text style={styles.dateText}>Ngày khám: {formatDate(pres.issued_date)}</Text>
                  {pres.prescription_files?.length > 0 && (
                    <View style={styles.fileBadge}><Ionicons name="image" size={12} color={COLORS.primary600} /><Text style={styles.fileText}>{pres.prescription_files.length}</Text></View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* UC-RX1: Modal Thêm đơn thuốc */}
      <Modal visible={addModalVisible} animationType="slide"><AddPrescriptionScreen navigation={{ goBack: () => setAddModalVisible(false) }} onSuccess={() => { setAddModalVisible(false); fetchData(); }} /></Modal>

      {/* UC-RX3 & UC-RX6: Modal Chi tiết & Hoàn thành */}
      <Modal visible={!!selectedPrescription} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={{ width: '90%', maxHeight: '80%' }}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Chi tiết đơn thuốc</Text>
              <TouchableOpacity onPress={() => setSelectedPrescription(null)}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 16 }}>
              <Text style={styles.labelTitle}>Bác sĩ: {selectedPrescription?.prescriber_name}</Text>
              <Text style={styles.labelTitle}>Chẩn đoán: {selectedPrescription?.diagnosis || "N/A"}</Text>
              <View style={styles.divider} />
              {selectedPrescription?.prescription_items?.map((item, idx) => (
                <View key={idx} style={styles.detailItem}>
                  <Text style={styles.medicineNameLarge}>{item.original_name_text}</Text>
                  <Text style={styles.medicineSub}>{item.dose_amount} {item.dose_unit} • {item.frequency_text} • {item.duration_days} ngày</Text>
                </View>
              ))}
              {/* BỔ SUNG: HIỂN THỊ ẢNH ĐƠN THUỐC (UC-RX4) */}
              {selectedPrescription?.prescription_files?.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.dateLabel, { marginBottom: 8 }]}>Ảnh toa thuốc</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedPrescription.prescription_files.map((file, fIdx) => (
                      <TouchableOpacity
                        key={fIdx}
                        onPress={() => {
                          setCurrentImageIndex(fIdx);
                          setIsImageViewerVisible(true);
                        }}
                      >
                        <Image
                          source={{ uri: file.file_url }}
                          style={styles.prescriptionImagePreview} // Đảm bảo đã định nghĩa style này
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {selectedPrescription?.note && (
                <View style={styles.noteContainer}>
                  <Text style={styles.noteText}>{selectedPrescription.note}</Text>
                </View>
              )}
            </ScrollView>
            {selectedPrescription?.status === 'active' && (
              <TouchableOpacity style={styles.btnComplete} onPress={async () => { await updatePrescriptionStatus(selectedPrescription.id, 'completed'); setSelectedPrescription(null); fetchData(); }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Hoàn thành đơn thuốc</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>
      </Modal>

      <ImageView
        images={imagesForView}
        imageIndex={currentImageIndex}
        visible={isImageViewerVisible}
        onRequestClose={() => setIsImageViewerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h1: { fontSize: 24, fontWeight: "700", color: "#111827" },
  linkBlue: { color: COLORS.primary600, fontWeight: "600", marginTop: 4 },
  btnAddMain: { backgroundColor: COLORS.primary600, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 4 },
  btnTextWhite: { color: 'white', fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  facilityName: { fontSize: 13, color: '#6B7280' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  medicineListInner: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  medicineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  medicineText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  fileBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F9FF', padding: 4, borderRadius: 6 },
  fileText: { fontSize: 10, color: COLORS.primary600, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  labelTitle: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  detailItem: { marginBottom: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10 },
  medicineNameLarge: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  medicineSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  btnComplete: { backgroundColor: '#10B981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});