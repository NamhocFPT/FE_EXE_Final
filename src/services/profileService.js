// src/services/profileService.js
import { get, post, put, del, patch } from "../utils/request";
// Import dữ liệu mẫu (Đảm bảo file fakeData.js của bạn có MOCK_PROFILES)
import { MOCK_PROFILES, mockDelay } from "../mock/fakeData";

// --- CẤU HÌNH ---
const PATH = "/patient-profiles";
const USE_MOCK = false; // Đổi thành false khi kết nối Backend thật
const PATH_REGIMENS = (profileId) =>
  `/patient-profiles/${encodeURIComponent(profileId)}/regimens`;
const PATH_PRESCRIPTIONS = (profileId) =>
  `/patient-profiles/${encodeURIComponent(profileId)}/prescriptions`;
const buildQuery = (params) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `?${qs}` : "";
};
// ==========================================
// 1. NHÓM HÀM QUẢN LÝ HỒ SƠ (CRUD)
// ==========================================

/**
 * UC-P1: Lấy danh sách hồ sơ (Sở hữu + Được chia sẻ)
 */
export const getProfiles = async () => {
  const res = await get(PATH, { scope: 'all' });
  return res?.data || res || [];
};
export const getProfiles1 = async (options = {}) => {
  const params = { scope: options.scope }; // "owned" | "shared" | "all"
  return await get(`${PATH}${buildQuery(params)}`);
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
  if (!id) throw new Error("profileId is required");

  if (USE_MOCK) {
    console.log(`👤 [MOCK] Đang cập nhật Profile ID: ${id}`);
    await mockDelay(800);

    const index = MOCK_PROFILES.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Không tìm thấy hồ sơ để cập nhật");

    MOCK_PROFILES[index] = {
      ...MOCK_PROFILES[index],
      ...data,
      // nếu UI có field "name" còn API dùng full_name, bạn có thể đồng bộ:
      full_name: data.full_name ?? MOCK_PROFILES[index].full_name,
      name: data.name ?? MOCK_PROFILES[index].name,
    };

    console.log("✅ [MOCK] Updated:", MOCK_PROFILES[index]);
    return MOCK_PROFILES[index];
  }

  // ✅ API thật: PATCH /patient-profiles/{profileId}
  // chỉ gửi các field có trong data (partial)
  return await patch(`${PATH}/${encodeURIComponent(id)}`, data);
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
export const getProfileDetail = async (profileId) => {
  if (!profileId) throw new Error("profileId is required");
  return await get(`${PATH}/${encodeURIComponent(profileId)}`);
};


/**
 * UC-P3 TAB ĐƠN THUỐC: Lấy danh sách đơn thuốc của hồ sơ
 */
export const getProfilePrescriptions = async (
  profileId,
  options = {} // { status, limit, offset }
) => {
  if (!profileId) throw new Error("profileId is required");

  if (USE_MOCK) {
    console.log("💊 [MOCK] Lấy danh sách đơn thuốc cho Profile ID:", profileId);
    await mockDelay(400);
    return [
      {
        id: "1",
        prescription_name: "Đơn thuốc điều trị tăng huyết áp",
        diagnosis: "Tăng huyết áp nguyên phát",
        doctor_name: "BS. Trần Minh Khoa",
        clinic_name: "Bệnh viện Đa khoa Tâm Anh",
        created_at: "2024-12-15",
        status: "active",
      },
      {
        id: "2",
        prescription_name: "Khám mắt định kỳ",
        diagnosis: "Cận thị nhẹ",
        doctor_name: "BS. Lê Thu Hà",
        clinic_name: "BV Mắt TP.HCM",
        created_at: "2024-11-20",
        status: "completed",
      },
    ];
  }

  const url = `${PATH_PRESCRIPTIONS(profileId)}${buildQuery({
    status: options.status,
    limit: options.limit,
    offset: options.offset,
  })}`;

  return await get(url);
};

/**
 * Regimens: List regimens for a profile
 * GET /api/v1/patient-profiles/{profileId}/regimens
 * Query: is_active?
 */
export const getProfileActiveRegimens = async (profileId, isActive = true) => {
  if (!profileId) throw new Error("profileId is required");

  if (USE_MOCK) {
    console.log("⏰ [MOCK] Lấy regimens cho Profile ID:", profileId);
    await mockDelay(400);
    return [];
  }

  const url = `${PATH_REGIMENS(profileId)}${buildQuery({
    // chỉ gửi khi có giá trị; theo contract là optional
    is_active: isActive,
  })}`;

  // ✅ gọi get(url) để chắc chắn query có trong URL
  return await get(url);
};

// src/services/profileService.js

// Tạo record chia sẻ mới (UC-SH1)
export const shareProfile = async (profileId, email, role) => {
  if (USE_MOCK) {
    await mockDelay(1000);
    return { success: true, message: "Đã gửi lời mời chia sẻ" };
  }
  // Gửi yêu cầu lên Server: POST /api/v1/profiles/share
  return await post("/profiles/share", {
    profile_id: profileId,
    email: email,
    role: role // 'caregiver' hoặc 'viewer'
  });
};

// Lấy danh sách những người đang được chia sẻ hồ sơ này
export const getSharedUsers = async (profileId) => {
  if (USE_MOCK) {
    await mockDelay(800);
    return [
      { id: '1', email: 'tranmai@example.com', name: 'Trần Mai', role: 'caregiver', sharedAt: '15/12/2024' },
    ];
  }
  return await get(`/profiles/${profileId}/shares`);
};

// Hủy chia sẻ (Thu hồi quyền)
export const unshareProfile = async (shareId) => {
  if (USE_MOCK) return await mockDelay(500);
  return await del(`/profiles/shares/${shareId}`);
};