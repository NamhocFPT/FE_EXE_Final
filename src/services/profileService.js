import { get, post, put, del } from "../utils/request";
// Import dữ liệu mẫu
import { MOCK_PROFILES, mockDelay } from "../mock/fakeData"; 

const PATH = "api/profiles";

// --- CÔNG TẮC: Đổi thành false khi có Backend thật ---
const USE_MOCK = true;

// Lấy danh sách hồ sơ
export const getProfiles = async (token) => {
  if (USE_MOCK) {
    console.log("👤 [MOCK] Lấy danh sách Profiles");
    await mockDelay(500); // Giả lập mạng chậm 0.5s
    return MOCK_PROFILES;
  }

  const res = await get(PATH, token);
  // Backend thường trả về { success: true, data: [...] } hoặc trực tiếp mảng
  return res?.data || res || [];
};

// Tạo hồ sơ mới
export const createProfile = async (token, data) => {
  if (USE_MOCK) {
    console.log("👤 [MOCK] Tạo Profile:", data);
    await mockDelay(1000);
    // Trả về chính dữ liệu đó kèm 1 ID ngẫu nhiên
    return { ...data, id: Math.floor(Math.random() * 10000) };
  }

  return await post(PATH, data, token);
};

// Cập nhật hồ sơ
export const updateProfile = async (token, id, data) => {
  if (USE_MOCK) {
    console.log("👤 [MOCK] Cập nhật Profile ID:", id);
    await mockDelay(800);
    return { ...data, id };
  }

  return await put(`${PATH}/${id}`, data, token);
};

// Xóa hồ sơ
export const deleteProfile = async (token, id) => {
  if (USE_MOCK) {
    console.log("👤 [MOCK] Xóa Profile ID:", id);
    await mockDelay(500);
    return { success: true };
  }

  return await del(`${PATH}/${id}`, token);
};