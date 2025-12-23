import { get, post, put, del } from "../utils/request";
import { MOCK_PRESCRIPTIONS, MOCK_MEDICINES, mockDelay } from "../mock/fakeData";

// --- CẤU HÌNH ---
const USE_MOCK = true;

// Endpoint chuẩn theo API Contract
const PATH_PRESCRIPTIONS = "/prescriptions";
const PATH_REGIMENS = "/medication-regimens";
const PATH_DRUGS = "/drug-products";
const PATH_INTAKE_EVENTS = "/medication-intake-events";

// --- 1. QUẢN LÝ ĐƠN THUỐC (Prescriptions) ---

/**
 * UC-RX3: Lấy danh sách đơn thuốc (kèm Items & Files)
 * Lọc theo profile_id của bệnh nhân
 */
export const getPrescriptions = async (profileId) => {
  if (USE_MOCK) {
    console.log("💊 [MOCK] Lấy danh sách đơn thuốc profileId:", profileId);
    await mockDelay(1000);
    return MOCK_PRESCRIPTIONS.filter(p => p.profile_id === profileId) || [];
  }
  return await get(PATH_PRESCRIPTIONS, { profile_id: profileId });
};

/**
 * UC-RX1: Tạo đơn thuốc mới (Header)
 * Mapping: UI (camelCase) -> DB (snake_case)
 */
export const createPrescription = async (data) => {
  const payload = {
    profile_id: data.profileId,
    prescriber_name: data.doctorName, 
    facility_name: data.facilityName, 
    issued_date: data.date || new Date().toISOString(),
    notes: data.notes,
    diagnosis: data.diagnosis,
    source_type: data.sourceType || 'manual' // manual hoặc scan
  };

  if (USE_MOCK) {
    console.log("💊 [MOCK] Tạo đơn thuốc:", payload);
    await mockDelay(1500);
    return { 
      ...payload, 
      id: "pres_" + Date.now(), 
      status: 'active',
      prescription_items: [],
      prescription_files: [] 
    };
  }
  return await post(PATH_PRESCRIPTIONS, payload);
};

/**
 * UC-RX6: Cập nhật trạng thái đơn thuốc (Hoàn thành/Hủy)
 */
export const updatePrescriptionStatus = async (id, status) => {
  if (USE_MOCK) {
    await mockDelay(500);
    return { id, status };
  }
  return await put(`${PATH_PRESCRIPTIONS}/${id}/status`, { status });
};

// --- 2. QUẢN LÝ THUỐC TRONG ĐƠN (Prescription Items / Regimens) ---

/**
 * UC-RX2: Thêm thuốc vào đơn
 * Kết hợp tạo Regimen để quản lý lịch nhắc uống
 */
export const createMedicationRegimen = async (data) => {
  const payload = {
    profile_id: data.profileId,
    prescription_item_id: data.prescriptionItemId, 
    display_name: data.medicationName,
    dose_amount: data.doseAmount,
    dose_unit: data.doseUnit,
    route: data.route,
    start_date: data.startDate,
    end_date: data.endDate,
    frequency_type: data.frequencyType, // 'daily', 'weekly'
    frequency_value: data.frequencyValue || 1,
    schedule_payload: { times: data.times || [] } // Lưu mảng giờ uống
  };

  if (USE_MOCK) {
    console.log("💊 [MOCK] Đang thêm thuốc vào đơn:", payload.display_name);
    await mockDelay(1000);
    return {
      id: "reg-" + Date.now(),
      ...payload,
      status: 'active'
    };
  }
  return await post(PATH_REGIMENS, payload);
};

/**
 * UC-RX5: Xóa thuốc khỏi đơn
 */
export const deletePrescriptionItem = async (itemId) => {
  if (USE_MOCK) {
    await mockDelay(500);
    return { success: true, id: itemId };
  }
  return await del(`${PATH_REGIMENS}/${itemId}`);
};

/**
 * Lấy phác đồ thuốc đang sử dụng (Dùng cho màn hình danh sách thuốc lẻ)
 */
export const getMedicationRegimens = async (profileId) => {
  if (USE_MOCK) {
    await mockDelay(800);
    return []; 
  }
  return await get(PATH_REGIMENS, { profile_id: profileId });
};

// --- 3. TIỆN ÍCH: TRA CỨU & FILE ---

/**
 * UC-RX4: Upload ảnh đơn thuốc
 */
export const uploadPrescriptionFile = async (prescriptionId, fileUri) => {
  if (USE_MOCK) {
    await mockDelay(1500);
    return { id: "file_" + Date.now(), file_url: fileUri, file_type: 'image' };
  }
  const formData = new FormData();
  formData.append('file', { 
    uri: fileUri, 
    name: 'prescription.jpg', 
    type: 'image/jpeg' 
  });
  return await post(`${PATH_PRESCRIPTIONS}/${prescriptionId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * Tìm kiếm danh mục thuốc
 */
export const searchMedicines = async (keyword) => {
  if (USE_MOCK) {
    await mockDelay(500);
    if (!keyword) return [];
    return MOCK_MEDICINES.filter(m =>
      m.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  return await get(PATH_DRUGS, { search: keyword });
};

/**
 * Lấy lịch sử tuân thủ thuốc
 */
export const getAdherenceLogs = async (profileId, fromDate, toDate) => {
  if (USE_MOCK) {
    await mockDelay(500);
    return [
      {
        id: 101,
        scheduled_time: new Date().toISOString(),
        status: "taken", // 'taken', 'skipped', 'missed'
        medication_regimen: { medication_name: "Paracetamol (Mock)" }
      }
    ];
  }
  return await get(PATH_INTAKE_EVENTS, { 
    profile_id: profileId, 
    from_date: fromDate, 
    to_date: toDate 
  });
};