// src/services/authService.js
import { post, get } from "../utils/request";
// Import hàm delay để giả lập mạng lag
import { mockDelay } from "../mock/fakeData";
import AsyncStorage from "@react-native-async-storage/async-storage";
// --- CẤU HÌNH ---
const USE_MOCK = false;

// Định nghĩa endpoint chuẩn (request.js đã tự thêm /api/v1)
const PATH_LOGIN = "/auth/login";
const PATH_REGISTER = "/auth/register";
const PATH_ME = "/users/me";
const PATH_Update = "/users/me";
// --- DATABASE GIẢ LẬP (Lưu trong RAM) ---
// Giúp đăng ký xong có thể đăng nhập được ngay khi đang test Mock
const MOCK_USERS_DB = [
  {
    id: "user-1",
    email: "test@gmail.com",
    password: "123",
    full_name: "Người dùng Test",
    phone_number: "0909123456",
    role: "USER"
  }
];

/**
 * Đăng nhập hệ thống
 * Contract: POST /api/v1/auth/login
 * Body: { email, password }
 */
export const login = async (email, password) => {
  // 1) MOCK MODE
  if (USE_MOCK) {
    console.log(`🔐 [MOCK] Đang đăng nhập: ${email}`);
    await mockDelay(1000);

    const user = MOCK_USERS_DB.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) throw new Error("Email hoặc mật khẩu không đúng (Mock)");

    const accessToken = "mock-jwt-token-" + Date.now();

    await AsyncStorage.setItem("accessToken", accessToken);

    // ✅ Chuẩn hoá output giống REAL
    return {
      accessToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
      },
    };
  }

  // 2) REAL API MODE
  const res = await post(PATH_LOGIN, { email, password });

  // ✅ Hỗ trợ nhiều format backend có thể trả
  const accessToken =
    res?.accessToken ||
    res?.token?.accessToken ||
    res?.token || // nếu token là string
    res?.data?.accessToken ||
    res?.data?.token?.accessToken ||
    res?.data?.token;

  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Login OK nhưng không có accessToken hợp lệ");
  }

  await AsyncStorage.setItem("accessToken", accessToken);

  // ✅ Chuẩn hoá return cho FE dùng nhất quán
  return {
    accessToken,
    expiresIn: res?.expiresIn || res?.token?.expiresIn || res?.data?.expiresIn,
    user: res?.user || res?.data?.user || null,
    raw: res, // optional: nếu bạn muốn giữ raw để debug
  };
};


/**
 * Đăng ký tài khoản
 * Contract: POST /api/v1/auth/register
 * Body: { email, password, full_name, phone_number }
 */
export const register = async (fullName, email, password, phone) => {
  // 1. MOCK MODE
  if (USE_MOCK) {
    console.log(`📝 [MOCK] Đang đăng ký: ${email}`);
    await mockDelay(1500);

    // Check trùng email
    const exists = MOCK_USERS_DB.some((u) => u.email === email);
    if (exists) {
      throw new Error("Email này đã được sử dụng (Mock)");
    }

    // Tạo user mới
    const newUser = {
      id: "user-" + Math.floor(Math.random() * 10000),
      email: email,
      password: password,
      full_name: fullName,
      phone_number: phone,
      role: "USER"
    };

    // Lưu vào RAM để tí nữa Login tìm thấy
    MOCK_USERS_DB.push(newUser);
    console.log("👉 DB sau khi đăng ký:", MOCK_USERS_DB);

    return {
      success: true,
      message: "Đăng ký thành công",
      user: newUser
    };
  }

  // 2. REAL API MODE
  // Mapping dữ liệu: Frontend (camelCase) -> Backend (snake_case)
  const payload = {
    full_name: fullName,    // Mapping
    email: email,
    password: password,
    phone_number: phone     // Mapping
  };

  return await post(PATH_REGISTER, payload);
};


/**
 * Lấy thông tin tài khoản hiện tại (User Profile)
 * Contract: GET /api/v1/auth/me
 */
export const getMyProfile = async () => {
  if (USE_MOCK) {
    await mockDelay(500);
    // Trả về user đầu tiên trong danh sách giả
    return MOCK_USERS_DB[0];
  }

  return await get(PATH_ME);
};
export const updateMyAccount = async (data) => {
  if (USE_MOCK) {
    console.log("✏️ [MOCK] Update Account:", data);
    await mockDelay(1000);
    // Cập nhật vào DB giả (User index 0)
    const currentUser = MOCK_USERS_DB[0];
    const updatedUser = { ...currentUser, ...data };
    MOCK_USERS_DB[0] = updatedUser;
    return updatedUser;
  }
  // API Thật
  return await patch(PATH_Update, data);
};