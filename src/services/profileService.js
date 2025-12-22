// src/services/profileService.js
import { get, post, put, del } from "../utils/request";
// Import dữ liệu mẫu (Đảm bảo file fakeData.js của bạn có MOCK_PROFILES)
import { MOCK_PROFILES, mockDelay } from "../mock/fakeData";

// --- CẤU HÌNH ---
const PATH = "/patient-profiles";
const USE_MOCK = true; // Đổi thành false khi kết nối Backend thật

// ==========================================
// 1. NHÓM HÀM QUẢN LÝ HỒ SƠ (CRUD)
// ==========================================

/**
 * UC-P1: Lấy danh sách hồ sơ (Sở hữu + Được chia sẻ)
 */
export const getProfiles = async () => {
  if (USE_MOCK) {
    console.log("👤 [MOCK] Lấy danh sách Patient Profiles");
    await mockDelay(500);
    return MOCK_PROFILES || [];
  }
  const res = await get(PATH, { scope: 'all' });
  return res?.data || res || [];
};

/**
 * UC-P2: Tạo hồ sơ mới
 */
export const createProfile = async (data) => {
  const payload = {
    full_name: data.full_name,
    date_of_birth: data.date_of_birth ?? null,
    sex: data.sex ?? null,
    relationship_to_owner: data.relationship_to_owner ?? null,
    notes: data.notes ?? ""
  };

  if (USE_MOCK) {
    console.log("👤 [MOCK] Tạo Profile:", payload);
    await mockDelay(1000);
    
    // TẠO OBJECT MỚI CÓ ID
    const newProfile = { 
      ...payload, 
      id: Date.now().toString(),
      name: payload.full_name, // Map ngược lại cho UI nếu cần
      relationship: payload.relationship_to_owner,
      gender: payload.sex
    };

    // QUAN TRỌNG: Đẩy dữ liệu vào mảng MOCK để hàm GET lấy được
    MOCK_PROFILES.unshift(newProfile); 
    
    return newProfile;
  }
  return await post(PATH, payload);
};
/**
 * Cập nhật hồ sơ
 */
export const updateProfile = async (id, data) => {
  if (USE_MOCK) {
    console.log(`👤 [MOCK] Đang cập nhật Profile ID: ${id}`);
    await mockDelay(800);

    // 1. Tìm vị trí của hồ sơ trong mảng Mock
    const index = MOCK_PROFILES.findIndex(p => p.id === id);
    
    if (index !== -1) {
      // 2. Cập nhật dữ liệu mới vào mảng (giữ nguyên ID)
      // Lưu ý: Mapping từ full_name (API) sang name (UI nếu cần)
      MOCK_PROFILES[index] = { 
        ...MOCK_PROFILES[index], 
        ...data,
        full_name: data.full_name, // Đảm bảo trường này được cập nhật
      };
      
      console.log("✅ [MOCK] Đã cập nhật mảng:", MOCK_PROFILES[index]);
      return MOCK_PROFILES[index];
    }
    throw new Error("Không tìm thấy hồ sơ để cập nhật");
  }
  
  // Logic gọi API thật
  return await put(`${PATH}/${id}`, data);
};

/**
 * Xoá hồ sơ
 */
export const deleteProfile = async (id) => {
  if (USE_MOCK) {
    console.log(`👤 [MOCK] Xóa Profile ID: ${id}`);
    await mockDelay(500);
    
    // Xóa khỏi mảng MOCK
    const index = MOCK_PROFILES.findIndex(p => p.id === id);
    if (index !== -1) {
      MOCK_PROFILES.splice(index, 1);
    }
    return { success: true };
  }
  return await del(`${PATH}/${id}`);
};

// ==========================================
// 2. NHÓM HÀM CHI TIẾT HỒ SƠ (UC-P3)
// ==========================================

/**
 * Lấy thông tin cơ bản của 1 hồ sơ
 */
export const getProfileDetail = async (id) => {
  if (USE_MOCK) {
    console.log(`👤 [MOCK] Lấy chi tiết Profile ID: ${id}`);
    await mockDelay(300);
    return MOCK_PROFILES.find(p => p.id == id) || null;
  }
  return await get(`${PATH}/${id}`);
};

/**
 * UC-P3 TAB ĐƠN THUỐC: Lấy danh sách đơn thuốc của hồ sơ
 */
export const getProfilePrescriptions = async (profileId) => {
  if (USE_MOCK) {
    console.log("💊 [MOCK] Lấy danh sách đơn thuốc cho Profile ID:", profileId);
    await mockDelay(400);
    return [
      {
        id: '1',
        prescription_name: 'Đơn thuốc điều trị tăng huyết áp',
        diagnosis: 'Tăng huyết áp nguyên phát',
        doctor_name: 'BS. Trần Minh Khoa',
        clinic_name: 'Bệnh viện Đa khoa Tâm Anh',
        created_at: '2024-12-15',
        status: 'active'
      },
      {
        id: '2',
        prescription_name: 'Khám mắt định kỳ',
        diagnosis: 'Cận thị nhẹ',
        doctor_name: 'BS. Lê Thu Hà',
        clinic_name: 'BV Mắt TP.HCM',
        created_at: '2024-11-20',
        status: 'completed'
      }
    ];
  }
  // API: GET /api/v1/prescriptions?profile_id={profileId}
  return await get("/prescriptions", { profile_id: profileId });
};

/**
 * UC-P3 TAB ĐANG UỐNG: Lấy phác đồ thuốc đang hoạt động (Regimens)
 */
export const getProfileActiveRegimens = async (profileId) => {
  if (USE_MOCK) {
    console.log("⏰ [MOCK] Lấy phác đồ thuốc cho Profile ID:", profileId);
    await mockDelay(400);
    return []; // Trả về mảng rỗng nếu chưa có dữ liệu mẫu
  }
  // API: GET /api/v1/medication-regimens?profile_id={profileId}&status=active
  return await get("/medication-regimens", {
    profile_id: profileId,
    status: 'active'
  });
};