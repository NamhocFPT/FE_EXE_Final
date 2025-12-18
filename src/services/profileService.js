// src/services/profileService.js
import { get, post, put, del } from "../utils/request";
// Import dữ liệu mẫu
import { MOCK_PROFILES, mockDelay } from "../mock/fakeData"; 

// --- CẤU HÌNH ---
// Theo file Excel: Module PatientProfiles -> Path: /api/v1/patient-profiles
// request.js đã tự thêm /api/v1 nên ta chỉ cần /patient-profiles
const PATH = "/patient-profiles";

// CÔNG TẮC: Đổi thành false khi có Backend thật
const USE_MOCK = true;

// --- 1. Lấy danh sách hồ sơ ---
export const getProfiles = async () => {
  // Logic Mock
  if (USE_MOCK) {
    console.log("👤 [MOCK] Lấy danh sách Patient Profiles");
    await mockDelay(500); 
    return MOCK_PROFILES || [];
  }

  // Logic thật: GET /api/v1/patient-profiles
  // Query param: scope=owned|shared|all (Mặc định thường là all hoặc owned)
  const res = await get(PATH, { scope: 'all' });
  
  // API Contract trả về mảng "[{profile,...}]"
  return res?.data || res || [];
};

// --- 2. Tạo hồ sơ mới ---
export const createProfile = async (data) => {
  // MAPPING DỮ LIỆU: UI (camelCase) -> API Contract (snake_case)
  // Contract yêu cầu: full_name, date_of_birth?, sex?, relationship_to_owner?, notes?
  const payload = {
    full_name: data.name,                // UI: name
    date_of_birth: data.dob,             // UI: dob
    sex: data.gender,                    // UI: gender -> API: sex
    relationship_to_owner: data.relationship, // UI: relationship -> API: relationship_to_owner
    phone_number: data.phoneNumber,      // (Optional)
    avatar_url: data.avatar,             // (Optional)
    notes: data.notes || ""              // (Optional)
    
    // Lưu ý: Các trường y tế (height, weight...) nếu Backend chưa update 
    // theo Database Schema mới thì có thể sẽ bị bỏ qua, nhưng ta cứ gửi lên.
    // height: data.height ? parseFloat(data.height) : null,
    // weight: data.weight ? parseFloat(data.weight) : null,
    // blood_type: data.bloodType,
    // allergies: data.allergies
  };

  if (USE_MOCK) {
    console.log("👤 [MOCK] Tạo Profile:", payload);
    await mockDelay(1000);
    return { ...payload, id: Math.floor(Math.random() * 10000) };
  }

  // Logic thật: POST /api/v1/patient-profiles
  return await post(PATH, payload);
};

// --- 3. Cập nhật hồ sơ ---
export const updateProfile = async (id, data) => {
  // Mapping dữ liệu tương tự create
  const payload = {
    full_name: data.name,
    date_of_birth: data.dob,
    sex: data.gender,
    relationship_to_owner: data.relationship,
    phone_number: data.phoneNumber,
    avatar_url: data.avatar,
    notes: data.notes
  };

  if (USE_MOCK) {
    console.log(`👤 [MOCK] Cập nhật Profile ID ${id}:`, payload);
    await mockDelay(800);
    return { ...payload, id };
  }

  // Logic thật: PATCH /api/v1/patient-profiles/{profileId}
  // Lưu ý: Contract dùng PATCH cho update từng phần, request.js của mình gọi là patch hoặc put đều được cấu hình
  // Nhưng trong request.js ta đang dùng put, nên ở đây gọi put (hoặc patch nếu bạn đã thêm hàm patch)
  return await put(`${PATH}/${id}`, payload);
};

// --- 4. Xóa hồ sơ ---
export const deleteProfile = async (id) => {
  if (USE_MOCK) {
    console.log(`👤 [MOCK] Xóa Profile ID: ${id}`);
    await mockDelay(500);
    return { success: true };
  }

  // Logic thật: DELETE /api/v1/patient-profiles/{profileId}
  return await del(`${PATH}/${id}`);
};

// --- 5. Lấy chi tiết 1 hồ sơ ---
export const getProfileDetail = async (id) => {
  if (USE_MOCK) {
    await mockDelay(300);
    return MOCK_PROFILES.find(p => p.id == id) || null;
  }
  
  // Logic thật: GET /api/v1/patient-profiles/{profileId}
  return await get(`${PATH}/${id}`);
};