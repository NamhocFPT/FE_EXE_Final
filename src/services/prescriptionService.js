import { get, post } from "../utils/request";
// 1. Import dữ liệu giả
import { MOCK_PRESCRIPTIONS, MOCK_MEDICINES, mockDelay } from "../mock/fakeData";

// --- CÔNG TẮC: Đổi thành false khi có Backend thật ---
const USE_MOCK = true;

// --- QUẢN LÝ ĐƠN THUỐC (Prescriptions) ---

// Lấy danh sách đơn thuốc của user
export const getPrescriptions = async (token) => {
  if (USE_MOCK) {
    console.log("💊 [MOCK] Lấy danh sách đơn thuốc");
    await mockDelay(1000); // Giả vờ mạng chậm 1s
    return MOCK_PRESCRIPTIONS;
  }

  const res = await get("api/prescriptions", token);
  return res?.data || res || [];
};

// Tạo đơn thuốc mới
export const createPrescription = async (token, data) => {
  if (USE_MOCK) {
    console.log("💊 [MOCK] Tạo đơn thuốc mới:", data);
    await mockDelay(1500);
    return { ...data, id: Date.now() };
  }

  return await post("api/prescriptions", data, token);
};

// --- QUẢN LÝ THUỐC (Medicines) ---

// Tìm thuốc hoặc lấy thông tin thuốc theo tên
export const getMedicineByName = async (name, token) => {
  if (USE_MOCK) {
    console.log(`💊 [MOCK] Tìm thuốc tên: "${name}"`);
    await mockDelay(500);
    
    // Tìm trong danh sách mock
    const found = MOCK_MEDICINES.find(m => 
      m.name.toLowerCase().includes(name.toLowerCase())
    );
    
    // Giả lập cấu trúc trả về { data: ... } giống API thật
    return { data: found || null };
  }

  // GET /api/medicines/:name
  return await get(`api/medicines/${name}`, token);
};

// --- NHẬT KÝ UỐNG THUỐC (Logs) ---

// Lấy lịch sử đã uống/bỏ lỡ
export const getAdherenceLogs = async (token) => {
  if (USE_MOCK) {
    await mockDelay(500);
    // Trả về mảng rỗng hoặc fake 1-2 log để test giao diện
    return [
      {
        id: 101,
        log_time: new Date().toISOString(),
        status: "taken",
        tbl_schedule: {
          tbl_prescription: {
            tbl_medicine: { name: "Paracetamol (Mock)" },
            tbl_profile: { id: 1 } // Id trùng với Mock Profile
          }
        }
      }
    ];
  }

  const res = await get("api/adherence-logs", token);
  return res?.data || res || [];
};