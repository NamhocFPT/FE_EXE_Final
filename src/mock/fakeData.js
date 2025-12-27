// src/mock/fakeData.js

// Hàm delay giả lập mạng chậm
export const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/* ========================================================================
   1. DỮ LIỆU HỒ SƠ (Bảng: patient_profiles)
   ======================================================================== */
export const MOCK_PROFILES = [
  {
    id: "user-1",
    owner_user_id: "u-999",
    full_name: "Nguyễn Văn Nam",
    date_of_birth: "1995-05-20",
    sex: "male",
    relationship_to_owner: "self",
    notes: "Dị ứng Penicillin nhẹ",
    created_at: "2024-01-01T10:00:00Z"
  },
  {
    id: "user-2",
    owner_user_id: "u-999",
    full_name: "Trần Thị Mẹ",
    date_of_birth: "1960-08-15",
    sex: "female",
    relationship_to_owner: "mother",
    notes: "Tiền sử tăng huyết áp, tiểu đường Type 2",
    created_at: "2024-01-02T10:00:00Z"
  }
];

/* ========================================================================
   2. DANH MỤC THUỐC GỢI Ý (Bảng: drug_products) - Dùng cho UC-RX2 & UC-MR2
   ======================================================================== */
export const MOCK_DRUG_PRODUCTS = [
  {
    id: "dp-001",
    brand_name: "Panadol Extra",
    strength_text: "500mg/65mg",
    form: "Tablet",
    route: "Oral",
    manufacturer: "GSK",
    is_generic: false
  },
  {
    id: "dp-002",
    brand_name: "Hapacol 150",
    strength_text: "150mg",
    form: "Powder",
    route: "Oral",
    manufacturer: "DHG Pharma",
    is_generic: true
  },
  {
    id: "dp-003",
    brand_name: "Vitamin D3 B.Braun",
    strength_text: "2000 IU",
    form: "Drops",
    route: "Oral",
    manufacturer: "B.Braun",
    is_generic: false
  },
  {
    id: "dp-004",
    brand_name: "Amlodipine",
    strength_text: "5mg",
    form: "Tablet",
    route: "Oral",
    manufacturer: "Stada",
    is_generic: true
  }
];

// Alias để tương thích với code cũ của bạn nếu cần
export const MOCK_MEDICINES = MOCK_DRUG_PRODUCTS.map(d => ({
  id: d.id,
  name: d.brand_name,
  strength: d.strength_text,
  form: d.form
}));

/* ========================================================================
   3. DỮ LIỆU ĐƠN THUỐC (Bảng: prescriptions) - UC-RX3
   ======================================================================== */
export const MOCK_PRESCRIPTIONS = [
  {
    id: "pres-101",
    profile_id: "user-1",
    prescriber_name: "BS. Trần Minh Khoa",
    facility_name: "Bệnh viện Đa khoa Tâm Anh",
    issued_date: "2024-12-15",
    diagnosis: "Viêm họng cấp",
    status: "active",
    notes: "Kiêng nước đá",
    prescription_items: [
      { id: "pi-1", original_name_text: "Panadol Extra", dose_amount: 1, dose_unit: "Viên" }
    ]
  },
  {
    id: "pres-201",
    profile_id: "user-2",
    prescriber_name: "BS. Nguyễn Thị Tâm",
    facility_name: "Trung tâm Y tế Quận 1",
    issued_date: "2024-12-01",
    diagnosis: "Tăng huyết áp vô căn",
    status: "active",
    notes: "Uống thuốc đều đặn vào buổi sáng",
    prescription_items: [
      { id: "pi-2", original_name_text: "Amlodipine 5mg", dose_amount: 1, dose_unit: "Viên" }
    ]
  }
];

/* ========================================================================
   4. KẾ HOẠCH DÙNG THUỐC (Bảng: medication_regimens) - UC-MR3
   Dùng hiển thị tại tab "Đang uống"
   ======================================================================== */
export const MOCK_REGIMENS = [
  // Của hồ sơ Nam (user-1) - Tạo từ đơn thuốc (UC-MR1)
  {
    id: "reg-1",
    profile_id: "user-1",
    prescription_item_id: "pi-1",
    drug_product_id: "dp-001",
    display_name: "Panadol Extra",
    dose_amount: "1",
    dose_unit: "Viên",
    schedule_type: "fixed_times",
    schedule_payload: {
      times: ["08:00", "20:00"],
      meal_note: "Sau ăn 30 phút"
    },
    is_active: true,
    start_date: "2024-12-15",
    end_date: "2024-12-22"
  },
  // Của hồ sơ Mẹ (user-2) - Tạo từ đơn thuốc (UC-MR1)
  {
    id: "reg-2",
    profile_id: "user-2",
    prescription_item_id: "pi-2",
    drug_product_id: "dp-004",
    display_name: "Amlodipine (Thuốc huyết áp)",
    dose_amount: "1",
    dose_unit: "Viên",
    schedule_type: "fixed_times",
    schedule_payload: {
      times: ["07:00"],
      meal_note: "Trước ăn sáng"
    },
    is_active: true,
    start_date: "2024-12-01",
    end_date: null // Uống lâu dài
  },
  // Của hồ sơ Mẹ (user-2) - Thuốc tự thêm ngoài đơn (UC-MR2)
  {
    id: "reg-3",
    profile_id: "user-2",
    prescription_item_id: null, // Không thuộc đơn nào
    drug_product_id: "dp-003",
    display_name: "Vitamin D3 B.Braun",
    dose_amount: "2",
    dose_unit: "Giọt",
    schedule_type: "fixed_times",
    schedule_payload: {
      times: ["08:30"],
      meal_note: "Trong lúc ăn"
    },
    is_active: true,
    start_date: "2024-11-20",
    end_date: null
  }
];

/* ========================================================================
   5. LỊCH SỬ UỐNG THUỐC (Bảng: medication_intake_events)
   ======================================================================== */
const todayStr = new Date().toISOString().split('T')[0];

export const MOCK_INTAKE_EVENTS = [
  {
    id: "evt-001",
    profile_id: "user-1",
    display_name: "Panadol",
    scheduled_time: `${todayStr}T08:00:00Z`, // Ép về ngày hôm nay
    status: "scheduled",
    dose_amount: 1,
    dose_unit: "Viên",
    notes: "Uống sau khi ăn no"
  },
  {
    id: "evt-002",
    profile_id: "user-2",
    display_name: "Thuốc huyết áp",
    scheduled_time: `${todayStr}T08:30:00Z`, // Ép về ngày hôm nay
    status: "scheduled",
    dose_amount: 1,
    dose_unit: "Viên",
    notes: "Uống sau khi ăn no"
  }
];