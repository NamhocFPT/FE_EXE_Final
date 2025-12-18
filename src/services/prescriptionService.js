// src/services/prescriptionService.js
import { get, post, put, del } from "../utils/request";
// Import dữ liệu giả (đảm bảo file fakeData cũng dùng snake_case nếu được)
import { MOCK_PRESCRIPTIONS, MOCK_MEDICINES, mockDelay } from "../mock/fakeData";

// --- CẤU HÌNH ---
const USE_MOCK = true;

// Endpoint chuẩn theo API Contract
const PATH_PRESCRIPTIONS = "/prescriptions";        // Đơn thuốc (tờ giấy chỉ định)
const PATH_REGIMENS = "/medication-regimens";       // Phác đồ/Lịch uống (quan trọng nhất để hiện list thuốc)
const PATH_DRUGS = "/drug-products";                // Danh mục thuốc
const PATH_INTAKE_EVENTS = "/medication-intake-events"; // Lịch sử uống thuốc

// --- 1. QUẢN LÝ ĐƠN THUỐC (Doctor's Prescriptions) ---

// Lấy danh sách đơn thuốc (Lọc theo Profile)
// Contract: GET /api/v1/prescriptions?profile_id=...
export const getPrescriptions = async (profileId) => {
  if (USE_MOCK) {
    console.log("💊 [MOCK] Lấy danh sách đơn thuốc profileId:", profileId);
    await mockDelay(1000);
    // Lọc mock data theo profileId
    return MOCK_PRESCRIPTIONS.filter(p => p.profile_id === profileId) || [];
  }

  // Gọi API thật (request.js tự thêm token)
  const params = profileId ? { profile_id: profileId } : {};
  return await get(PATH_PRESCRIPTIONS, params);
};

// Tạo đơn thuốc mới (Chỉ tạo thông tin chung: Bác sĩ, Chẩn đoán...)
// Contract: POST /api/v1/prescriptions
export const createPrescription = async (data) => {
  // Mapping: UI (camelCase) -> DB (snake_case)
  const payload = {
    profile_id: data.profileId,
    doctor_name: data.doctorName,
    diagnosis: data.diagnosis,
    prescription_date: data.date || new Date().toISOString(),
    notes: data.notes,
    image_url_1: data.image // DB hỗ trợ image_url_1, image_url_2...
  };

  if (USE_MOCK) {
    console.log("💊 [MOCK] Tạo đơn thuốc:", payload);
    await mockDelay(1500);
    return { ...payload, id: Date.now() };
  }

  return await post(PATH_PRESCRIPTIONS, payload);
};

// --- 2. QUẢN LÝ PHÁC ĐỒ / THUỐC ĐANG UỐNG (Medication Regimens) ---
// Đây mới là hàm lấy danh sách "Thuốc" hiển thị ở màn hình MyPrescriptions

export const getMedicationRegimens = async (profileId) => {
  if (USE_MOCK) {
     await mockDelay(800);
     return []; // Trả về mock regimens
  }
  // Contract: GET /api/v1/medication-regimens
  return await get(PATH_REGIMENS, { profile_id: profileId });
};

export const createMedicationRegimen = async (data) => {
    // Hàm này dùng để thêm thuốc vào đơn
    const payload = {
        profile_id: data.profileId,
        prescription_item_id: data.prescriptionItemId, // ID của thuốc trong đơn
        start_date: data.startDate,
        end_date: data.endDate,
        frequency_type: data.frequencyType, // 'daily', 'weekly'
        frequency_value: data.frequencyValue // Số lần
    };
    return await post(PATH_REGIMENS, payload);
}

// --- 3. TRA CỨU THUỐC (Drug Products) ---

// Tìm thuốc theo tên
// Contract: GET /api/v1/drug-products?search=...
export const searchMedicines = async (keyword) => {
  if (USE_MOCK) {
    console.log(`💊 [MOCK] Tìm thuốc: "${keyword}"`);
    await mockDelay(500);
    if (!keyword) return [];
    return MOCK_MEDICINES.filter(m => 
      m.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  return await get(PATH_DRUGS, { search: keyword });
};

// --- 4. NHẬT KÝ TUÂN THỦ (Adherence Logs) ---

// Lấy lịch sử uống thuốc
// Contract: GET /api/v1/medication-intake-events
export const getAdherenceLogs = async (profileId, fromDate, toDate) => {
  if (USE_MOCK) {
    await mockDelay(500);
    return [
      {
        id: 101,
        scheduled_time: new Date().toISOString(),
        status: "taken", // 'taken', 'skipped', 'missed'
        medication_regimen: {
            medication_name: "Paracetamol (Mock)"
        }
      }
    ];
  }

  const params = {
      profile_id: profileId,
      from_date: fromDate,
      to_date: toDate
  };
  return await get(PATH_INTAKE_EVENTS, params);
};