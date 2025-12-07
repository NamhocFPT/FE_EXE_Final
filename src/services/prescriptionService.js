import { get, post } from "../utils/request";

// --- QUẢN LÝ ĐƠN THUỐC (Prescriptions) ---

// Lấy danh sách đơn thuốc của user
export const getPrescriptions = async (token) => {
  const res = await get("api/prescriptions", token);
  return res?.data || res || [];
};

// Tạo đơn thuốc mới
export const createPrescription = async (token, data) => {
  return await post("api/prescriptions", data, token);
};

// --- QUẢN LÝ THUỐC (Medicines) ---

// Tìm thuốc hoặc lấy thông tin thuốc theo tên
export const getMedicineByName = async (name, token) => {
  // GET /api/medicines/:name
  return await get(`api/medicines/${name}`, token);
};

// --- NHẬT KÝ UỐNG THUỐC (Logs) ---

// Lấy lịch sử đã uống/bỏ lỡ
export const getAdherenceLogs = async (token) => {
  const res = await get("api/adherence-logs", token);
  return res?.data || res || [];
};