import { get, post, put, del } from "../utils/request";

const PATH = "api/profiles";

// Lấy danh sách hồ sơ
export const getProfiles = async (token) => {
  const res = await get(PATH, token);
  // Backend thường trả về { success: true, data: [...] } hoặc trực tiếp mảng
  return res?.data || res || [];
};

// Tạo hồ sơ mới
export const createProfile = async (token, data) => {
  return await post(PATH, data, token);
};

// Cập nhật hồ sơ
export const updateProfile = async (token, id, data) => {
  return await put(`${PATH}/${id}`, data, token);
};

// Xóa hồ sơ
export const deleteProfile = async (token, id) => {
  return await del(`${PATH}/${id}`, token);
};