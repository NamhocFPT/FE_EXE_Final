// src/mock/fakeData.js

// Hàm delay giả lập mạng chậm
export const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// 1. Dữ liệu Hồ sơ (Bảng: patient_profiles)
// Tuân thủ Schema: id (UUID), full_name, date_of_birth, sex, relationship_to_owner, notes
export const MOCK_PROFILES = [
  {
    id: "user-1", // Giả lập UUID
    owner_user_id: "u-999",
    full_name: "Nguyễn Văn Nam",
    date_of_birth: "1995-05-20",
    sex: "male",
    relationship_to_owner: "self",
    notes: "Dị ứng Penicillin nhẹ",
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z"
  },
  {
    id: "user-2",
    owner_user_id: "u-999",
    full_name: "Trần Thị Mẹ",
    date_of_birth: "1960-08-15",
    sex: "female",
    relationship_to_owner: "mother",
    notes: "Tiền sử tăng huyết áp",
    created_at: "2024-01-02T10:00:00Z",
    updated_at: "2024-01-02T10:00:00Z"
  }
];

// 2. Dữ liệu Thuốc thương mại (Bảng: drug_products)
// Tuân thủ Schema: brand_name, form, strength_text
export const MOCK_DRUG_PRODUCTS = [
  { id: "p-1", brand_name: "Panadol Extra", form: "Tablet", strength_text: "500mg/65mg" },
  { id: "p-2", brand_name: "Cebion Vitamin C", form: "Effervescent", strength_text: "1000mg" },
  { id: "p-3", brand_name: "Amoxicillin GSK", form: "Capsule", strength_text: "500mg" }
];

// 3. Dữ liệu Đơn thuốc (Bảng: prescriptions)
// Tuân thủ Schema: prescriber_name, facility_name, issued_date, status
export const MOCK_PRESCRIPTIONS = [
  {
    id: "pres-101",
    profile_id: "user-1",
    prescriber_name: "BS. Trần Minh Khoa",
    prescriber_specialty: "Nội tổng quát",
    facility_name: "Bệnh viện Đa khoa Tâm Anh",
    issued_date: "2024-12-15",
    status: "active",
    note: "Khám định kỳ",
    created_at: "2024-12-15T08:00:00Z"
  }
];

// 4. Dữ liệu Mục thuốc trong đơn (Bảng: prescription_items)
// Đây là cầu nối quan trọng giữa đơn thuốc và thuốc thực tế
export const MOCK_PRESCRIPTION_ITEMS = [
  {
    id: "item-501",
    prescription_id: "pres-101",
    original_name_text: "Panadol Extra", // Tên bác sĩ ghi
    drug_product_id: "p-1", 
    dose_amount: 1,
    dose_unit: "Viên",
    frequency_text: "2 lần/ngày",
    start_date: "2024-12-15",
    end_date: "2024-12-22",
    notes: "Uống sau khi ăn"
  }
];

// 5. Dữ liệu Phác đồ/Lịch nhắc (Bảng: medication_regimens)
// Chứa cấu hình giờ uống (schedule_payload)
export const MOCK_REGIMENS = [
  {
    id: "reg-1",
    profile_id: "user-1",
    prescription_item_id: "item-501",
    display_name: "Panadol Extra (Sáng-Chiều)",
    schedule_type: "fixed_times",
    // Theo DB Schema: Dùng JSONB để lưu giờ
    schedule_payload: {
      times: ["08:00", "16:00"],
      days: [1, 2, 3, 4, 5, 6, 7]
    },
    is_active: true,
    start_date: "2024-12-15",
    end_date: "2024-12-22"
  }
];

// 6. Dữ liệu Lịch sử uống (Bảng: medication_intake_events)
// Dùng để hiển thị lịch sử ở màn hình chi tiết
export const MOCK_INTAKE_EVENTS = [
  {
    id: "event-1",
    regimen_id: "reg-1",
    profile_id: "user-1",
    scheduled_time: "2024-12-18T08:00:00Z",
    taken_time: "2024-12-18T08:05:00Z",
    status: "taken" // taken / skipped / delayed
  }
];