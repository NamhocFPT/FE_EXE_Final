// src/services/scheduleService.js
import { get, post, put, del } from "../utils/request"; // request.js tự xử lý token
import { mockDelay } from "../mock/fakeData";

// --- CẤU HÌNH API ---
// "Regimen": Quy tắc/Phác đồ (VD: Uống hàng ngày lúc 8h)
const PATH_REGIMENS = "/medication-regimens";
const PATH_INTAKE_LIST = (profileId) =>
  `/patient-profiles/${encodeURIComponent(profileId)}/intake-events`;

const buildQuery = (params) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `?${qs}` : "";
};

const USE_MOCK = false;

// Mock Data chuẩn snake_case theo DB
const MOCK_INTAKE_EVENTS = [
  {
    id: 101,
    regimen_id: 1,
    medication_name: "Panadol Extra", // Join từ bảng thuốc
    scheduled_time: "2023-10-25T08:00:00Z",
    status: "pending", // pending, taken, skipped
    actual_taken_time: null
  },
  {
    id: 102,
    regimen_id: 1,
    medication_name: "Vitamin C",
    scheduled_time: "2023-10-25T12:00:00Z",
    status: "taken",
    actual_taken_time: "2023-10-25T12:05:00Z"
  }
];

// --- 1. LẤY LỊCH NHẮC (Cho màn hình ScheduleScreen) ---
// Contract: GET /api/v1/medication-intake-events?from_date=...&to_date=...
export const getDailySchedules = async (date, profileId, options = {}) => {
  // date format: YYYY-MM-DD
  if (!profileId) throw new Error("profileId is required");

  if (USE_MOCK) {
    console.log(`📅 [MOCK] Lấy lịch ngày ${date} cho profile ${profileId}`);
    await mockDelay(500);
    return MOCK_INTAKE_EVENTS;
  }

  const from = date.includes("T") ? date : `${date}T00:00:00Z`;
  const to = date.includes("T") ? date : `${date}T23:59:59Z`;

  const params = {
    from,
    to,
    status: options.status,
    regimen_id: options.regimenId,
  };

  const url = `${PATH_INTAKE_LIST(profileId)}${buildQuery(params)}`;

  // ✅ gọi get(url) để tránh utils/get không append params
  return await get(url);
};

// --- 2. CẬP NHẬT TRẠNG THÁI (Đã uống / Bỏ qua) ---
// Contract: PATCH /api/v1/medication-intake-events/{id}
export const updateScheduleStatus = async (id, status) => {
  // status: 'taken' | 'skipped' | 'pending'
  const payload = {
    status: status,
    actual_taken_time: status === 'taken' ? new Date().toISOString() : null
  };

  if (USE_MOCK) {
    console.log(`✅ [MOCK] Đổi trạng thái ID ${id} thành: ${status}`);
    await mockDelay(300);
    return { id, ...payload };
  }

  // Trong request.js bạn cần có hàm patch, nếu chưa có thì dùng put
  // Nhưng chuẩn REST là PATCH
  return await put(`${PATH_INTAKE}/${id}`, payload);
};

// --- 3. TẠO LỊCH NHẮC MỚI (Tạo quy tắc uống) ---
// Contract: POST /api/v1/medication-regimens
export const createSchedule = async (data) => {
  // Mapping UI -> DB
  const payload = {
    profile_id: data.profileId,
    medication_name: data.medicationName, // Tên thuốc
    start_date: data.startDate,           // Ngày bắt đầu uống
    frequency_type: "daily",              // Tạm thời fix cứng hoặc lấy từ data
    // Các khung giờ uống (VD: ["08:00", "20:00"])
    // Lưu ý: Backend cần xử lý logic tạo ra intake_events từ list giờ này
    reminder_times: data.reminderTimes
  };

  if (USE_MOCK) {
    await mockDelay(800);
    console.log("📝 [MOCK] Tạo phác đồ:", payload);
    return { ...payload, id: Date.now() };
  }

  return await post(PATH_REGIMENS, payload);
};

// --- 4. XÓA LỊCH NHẮC (Xóa quy tắc) ---
// Contract: DELETE /api/v1/medication-regimens/{id}
export const deleteSchedule = async (id) => {
  if (USE_MOCK) {
    await mockDelay(500);
    console.log("🗑️ [MOCK] Đã xóa phác đồ:", id);
    return { success: true };
  }
  return await del(`${PATH_REGIMENS}/${id}`);
};