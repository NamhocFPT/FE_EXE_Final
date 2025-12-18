// src/mock/fakeData.js

// Hàm delay giả lập mạng chậm
export const mockDelay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// 1. Dữ liệu Hồ sơ (tbl_profile)
// Tuân thủ: name, dob, gender, relationship, phone_number
export const MOCK_PROFILES = [
  {
    id: 1,
    user_id: 101,
    name: "Nguyễn Văn Nam",
    dob: "1995-05-20",
    gender: "male",
    relationship: "self",
    phone_number: "0912345678",
    created_at: "2024-01-01T10:00:00Z"
  },
  {
    id: 2,
    user_id: 101,
    name: "Trần Thị Mẹ",
    dob: "1960-08-15",
    gender: "female",
    relationship: "mother",
    phone_number: null,
    created_at: "2024-01-02T10:00:00Z"
  }
];

// 2. Dữ liệu Thuốc (tbl_medicine)
// Tuân thủ: name, description, active_ingredient
export const MOCK_MEDICINES = [
  { id: 1, name: "Paracetamol 500mg", description: "Giảm đau, hạ sốt", active_ingredient: "Paracetamol" },
  { id: 2, name: "Vitamin C 500mg", description: "Tăng sức đề kháng", active_ingredient: "Ascorbic Acid" },
  { id: 3, name: "Amoxicillin 500mg", description: "Kháng sinh", active_ingredient: "Amoxicillin" },
  { id: 4, name: "Panadol Extra", description: "Giảm đau mạnh", active_ingredient: "Paracetamol, Caffeine" }
];

// 3. Dữ liệu Đơn thuốc (tbl_prescription)
// QUAN TRỌNG: Backend phải trả kèm tbl_profile và tbl_medicine (JOIN) để FE hiển thị tên
export const MOCK_PRESCRIPTIONS = [
  {
    id: 10,
    profile_id: 1,
    medicine_id: 1,
    unit: "Viên",
    dosage: "1 viên",
    note: "Uống sau khi ăn no",
    start_date: "2024-12-01",
    end_date: "2024-12-10",
    is_active: true,
    // Join data giả lập (để UI hiển thị được tên)
    tbl_profile: { id: 1, name: "Nguyễn Văn Nam", relationship: "self" },
    tbl_medicine: { id: 1, name: "Paracetamol 500mg" }
  },
  {
    id: 11,
    profile_id: 2,
    medicine_id: 2,
    unit: "Viên",
    dosage: "1 viên",
    note: "Uống buổi sáng",
    start_date: "2024-12-05",
    end_date: "2024-12-25",
    is_active: true,
    tbl_profile: { id: 2, name: "Trần Thị Mẹ", relationship: "mother" },
    tbl_medicine: { id: 2, name: "Vitamin C 500mg" }
  }
];

// 4. Dữ liệu Lịch nhắc (tbl_schedule)
// Tuân thủ: reminder_time (HH:mm), quantity, repeat_interval
export const MOCK_SCHEDULES = [
  { 
    id: 1, 
    prescription_id: 10, 
    quantity: 1, 
    reminder_time: "08:00", 
    repeat_interval: "daily",
    repeat_every: 1,
    is_active: true 
  },
  { 
    id: 2, 
    prescription_id: 10, 
    quantity: 1, 
    reminder_time: "20:00", 
    repeat_interval: "daily", 
    repeat_every: 1,
    is_active: true 
  }
];