import { post } from "../utils/request";

/**
 * Đăng nhập hệ thống
 * @param {string} phone - Số điện thoại
 * @param {string} password - Mật khẩu
 */
export const login = async (phone, password) => {
  // API login: POST /api/auth/login
  return await post("api/auth/login", { phone, password });
};