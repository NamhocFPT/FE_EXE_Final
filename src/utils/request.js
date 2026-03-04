import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBase } from './apiBase'; // Import hàm lấy IP động của bạn

// Tạo instance ban đầu
const instance = axios.create({
  timeout: 30000, // Tăng lên 30 giây để tránh timeout khi Lambda cold start
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// --- 1. REQUEST INTERCEPTOR (Chạy trước khi gửi đi) ---
instance.interceptors.request.use(
  async (config) => {
    // A. Tự động lấy IP từ apiBase (Giải quyết vấn đề đổi mạng)
    const baseUrl = getBase();
    if (!baseUrl) {
      return Promise.reject(new Error("Không tìm thấy địa chỉ Server (apiBase)"));
    }
    // Gắn thêm /api/v1 nếu server bạn dùng prefix này
    config.baseURL = `${baseUrl}/api/v1`;

    // B. Tự động lấy Token từ bộ nhớ (Giải quyết vấn đề truyền tay)
    const token = await AsyncStorage.getItem('accessToken');
    console.log("TOKEN FROM STORAGE:", await AsyncStorage.getItem("accessToken"));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log đẹp để debug
    console.log(`🚀 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`);

    return config;
  },
  (error) => Promise.reject(error)
);

// --- 2. RESPONSE INTERCEPTOR (Chạy khi nhận về) ---
instance.interceptors.response.use(
  (response) => {
    console.log(`✅ [${response.status}] Success: ${response.config.url}`);
    return response.data; // bạn đang return data luôn
  },
  async (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Lỗi Server";

    // ✅ Tạo Error chuẩn để UI catch và Alert
    const e = new Error(message);
    e.status = status;
    e.data = error?.response?.data;

    if (status) {
      // Server trả về (4xx, 5xx)

      // ✅ 401: token hết hạn -> logout
      if (status === 401) {
        await AsyncStorage.removeItem("accessToken");
      }

      // ✅ CHỈ log với 5xx (lỗi server thật sự)
      if (status >= 500) {
        console.error(`❌ [API Error ${status}] ${message}`);
      }

      // ✅ 4xx: KHÔNG console.error để khỏi LogBox
      return Promise.reject(e);
    }

    // Network / request error (không có response)
    if (error?.request) {
      if (error.code === 'ECONNABORTED') {
        console.error(`⚠️ [Timeout Error] Quá hạn kết nối tới ${error?.config?.baseURL}`);
        const te = new Error("Máy chủ phản hồi quá lâu, vui lòng thử lại sau.");
        te.status = 0;
        return Promise.reject(te);
      }
      console.error(`⚠️ [Network Error] Không kết nối được tới ${error?.config?.baseURL}`);
      const ne = new Error("Không thể kết nối đến máy chủ.");
      ne.status = 0;
      return Promise.reject(ne);
    }

    console.error(`⚠️ [Unknown Error] ${message}`);
    return Promise.reject(e);
  }
);


// --- 3. EXPORT GỌN GÀNG (Không cần truyền token nữa) ---
export const get = (url, params = {}) => instance.get(url, { params });
export const post = (url, data = {}) => instance.post(url, data);
export const put = (url, data = {}) => instance.put(url, data);
export const patch = (url, data = {}) => instance.patch(url, data);
export const del = (url) => instance.delete(url);
export async function postMultipart(path, formData) {
  const url = `${BASE_URL}${path}`;
  const token = await getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // ⚠️ KHÔNG set Content-Type để fetch tự gắn boundary
    },
    body: formData,
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
export default instance;