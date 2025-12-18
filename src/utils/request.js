import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBase } from './apiBase'; // Import hàm lấy IP động của bạn

// Tạo instance ban đầu
const instance = axios.create({
  timeout: 15000, // 15 giây timeout
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
    // Trả về data luôn, bỏ qua lớp vỏ axios
    return response.data;
  },
  async (error) => {
    if (error.response) {
      // Server trả về lỗi (4xx, 5xx)
      console.error(`❌ [API Error ${error.response.status}] ${error.response.data?.message || 'Lỗi Server'}`);

      // Tự động xử lý Logout nếu Token hết hạn (401)
      if (error.response.status === 401) {
        await AsyncStorage.removeItem('accessToken');
        // (Tùy chọn) Bắn event để App.js chuyển về trang Login
      }
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // Lỗi mạng / Server chết
      console.error(`⚠️ [Network Error] Không kết nối được tới ${error.config?.baseURL}`);
      return Promise.reject(new Error("Không thể kết nối đến máy chủ."));
    } else {
      console.error(`⚠️ [Unknown Error] ${error.message}`);
      return Promise.reject(error);
    }
  }
);

// --- 3. EXPORT GỌN GÀNG (Không cần truyền token nữa) ---
export const get = (url, params = {}) => instance.get(url, { params });
export const post = (url, data = {}) => instance.post(url, data);
export const put = (url, data = {}) => instance.put(url, data);
export const patch = (url, data = {}) => instance.patch(url, data);
export const del = (url) => instance.delete(url);

export default instance;