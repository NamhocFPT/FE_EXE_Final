import { get, post, patch, del } from "../utils/request";
import { mockDelay } from "../mock/fakeData";

const USE_MOCK = false;

// ✅ Contract endpoints (request utils đã có /api/v1 rồi)
const PATH_PROFILE_SYMPTOMS = (profileId) => `/patient-profiles/${profileId}/symptoms`;
const PATH_SYMPTOM_DETAIL = (symptomId) => `/symptoms/${symptomId}`;

// Helpers
const pickDefined = (obj) => {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    const v = obj[k];
    if (v !== undefined && v !== null) out[k] = v;
  });
  return out;
};

const normalizeArray = (v) => {
  if (v === undefined || v === null) return undefined;
  return Array.isArray(v) ? v : [v];
};

/**
 * UC-SY2: Xem danh sách triệu chứng của 1 hồ sơ
 * GET /patient-profiles/{profileId}/symptoms?from&to&limit&offset
 */
export const getSymptomEntries = async (profileId, filters = {}) => {
  if (!profileId) throw new Error("profileId is required");

  if (USE_MOCK) {
    console.log("📝 [MOCK] Lấy danh sách triệu chứng cho profile:", profileId);
    await mockDelay(800);
    return [
      {
        id: "symp-001",
        profile_id: profileId,
        symptom_name: "Đau đầu",
        severity_score: 7,
        relation_to_med: "after_medication",
        description: "Đau âm ỉ sau khi uống thuốc",
        recorded_at: new Date().toISOString(),
        linked_regimens: [{ id: "reg-101", display_name: "Amlodipine 5mg" }],
      },
    ];
  }

  // ✅ Contract: from/to/limit/offset (không dùng profile_id query)
  const params = pickDefined({
    from: filters.from,
    to: filters.to,
    limit: filters.limit,
    offset: filters.offset,
  });

  return await get(PATH_PROFILE_SYMPTOMS(profileId), params);
};

/**
 * UC-SY1: Ghi lại một triệu chứng mới
 * POST /patient-profiles/{profileId}/symptoms
 */
export const createSymptomEntry = async (profileId, data) => {
  if (!profileId) throw new Error("profileId is required");

  const payload = pickDefined({
   // recorded_at: data?.recordedAt || data?.recorded_at || new Date().toISOString(),
    symptom_name: data?.symptomName || data?.symptom_name,
    severity_score: data?.severityScore ?? data?.severity_score,
    relation_to_med: data?.relationToMed || data?.relation_to_med,
    description: data?.description,
    notes: data?.notes,
    related_regimen_ids: normalizeArray(
      data?.linkedRegimenIds ?? data?.linked_regimen_ids
    ),
  });
  console.log("🚀 [createSymptomEntry] payload:", payload);
  

  if (!payload.symptom_name) {
    throw new Error("symptom_name (symptomName) is required");
  }

  if (USE_MOCK) {
    console.log("📝 [MOCK] Ghi triệu chứng:", payload);
    await mockDelay(1000);
    return { id: "symp_" + Date.now(), profile_id: profileId, ...payload, linked_regimens: [] };
  }

  return await post(PATH_PROFILE_SYMPTOMS(profileId), payload);
};

/**
 * UC-SY3: Xem chi tiết triệu chứng và các thuốc liên quan
 * GET /symptoms/{symptomId}
 */
export const getSymptomDetail = async (symptomId) => {
  if (!symptomId) throw new Error("symptomId is required");

  if (USE_MOCK) {
    console.log("📝 [MOCK] Đang lấy chi tiết triệu chứng ID:", symptomId);
    await mockDelay(800);
    return {
      id: symptomId,
      profile_id: "uuid-profile-123",
      symptom_name: "Đau đầu dữ dội",
      severity_score: 8,
      relation_to_med: "after_medication",
      description: "Đau âm ỉ vùng thái dương sau khi uống thuốc ~30 phút.",
      notes: "Cần theo dõi thêm vào buổi sáng.",
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      linked_regimens: [
        { id: "reg-101", display_name: "Amlodipine 5mg", dose_amount: "1", dose_unit: "Viên" },
      ],
    };
  }

  return await get(PATH_SYMPTOM_DETAIL(symptomId));
};

/**
 * UC-SY4: Cập nhật triệu chứng + links
 * PATCH /symptoms/{symptomId}
 */
export const updateSymptomEntry = async (symptomId, updateData) => {
  const payload = {};

  if (updateData.symptomName !== undefined) payload.symptom_name = updateData.symptomName;
  if (updateData.severityScore !== undefined) payload.severity_score = updateData.severityScore;
  if (updateData.relationToMed !== undefined) payload.relation_to_med = updateData.relationToMed;
  if (updateData.description !== undefined) payload.description = updateData.description;
  if (updateData.notes !== undefined) payload.notes = updateData.notes;

  // chỉ gửi khi user có thay đổi link
  if (Array.isArray(updateData.linkedRegimenIds)) {
    payload.linked_regimen_ids = updateData.linkedRegimenIds;
  }

  return await patch(`/symptoms/${symptomId}`, payload);
};

/**
 * UC-SY4: Xoá một triệu chứng
 * DELETE /symptoms/{symptomId} -> 204 No Content
 */
export const deleteSymptomEntry = async (symptomId) => {
  if (!symptomId) throw new Error("symptomId is required");

  if (USE_MOCK) {
    await mockDelay(300);
    return { success: true };
  }

  await del(PATH_SYMPTOM_DETAIL(symptomId));
  return { success: true };
};



