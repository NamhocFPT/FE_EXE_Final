import { get, post, put, del } from "../utils/request";

const PATH = "api/schedules";

// Lấy tất cả lịch nhắc
export const getAllSchedules = async (token) => {
  const res = await get(PATH, token);
  return res?.data || res || [];
};

// Lấy lịch nhắc theo ID đơn thuốc (nếu cần lọc chi tiết)
export const getSchedulesByPrescription = async (token, prescriptionId) => {
  return await get(`${PATH}/prescription/${prescriptionId}`, token);
};

// Tạo lịch nhắc mới
export const createSchedule = async (token, data) => {
  return await post(PATH, data, token);
};

// Sửa lịch nhắc
export const updateSchedule = async (token, id, data) => {
  return await put(`${PATH}/${id}`, data, token);
};

// Xóa lịch nhắc
export const deleteSchedule = async (token, id) => {
  return await del(`${PATH}/${id}`, token);
};