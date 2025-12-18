// src/services/authService.js
import { post } from "../utils/request";
import { mockDelay } from "../mock/fakeData"; // Import hàm delay

// --- CÔNG TẮC: Đổi thành false khi muốn gọi API thật ---
const USE_MOCK = true; 

/**
 * Đăng nhập hệ thống
 * @param {string} phone - Số điện thoại
 * @param {string} password - Mật khẩu
 */
export const login = async (phone, password) => {
  // 1. Nếu đang bật chế độ Mock
  if (USE_MOCK) {
    console.log(`⚠️ [MOCK] Đang đăng nhập với: ${phone}`);
    await mockDelay(1500); // Giả vờ mạng chậm 1.5 giây để thấy loading xoay

    // Giả lập logic kiểm tra mật khẩu (nếu thích)
    // if (password !== "123456") throw new Error("Mật khẩu sai rồi!");

    // Trả về cấu trúc dữ liệu y hệt Backend thật sẽ trả
    return {
      success: true,
      accessToken: "fake-jwt-token-xyz-123", // Token giả
      user: {
        id: 999,
        name: "Người dùng Test", // Hoặc lấy tên từ mock profile
        phone: phone,
        role: "user"
      }
    };
  }

  // 2. Nếu tắt Mock -> Gọi API thật
  // API login: POST /api/auth/login
  return await post("api/auth/login", { phone, password });
};