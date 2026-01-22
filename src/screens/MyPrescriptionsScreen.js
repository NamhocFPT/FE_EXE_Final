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
  Alert,
} from "react-native";
import { COLORS } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import ImageView from "react-native-image-viewing";

import {
  getProfilePrescriptions,
  getPrescriptionDetail,
  updatePrescriptionStatus,
} from "../services/prescriptionService";

import { getProfiles } from "../services/profileService";
import AddPrescriptionScreen from "./AddPrescriptionScreen";

/* Reusable Components */
const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

const Chip = ({ label, color = COLORS.accent700, bg = COLORS.primary100, onPress, active }) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.chip, { backgroundColor: active ? COLORS.primary600 : bg }]}
  >
    <Text style={[styles.chipText, { color: active ? COLORS.white : color }]}>{label}</Text>
  </TouchableOpacity>
);

const pickArray = (res) => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

export default function MyPrescriptionsScreen({ navigation, route }) {
  // ===== profile filter =====
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(route?.params?.profileId || null);

  // ===== list =====
  const [filter, setFilter] = useState("active"); // active | completed | all
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== detail modal =====
  const [selectedPrescription, setSelectedPrescription] = useState(null); // store summary
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPrescriptionDetail, setSelectedPrescriptionDetail] = useState(null); // {prescription, items[], files[]}

  // ===== add modal =====
  const [addModalVisible, setAddModalVisible] = useState(false);

  // ===== image viewer =====
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ===== 1) Load profiles =====
  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const res = await getProfiles();
      const list = pickArray(res);
      const safe = Array.isArray(list) ? list : [];
      setProfiles(safe);

      // default profile: route.profileId > self > first
      if (!selectedProfileId && safe.length > 0) {
        const selfProfile = safe.find((p) => p?.relationship_to_owner === "self");
        setSelectedProfileId(selfProfile?.id || safe[0]?.id);
      }
    } catch (e) {
      console.error("loadProfiles error:", e);
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // ===== 2) Fetch prescriptions by profile =====
  const fetchPrescriptions = useCallback(async () => {
    if (!selectedProfileId) return;

    setLoading(true);
    try {
      const params =
        filter === "all"
          ? { limit: 50, offset: 0 }
          : { status: filter, limit: 50, offset: 0 };

      const rxRes = await getProfilePrescriptions(selectedProfileId, params);
      setPrescriptions(pickArray(rxRes));
    } catch (err) {
      console.error("fetchPrescriptions error:", err);
      Alert.alert("Lỗi", err?.message || "Không thể tải đơn thuốc.");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, filter]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // ===== 3) Open detail modal + load detail by API =====
  const openPrescriptionDetail = async (prescriptionSummary) => {
    setSelectedPrescription(prescriptionSummary);
    setSelectedPrescriptionDetail(null);
    setDetailLoading(true);

    try {
      const res = await getPrescriptionDetail(prescriptionSummary.id);
      const payload = res?.data ?? res;

      // Backend contract: { prescription, items[], files[] }
      const detail = payload?.prescription
        ? payload
        : {
          prescription: payload,
          items: payload?.items || payload?.prescription_items || [],
          files: payload?.files || payload?.prescription_files || [],
        };

      setSelectedPrescriptionDetail(detail);
    } catch (e) {
      console.error("openPrescriptionDetail error:", e);
      Alert.alert("Lỗi", e?.message || "Không thể tải chi tiết đơn thuốc.");
    } finally {
      setDetailLoading(false);
    }
  };

  // ===== computed =====
  const filteredSorted = useMemo(() => {
    const data = prescriptions || [];
    return [...data].sort(
      (a, b) => new Date(b.issued_date || 0) - new Date(a.issued_date || 0)
    );
  }, [prescriptions]);

  const formatDate = (isoOrDate) => {
    if (!isoOrDate) return "";
    const d = new Date(isoOrDate);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;
  };

  const imagesForView = useMemo(() => {
    const files = selectedPrescriptionDetail?.files || [];
    return (files || [])
      .map((f) => ({ uri: f?.file_url || f?.url || f?.uri }))
      .filter((x) => !!x?.uri);
  }, [selectedPrescriptionDetail]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const showBusy = profilesLoading || loading;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Đơn thuốc</Text>
            {!!selectedProfile?.full_name && (
              <Text style={{ color: "#6B7280", marginTop: 4 }}>
                Hồ sơ: {selectedProfile.full_name}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            style={styles.addBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE FILTER */}
        <View style={styles.filterWrapper}>
          {profilesLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={COLORS.primary600} />
              <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.profileList}
            >
              {profiles.map((p) => {
                const active = selectedProfileId === p.id;
                const shortName = (p.full_name || p.name || "").split(" ").pop() || "Hồ sơ";

                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProfileId(p.id)}
                    style={[styles.profileItem, active && styles.profileActive]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: active ? COLORS.primary600 : "#94A3B8" },
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

        {/* FILTER STATUS */}
        <View style={styles.tabRow}>
          <Chip label="Đang dùng" active={filter === "active"} onPress={() => setFilter("active")} />
          <Chip
            label="Hoàn thành"
            active={filter === "completed"}
            onPress={() => setFilter("completed")}
          />
          <Chip label="Tất cả" active={filter === "all"} onPress={() => setFilter("all")} />
        </View>

        {/* LIST */}
        {showBusy ? (
          <ActivityIndicator color={COLORS.primary600} style={{ marginTop: 20 }} />
        ) : filteredSorted.length === 0 ? (
          <Card>
            <Text style={{ color: "#6B7280" }}>Chưa có đơn thuốc nào cho hồ sơ này.</Text>
          </Card>
        ) : (
          filteredSorted.map((pres) => (
            <TouchableOpacity key={pres.id} onPress={() => openPrescriptionDetail(pres)}>
              <Card style={styles.prescriptionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text" size={24} color={COLORS.primary600} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.doctorName}>
                      {pres.prescriber_name || "Bác sĩ (chưa rõ)"}
                    </Text>
                    <Text style={styles.facilityName}>
                      {pres.facility_name || "Cơ sở (chưa rõ)"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusTag,
                      { backgroundColor: pres.status === "active" ? "#DCFCE7" : "#F3F4F6" },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: pres.status === "active" ? "#16A34A" : "#6B7280",
                      }}
                    >
                      {pres.status === "active"
                        ? "Đang dùng"
                        : pres.status === "completed"
                          ? "Xong"
                          : pres.status === "cancelled"
                            ? "Đã huỷ"
                            : pres.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <Text style={styles.dateText}>Ngày khám: {formatDate(pres.issued_date)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ADD MODAL */}
      <Modal visible={addModalVisible} animationType="slide">
        <AddPrescriptionScreen
          navigation={{ goBack: () => setAddModalVisible(false), navigate: navigation.navigate }}
          route={{ params: { profileId: selectedProfileId } }}
          onSuccess={() => {
            setAddModalVisible(false);
            fetchPrescriptions();
          }}
        />
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={!!selectedPrescription} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={{ width: "90%", maxHeight: "80%" }}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Chi tiết đơn thuốc</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedPrescription(null);
                  setSelectedPrescriptionDetail(null);
                }}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.primary600} />
            ) : (
              <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.labelTitle}>
                  Bác sĩ: {selectedPrescriptionDetail?.prescription?.prescriber_name || "N/A"}
                </Text>
                <Text style={styles.labelTitle}>
                  Cơ sở: {selectedPrescriptionDetail?.prescription?.facility_name || "N/A"}
                </Text>
                <Text style={styles.labelTitle}>
                  Ngày khám: {formatDate(selectedPrescriptionDetail?.prescription?.issued_date)}
                </Text>

                <View style={styles.divider} />

                {/* ITEMS */}
                {(selectedPrescriptionDetail?.items || []).length > 0 ? (
                  (selectedPrescriptionDetail.items || []).map((item, idx) => (
                    <View key={item?.id || idx} style={styles.detailItem}>
                      <Text style={styles.medicineNameLarge}>
                        {item.original_name_text || item.medication_name || "Thuốc"}
                      </Text>
                      <Text style={styles.medicineSub}>
                        {(item.dose_amount ?? "--")} {(item.dose_unit ?? "")} •{" "}
                        {item.frequency_text || "--"} • {item.duration_days ?? "--"} ngày
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: "#6B7280", fontStyle: "italic" }}>
                    Không có thuốc trong đơn.
                  </Text>
                )}

                {/* FILES / IMAGES */}
                {(selectedPrescriptionDetail?.files || []).length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={[styles.dateLabel, { marginBottom: 8 }]}>Ảnh toa thuốc</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {(selectedPrescriptionDetail.files || []).map((file, fIdx) => {
                        const uri = file?.file_url || file?.url || file?.uri;
                        if (!uri) return null;

                        return (
                          <TouchableOpacity
                            key={file?.id || fIdx}
                            onPress={() => {
                              // ✅ không setImagesForView nữa (vì imagesForView là useMemo)
                              setCurrentImageIndex(fIdx);
                              setIsImageViewerVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri }}
                              style={styles.prescriptionImagePreview}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {!!selectedPrescriptionDetail?.prescription?.note && (
                  <View style={styles.noteContainer}>
                    <Text style={styles.noteText}>{selectedPrescriptionDetail.prescription.note}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* COMPLETE */}
            {selectedPrescriptionDetail?.prescription?.status === "active" && (
              <TouchableOpacity
                style={styles.btnComplete}
                onPress={async () => {
                  try {
                    const id = selectedPrescriptionDetail?.prescription?.id;
                    if (!id) throw new Error("Missing prescription id");

                    await updatePrescriptionStatus(selectedPrescriptionDetail.prescription.id, "completed");

                    setSelectedPrescription(null);
                    setSelectedPrescriptionDetail(null);
                    fetchPrescriptions();
                  } catch (e) {
                    Alert.alert("Lỗi", e?.message || "Không thể cập nhật trạng thái.");
                  }
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>Hoàn thành đơn thuốc</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>
      </Modal>

      {/* IMAGE VIEWER */}
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  h1: { fontSize: 24, fontWeight: "700", color: "#111827" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary600,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: { color: "white", fontWeight: "700" },

  // profile filter
  filterWrapper: { backgroundColor: "#F9FAFB", paddingVertical: 6, marginBottom: 10 },
  profileList: { paddingHorizontal: 2 },
  profileItem: { alignItems: "center", marginRight: 16, opacity: 0.6 },
  profileActive: { opacity: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: { color: "white", fontWeight: "bold" },
  profileName: { fontSize: 11, fontWeight: "600", color: "#111827" },

  loadingWrap: { paddingHorizontal: 4, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { color: "#64748B", fontWeight: "600" },

  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  doctorName: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  facilityName: { fontSize: 13, color: "#6B7280" },

  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  dateText: { fontSize: 12, color: "#9CA3AF" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  labelTitle: { fontSize: 14, color: "#6B7280", marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },

  detailItem: { marginBottom: 12, padding: 12, backgroundColor: "#F9FAFB", borderRadius: 10 },
  medicineNameLarge: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  medicineSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  btnComplete: { backgroundColor: "#10B981", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },

  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: "600" },

  dateLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600", textTransform: "uppercase" },

  prescriptionImagePreview: { width: 84, height: 84, borderRadius: 12, marginRight: 10, backgroundColor: "#E5E7EB" },

  noteContainer: { marginTop: 12, padding: 12, backgroundColor: "#F3F4F6", borderRadius: 10 },
  noteText: { color: "#374151", fontSize: 13, lineHeight: 18 },
});
