import { get, post, put, del } from "../utils/request";
// Import hàm delay để giả lập mạng
import { mockDelay } from "../mock/fakeData"; 

const PATH = "api/schedules";

// --- CÔNG TẮC: Đổi thành false khi có Backend thật ---
const USE_MOCK = true;

// Dữ liệu mẫu (Fake data) cho lịch nhắc
const MOCK_SCHEDULES = [
  { 
    id: 1, 
    prescription_id: 10, // Giả sử ID đơn thuốc là 10
    quantity: 1, 
    reminder_time: "08:00", 
    repeat_interval: "daily",
    repeat_every: 1,
    is_active: true 
  },
  { 
    id: 2, 
    prescription_id: 10, 
    quantity: 1, 
    reminder_time: "20:00", 
    repeat_interval: "daily", 
    repeat_every: 1,
    is_active: true 
  }
];

// Lấy tất cả lịch nhắc
export const getAllSchedules = async (token) => {
  if (USE_MOCK) {
    await mockDelay(500);
    return MOCK_SCHEDULES;
  }
  const res = await get(PATH, token);
  return res?.data || res || [];
};

// Lấy lịch nhắc theo ID đơn thuốc
export const getSchedulesByPrescription = async (token, prescriptionId) => {
  if (USE_MOCK) {
    await mockDelay(300);
    // Lọc fake data theo ID đơn thuốc
    return MOCK_SCHEDULES.filter(s => s.prescription_id == prescriptionId);
  }
  return await get(`${PATH}/prescription/${prescriptionId}`, token);
};

// Tạo lịch nhắc mới
export const createSchedule = async (token, data) => {
  if (USE_MOCK) {
    await mockDelay(800);
    console.log("📝 [MOCK] Tạo lịch nhắc:", data);
    // Trả về data kèm ID giả
    return { ...data, id: Date.now() };
  }
  return await post(PATH, data, token);
};

// Sửa lịch nhắc
export const updateSchedule = async (token, id, data) => {
  if (USE_MOCK) {
    await mockDelay(500);
    console.log("📝 [MOCK] Sửa lịch nhắc:", id, data);
    return { ...data, id };
  }
  return await put(`${PATH}/${id}`, data, token);
};

// Xóa lịch nhắc
export const deleteSchedule = async (token, id) => {
  if (USE_MOCK) {
    await mockDelay(500);
    console.log("🗑️ [MOCK] Đã xóa lịch:", id);
    return { success: true };
  }
  return await del(`${PATH}/${id}`, token);
};