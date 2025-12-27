import { get, patch } from "../utils/request";
import { mockDelay, MOCK_INTAKE_EVENTS } from "../mock/fakeData";

// --- CẤU HÌNH ---
const USE_MOCK = true;

// Endpoint chính xác theo cột "Path" trong API Contract
const PATH_INTAKE = "/api/v1/medication-intake-events";

/**
 * UC-IE1: Lấy lịch uống thuốc (Dùng cho Family Dashboard)
 * Khớp API Contract: GET /api/v1/medication-intake-events
 */
export const getIntakeSchedule = async (profileId, fromDate, toDate) => {
    if (USE_MOCK) {
        console.log("--- DEBUG MOCK ---");
        console.log("Filter Params:", { profileId, fromDate, toDate });
        
        const filtered = MOCK_INTAKE_EVENTS.filter(event => {
            const eventDate = event.scheduled_time.split('T')[0];
            const isMatchProfile = profileId ? event.profile_id === profileId : true;
            const isMatchDate = eventDate >= fromDate && eventDate <= toDate;
            return isMatchProfile && isMatchDate;
        });

        console.log("Result Length:", filtered.length);
        return filtered;
    }
    // Khớp đặc tả RequestBodyOrQuery: {profile_id?, from_datetime, to_datetime}
    const params = { 
        from_datetime: fromDate.includes("T") ? fromDate : `${fromDate}T00:00:00Z`, 
        to_datetime: toDate.includes("T") ? toDate : `${toDate}T23:59:59Z` 
    };
    if (profileId) params.profile_id = profileId;

    return await get(PATH_INTAKE, params);
};

/**
 * UC-IE2 & UC-IE4: Check-in đánh dấu trạng thái uống thuốc
 * Khớp API Contract: PATCH /api/v1/medication-intake-events/{id}
 */
export const updateIntakeStatus = async (eventId, status, extraData = {}) => {
    // Khớp đặc tả RequestBodyOrQuery: {status, taken_time}
    const payload = {
        status: status, // 'taken' | 'skipped' | 'delayed'
        taken_time: extraData.takenTime || new Date().toISOString(),
        // Các trường mở rộng theo bảng medication_intake_events trong DB
        dose_amount_taken: extraData.doseAmount || null,
        notes: extraData.notes || ""
    };

    if (USE_MOCK) {
        console.log(`💊 [MOCK] PATCH ${PATH_INTAKE}/${eventId} | Status: ${status}`);
        await mockDelay(500);
        
        const index = MOCK_INTAKE_EVENTS.findIndex(e => e.id === eventId);
        if (index !== -1) {
            MOCK_INTAKE_EVENTS[index] = { 
                ...MOCK_INTAKE_EVENTS[index], 
                status: status, 
                taken_time: payload.taken_time 
            };
            return MOCK_INTAKE_EVENTS[index];
        }
        return null;
    }

    return await patch(`${PATH_INTAKE}/${eventId}`, payload);
};

/**
 * UC-IE3: Lấy thống kê tuân thủ
 * API Contract hiện tại chưa có path riêng cho /stats, 
 * thông thường sẽ được tính toán từ list events của UC-IE1 hoặc một endpoint bổ sung.
 */
export const getComplianceStats = async (profileId, range = 'week') => {
    if (USE_MOCK) {
        await mockDelay(1000);
        // Trong thực tế, BE sẽ dùng hàm COUNT và GROUP BY để trả về dữ liệu này
        return {
            adherence_rate: 85,
            taken_count: range === 'week' ? 42 : 180,
            skipped_count: range === 'week' ? 5 : 20,
            missed_count: range === 'week' ? 3 : 15,
            total_scheduled: range === 'week' ? 50 : 215,
            most_missed: [
                { name: "Panadol", count: 3 },
                { name: "Vitamin C", count: 1 }
            ]
        };
    }
    
    // Gọi API thật: GET /api/v1/medication-intake-events/stats
    return await get(`${PATH_INTAKE}/stats`, { 
        profile_id: profileId, 
        range: range 
    });
};

/**
 * UC-EX1: Xuất báo cáo PDF
 * Hàm này sẽ gọi API để Backend generate file PDF và trả về link tải
 */
export const exportCompliancePDF = async (profileId) => {
    // POST /api/v1/patient-profiles/{id}/export-pdf
    return await post(`/api/v1/patient-profiles/${profileId}/export-pdf`);
};