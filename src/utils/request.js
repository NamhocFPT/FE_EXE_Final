import { getBase } from "./apiBase";

// 1. Hàm tạo Header chung (Tự động gắn Token nếu có)
const getHeaders = (token) => {
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// 2. Hàm lõi gửi Request
const sendRequest = async (path, method, body, token) => {
  const base = getBase(); // Lấy IP máy tính (VD: 192.168.1.12:8090)
  const url = `${base}/${path}`;

  console.log(`🚀 [${method}] ${url}`); // Log để Nam dễ debug

  const options = {
    method,
    headers: getHeaders(token),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    // Xử lý trường hợp xóa thành công nhưng không trả về data (Status 204)
    if (response.status === 204) {
      return null;
    }

    // Cố gắng đọc JSON (tránh crash nếu server trả về lỗi HTML)
    let result;
    try {
      result = await response.json();
    } catch (e) {
      result = null;
    }

    // Nếu server báo lỗi (400, 401, 500...) -> Ném lỗi ra để màn hình bắt
    if (!response.ok) {
      const errorMsg = result?.message || result?.error || `Lỗi HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return result; // Trả về data sạch
  } catch (error) {
    console.warn(`❌ Lỗi API [${path}]:`, error.message);
    throw error; // Ném tiếp lỗi ra ngoài
  }
};

// 3. Export các hàm ngắn gọn để dùng
export const get = (path, token) => sendRequest(path, "GET", null, token);

export const post = (path, body, token) => sendRequest(path, "POST", body, token);

export const put = (path, body, token) => sendRequest(path, "PUT", body, token);

export const patch = (path, body, token) => sendRequest(path, "PATCH", body, token);

export const del = (path, token) => sendRequest(path, "DELETE", null, token);