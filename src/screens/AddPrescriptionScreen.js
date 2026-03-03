import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";
import Card from "../components/Card";

// --- SERVICES ---
import { getProfiles } from "../services/profileService";
import {
  createPrescription,
  addPrescriptionItem,
} from "../services/prescriptionService";
import { searchDrugProducts } from "../services/drugProductService";

/* ===== Helpers ===== */
const pickArray = (res) => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const pickId = (res) => {
  const payload = res?.data ?? res;
  return payload?.id ?? payload?.data?.id ?? null;
};

const toYMD = (d) => {
  // API thường nhận YYYY-MM-DD cho issued_date/start_date/end_date
  const dt = d instanceof Date ? d : new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function AddPrescriptionScreen({ navigation, onSuccess }) {
  // --- PROFILES ---
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // --- PRESCRIPTION HEADER ---
  const [doctorName, setDoctorName] = useState(""); // map -> prescriber_name
  const [facilityName, setFacilityName] = useState(""); // map -> facility_name
  const [diagnosis, setDiagnosis] = useState(""); // ❗ contract không có -> chỉ giữ UI, không gửi nếu backend không hỗ trợ
  const [notes, setNotes] = useState(""); // map -> note
  const [date, setDate] = useState(new Date()); // map -> issued_date (YYYY-MM-DD)
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- MEDICINES LOCAL (to create prescription items) ---
  const [medicines, setMedicines] = useState([]);

  // --- MODAL ADD MED ---
  const [modalVisible, setModalVisible] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  // --- DRUG SEARCH AUTOCOMPLETE ---
  const [drugSearchQuery, setDrugSearchQuery] = useState("");
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [searchingDrugs, setSearchingDrugs] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);

  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",         // dose_amount?
    unit: "viên",       // dose_unit - default to Vietnamese
    route: "Uống",      // route?
    quantity: "",       // UI only (contract item không có quantity)
    frequency: "daily", // UI only -> map thành frequency_text
    duration: "7",      // duration_days?
    times: ["08:00"],   // UI only -> map vào frequency_text
    mealNote: "Sau ăn", // notes? hoặc original_instructions?
    instructions: "",   // original_instructions? (optional)
    drugProductId: null // drug_product_id from API
  });

  const [loading, setLoading] = useState(false);

  /* =========================
     DRUG SEARCH AUTOCOMPLETE
  ========================== */
  const handleDrugSearch = async (query) => {
    setDrugSearchQuery(query);
    setNewMed(prev => ({ ...prev, name: query })); // Fix stale closure

    // Close unit dropdown when searching drugs
    setShowUnitDropdown(false);

    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // If query is empty, hide suggestions
    if (!query || query.trim().length < 2) {
      setShowSuggestions(false);
      setDrugSuggestions([]);
      return;
    }

    // Debounce search (300ms)
    const timer = setTimeout(async () => {
      try {
        setSearchingDrugs(true);
        const results = await searchDrugProducts(query, { limit: 10 });
        console.log("🔍 Search results:", results);
        setDrugSuggestions(results || []);
        setShowSuggestions(true);
        setShowUnitDropdown(false); // Close unit dropdown when autocomplete shows
      } catch (error) {
        console.error("Drug search error:", error);
        setDrugSuggestions([]);
      } finally {
        setSearchingDrugs(false);
      }
    }, 300);

    setSearchDebounceTimer(timer);
  };

  const handleSelectDrug = (drug) => {
    console.log("🔍 Selected drug:", drug);

    // API returns nested structure: { drug_product: {...}, substances: [...] }
    const drugData = drug.drug_product || drug;

    const drugName = drugData.brand_name || drugData.name || "";
    console.log("📝 Setting drug name:", drugName);

    // Only auto-fill name and drugProductId, let user input dosage and select unit
    setNewMed(prev => ({
      ...prev,
      name: drugName,
      drugProductId: drugData.id,
      // Don't auto-fill dosage and unit - user will input manually
    }));

    setDrugSearchQuery(drugName);
    setShowSuggestions(false);
    setDrugSuggestions([]);

    console.log("✅ Drug selected, name set to:", drugName);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  /* =========================
     LOAD PROFILES (real API)
  ========================== */
  const loadProfiles = useCallback(async () => {
    try {
      setInitialLoading(true);
      const res = await getProfiles();
      const list = pickArray(res);
      setProfiles(list);

      if (list.length > 0) {
        // default profile
        const self = list.find((p) => p?.relationship_to_owner === "self");
        setSelectedProfileId(self?.id || list[0].id);
      } else {
        setSelectedProfileId(null);
      }
    } catch (err) {
      console.error("loadProfiles error:", err);
      Alert.alert("Lỗi", "Không thể tải danh sách hồ sơ: " + (err?.message || ""));
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  /* =========================
     TIME PICKER ADD TIME (Not used in UI, kept for logic compatibility if needed)
  ========================== */
  const onTimeChange = (event, selectedDate) => {
    // Android: event.type can be "dismissed"
    setShowTimePicker(false);
    if (!selectedDate) return;

    const hours = String(selectedDate.getHours()).padStart(2, "0");
    const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    if (!newMed.times.includes(timeStr)) {
      setNewMed((prev) => ({
        ...prev,
        times: [...prev.times, timeStr].sort(),
      }));
    }
  };

  /* =========================
     ADD MEDICINE (LOCAL)
  ========================== */
  const handleAddMedicine = () => {
    console.log("🔍 handleAddMedicine called, newMed:", newMed);
    console.log("📝 newMed.name:", newMed.name);

    if (!newMed.name.trim() || !String(newMed.dosage).trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Tên thuốc và Liều mỗi lần");
      return;
    }

    const durationDays = 7; // Default to 7 days as it's no longer in UI
    const medicationTimes = ["08:00"]; // Default to 8 AM as it's no longer in UI

    setMedicines((prev) => [
      ...prev,
      {
        ...newMed,
        id: Date.now(),
        durationDays,
        times: medicationTimes,
      },
    ]);

    // reset
    setNewMed({
      name: "",
      dosage: "",
      unit: "viên",
      route: "Uống",
      quantity: "",
      frequency: "daily",
      duration: "7",
      times: ["08:00"],
      mealNote: "Sau ăn",
      instructions: "",
      drugProductId: null
    });
    setDrugSearchQuery("");
    setShowSuggestions(false);
    setDrugSuggestions([]);
    setModalVisible(false);
  };

  const handleRemoveMedicine = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  /* =========================
     SAVE ALL (REAL API)
     - Create Prescription
     - Add Items
     - (Optional) Upload Files if backend supports
  ========================== */
  const handleSaveAll = async () => {
    if (!selectedProfileId) {
      Alert.alert("Lỗi", "Vui lòng chọn hồ sơ bệnh nhân");
      return;
    }
    if (!doctorName.trim() && !facilityName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập Bác sĩ hoặc Nơi khám");
      return;
    }
    if (medicines.length === 0) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất 1 loại thuốc vào đơn");
      return;
    }

    setLoading(true);
    try {
      // A) create prescription (header)
      const rxRes = await createPrescription(selectedProfileId, {
        prescriberName: doctorName,
        facilityName: facilityName,
        issuedDate: toYMD(date),
        note: notes,
        sourceType: "manual",
        // diagnosis: diagnosis, // ❗ contract không có -> chỉ gửi nếu backend có
      });

      const prescriptionId = pickId(rxRes);
      if (!prescriptionId) {
        throw new Error("Không lấy được prescriptionId từ server.");
      }
      console.log("✅ Created prescription:", prescriptionId);

      // B) add items
      // Map UI -> contract fields
      const start = toYMD(date);

      const itemPromises = medicines.map((m) => {
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + Number(m.durationDays || 7));
        const end = toYMD(endDate);

        // frequency_text: bạn tự format
        const timesText =
          Array.isArray(m.times) && m.times.length > 0 ? `(${m.times.join(", ")})` : "";
        const freqText =
          m.frequency === "daily"
            ? `${m.times.length} lần/ngày ${timesText}`.trim()
            : `Định kỳ ${timesText}`.trim();

        return addPrescriptionItem(prescriptionId, {
          original_name_text: m.name,
          original_instructions: m.instructions || m.mealNote || undefined,
          drug_product_id: m.drugProductId || undefined, // ✅ From autocomplete
          dose_amount: m.dosage,
          dose_unit: m.unit,
          frequency_text: freqText,
          route: m.route,
          duration_days: Number(m.durationDays || 7),
          start_date: start,
          end_date: end,
          is_prn: false,
          notes: m.mealNote || undefined,
          // drug_product_id/substance_id: nếu bạn có chọn từ search thì set vào đây
        });
      });

      await Promise.all(itemPromises);

      // C) upload images (OPTIONAL - only when backend supports)

      Alert.alert("Thành công", "Đã lưu đơn thuốc!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("MainTabs", {
              screen: "MyPrescriptions",
            });
          },
        },
      ]);
    } catch (error) {
      console.error("handleSaveAll error:", error);
      Alert.alert("Lỗi lưu đơn", error?.message || "Có lỗi xảy ra khi lưu");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================== */
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary600} />
          </TouchableOpacity>
          <Text style={styles.h1}>Thêm đơn thuốc</Text>
          <View style={{ width: 40 }} />
        </View>

        {initialLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary600} style={{ marginTop: 50 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1) CHỌN HỒ SƠ */}
            <Card style={styles.card}>
              <Text style={styles.label}>Hồ sơ bệnh nhân *</Text>
              <View style={styles.chipRow}>
                {profiles.map((profile) => (
                  <TouchableOpacity
                    key={profile.id}
                    style={[
                      styles.chip,
                      selectedProfileId === profile.id && styles.chipActive,
                    ]}
                    onPress={() => setSelectedProfileId(profile.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedProfileId === profile.id && styles.chipTextActive,
                      ]}
                    >
                      {profile.full_name || profile.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* 2) THÔNG TIN CHUNG */}
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin chung</Text>

              <Text style={styles.label}>Bác sĩ</Text>
              <TextInput
                style={styles.input}
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="VD: BS. Nguyễn Văn A"
              />

              <Text style={styles.label}>Nơi khám</Text>
              <TextInput
                style={styles.input}
                value={facilityName}
                onChangeText={setFacilityName}
                placeholder="VD: BV Bạch Mai"
              />

              {/* contract chưa có diagnosis -> giữ UI nếu bạn muốn */}
              <Text style={styles.label}>Chẩn đoán (tuỳ chọn)</Text>
              <TextInput
                style={styles.input}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder="VD: Viêm họng cấp"
              />

              <Text style={styles.label}>Ngày khám</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.text600} />
                <Text style={styles.datePickerText}>{date.toLocaleDateString("vi-VN")}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e, selected) => {
                    setShowDatePicker(false);
                    if (selected) setDate(selected);
                  }}
                />
              )}

              <Text style={styles.label}>Ghi chú đơn thuốc</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ghi chú chung..."
                multiline
              />
            </Card>

            {/* 3) DANH SÁCH THUỐC */}
            <View style={styles.medHeader}>
              <Text style={styles.sectionTitle}>Danh sách thuốc ({medicines.length})</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={{ color: COLORS.primary600, fontWeight: "bold" }}>+ Thêm thuốc</Text>
              </TouchableOpacity>
            </View>

            {medicines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa có thuốc nào.</Text>
                <Text style={styles.emptyText}>Bấm “+ Thêm thuốc” để nhập chi tiết.</Text>
              </View>
            ) : (
              medicines.map((med, index) => (
                <Card key={med.id} style={styles.medItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>
                      {index + 1}. {med.name}
                    </Text>
                    <Text style={styles.medDetail}>
                      {med.dosage} {med.unit} • {med.route}
                    </Text>
                    {med.mealNote && (
                      <Text style={styles.medSubDetail}>
                        Ghi chú: {med.mealNote}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveMedicine(med.id)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </Card>
              ))
            )}

            <View style={{ height: 110 }} />
          </ScrollView>
        )}

        {/* FOOTER BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
            onPress={handleSaveAll}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Lưu Đơn Thuốc</Text>}
          </TouchableOpacity>
        </View>

        {/* MODAL THÊM THUỐC */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>Thêm Thuốc</Text>

                  <View style={[
                    { marginBottom: 15 },
                    showSuggestions && { zIndex: 10000, elevation: 10000 }
                  ]}>
                    <Text style={styles.label}>Tên thuốc *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Gõ để tìm kiếm thuốc..."
                      value={drugSearchQuery}
                      onChangeText={handleDrugSearch}
                      onFocus={() => setShowUnitDropdown(false)}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searchingDrugs && (
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primary600}
                        style={{ position: 'absolute', right: 12, top: 12 }}
                      />
                    )}

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && drugSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        <ScrollView
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                          style={{ maxHeight: 200 }}
                        >
                          {drugSuggestions.map((item) => {
                            const drugData = item.drug_product || item;
                            return (
                              <TouchableOpacity
                                key={drugData.id}
                                style={styles.suggestionItem}
                                onPress={() => handleSelectDrug(item)}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.suggestionName}>
                                    {drugData.brand_name || drugData.name}
                                  </Text>
                                  <Text style={styles.suggestionDetail}>
                                    {drugData.strength_text} • {drugData.form} • {drugData.manufacturer}
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.text600} />
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {/* Empty State */}
                    {showSuggestions && !searchingDrugs && drugSuggestions.length === 0 && drugSearchQuery.length >= 2 && (
                      <View style={styles.suggestionsContainer}>
                        <View style={styles.emptyState}>
                          <Ionicons name="search-outline" size={32} color={COLORS.text600} />
                          <Text style={styles.emptyStateText}>Không tìm thấy thuốc</Text>
                          <Text style={styles.emptyStateSubtext}>Thử tìm với từ khóa khác</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Liều mỗi lần *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="VD: 1"
                        keyboardType="numeric"
                        value={String(newMed.dosage)}
                        onChangeText={(t) => setNewMed(prev => ({ ...prev, dosage: t }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Đơn vị *</Text>
                      <View>
                        <TouchableOpacity
                          style={styles.unitDropdown}
                          onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                        >
                          <Text style={styles.unitDropdownText}>
                            {(() => {
                              const units = {
                                'viên': 'Viên',
                                'túi': 'Túi',
                                'gói': 'Gói',
                                'ống': 'Ống',
                                'ml': 'ml',
                                'mg': 'mg',
                                'g': 'g',
                                'mcg': 'mcg',
                              };
                              return units[newMed.unit] || 'Viên';
                            })()}
                          </Text>
                          <Ionicons
                            name={showUnitDropdown ? "chevron-up" : "chevron-down"}
                            size={20}
                            color={COLORS.text600}
                          />
                        </TouchableOpacity>

                        {/* Dropdown List */}
                        {showUnitDropdown && (
                          <View style={styles.unitDropdownList}>
                            <ScrollView
                              nestedScrollEnabled
                              showsVerticalScrollIndicator={true}
                              style={{ maxHeight: 150 }}
                            >
                              {[
                                { value: 'viên', label: 'Viên' },
                                { value: 'túi', label: 'Túi' },
                                { value: 'gói', label: 'Gói' },
                                { value: 'ống', label: 'Ống' },
                                { value: 'ml', label: 'ml' },
                                { value: 'mg', label: 'mg' },
                                { value: 'g', label: 'g' },
                                { value: 'mcg', label: 'mcg' },
                              ].map((unit) => (
                                <TouchableOpacity
                                  key={unit.value}
                                  style={[
                                    styles.unitDropdownItem,
                                    newMed.unit === unit.value && styles.unitDropdownItemActive
                                  ]}
                                  onPress={() => {
                                    setNewMed(prev => ({ ...prev, unit: unit.value }));
                                    setShowUnitDropdown(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.unitDropdownItemText,
                                    newMed.unit === unit.value && styles.unitDropdownItemTextActive
                                  ]}>
                                    {unit.label}
                                  </Text>
                                  {newMed.unit === unit.value && (
                                    <Ionicons name="checkmark" size={18} color={COLORS.primary600} />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.label}>Đường dùng</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Uống"
                    value={newMed.route}
                    onChangeText={(t) => setNewMed({ ...newMed, route: t })}
                  />

                  <Text style={styles.label}>Ghi chú (tuỳ chọn)</Text>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    value={newMed.mealNote}
                    onChangeText={(t) => setNewMed({ ...newMed, mealNote: t })}
                    placeholder="VD: Sau ăn"
                    multiline
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                      <Text style={{ color: COLORS.text600 }}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmit} onPress={handleAddMedicine}>
                      <Text style={{ color: "white", fontWeight: "bold" }}>Xác nhận</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

/* ===== STYLES (giữ gần nguyên thiết kế của bạn) ===== */
const styles = StyleSheet.create({
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
    borderRadius: RADIUS.md,
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
  },
  datePickerText: { marginLeft: 8, color: COLORS.text900 },

  medHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  medItem: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 10 },
  medName: { fontSize: 15, fontWeight: "600", color: COLORS.text900 },
  medDetail: { fontSize: 13, color: COLORS.text900, marginTop: 2, fontWeight: "500" },
  medSubDetail: { fontSize: 12, color: COLORS.text600, marginTop: 1 },

  emptyBox: {
    padding: 20,
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
  },
  emptyText: { color: "#9CA3AF" },

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
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "white", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 24, gap: 12 },
  btnCancel: { paddingVertical: 12, paddingHorizontal: 20 },
  btnSubmit: { backgroundColor: COLORS.primary600, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },

  freqRow: { flexDirection: "row", gap: 6 },
  freqBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center" },
  freqBtnActive: { backgroundColor: COLORS.primary600 },
  freqText: { fontSize: 12, color: "#6B7280" },
  freqTextActive: { color: "white", fontWeight: "bold" },

  // Autocomplete styles
  suggestionsContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text900,
    marginBottom: 2,
  },
  suggestionDetail: {
    fontSize: 12,
    color: COLORS.text600,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text600,
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: COLORS.text600,
    marginTop: 4,
  },

  // Unit dropdown styles
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.line300,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  unitDropdownText: {
    fontSize: 14,
    color: COLORS.text900,
    fontWeight: '500',
  },
  unitDropdownList: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.line300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  unitDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unitDropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  unitDropdownItemText: {
    fontSize: 14,
    color: COLORS.text900,
    fontWeight: '500',
  },
  unitDropdownItemTextActive: {
    color: COLORS.primary600,
    fontWeight: '700',
  },
});