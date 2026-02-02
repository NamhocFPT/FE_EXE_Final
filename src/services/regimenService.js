import { get, post, patch, del } from "../utils/request";

/**
 * Helpers
 */
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const pickDefined = (obj) => {
    const out = {};
    Object.keys(obj || {}).forEach((k) => {
        if (obj[k] !== undefined) out[k] = obj[k];
    });
    return out;
};

/**
 * API paths (base /api/v1 đã có sẵn trong request util)
 */
const PATH_PROFILE_REGIMENS = (profileId) => `/patient-profiles/${profileId}/regimens`;
const PATH_REGIMEN_DETAIL = (regimenId) => `/regimens/${regimenId}`;

/* =========================
   REGIMENS SERVICE
========================= */

/**
 * List regimens for a profile
 * GET /patient-profiles/{profileId}/regimens?is_active?
 */
export const getRegimens = async (profileId, options = {}) => {
    if (!profileId) throw new Error("profileId is required");

    const params = pickDefined({
        // contract: is_active?
        is_active: options.is_active,
    });

    const res = await get(PATH_PROFILE_REGIMENS(profileId), params);
    const data = unwrap(res);

    return Array.isArray(data) ? data : [];
};

/**
 * Create medication regimen
 * POST /patient-profiles/{profileId}/regimens
 *
 * Contract body:
 * {
 *  prescription_item_id?,
 *  drug_product_id,
 *  display_name,
 *  total_daily_dose?,
 *  dose_unit?,
 *  start_date?,
 *  end_date?,
 *  schedule_type?,
 *  schedule_payload?,
 *  timezone?
 * }
 */
// export const createRegimen = async (profileId, data) => {
//     if (!profileId) throw new Error("profileId is required");
//     if (!data?.drugProductId && !data?.drug_product_id) {
//         throw new Error("drug_product_id is required");
//     }
//     if (!data?.displayName && !data?.display_name) {
//         throw new Error("display_name is required");
//     }

//     // accept either camelCase or snake_case input
//     const payload = pickDefined({
//         prescription_item_id: data.prescriptionItemId ?? data.prescription_item_id,
//         drug_product_id: data.drugProductId ?? data.drug_product_id,
//         display_name: data.displayName ?? data.display_name,
//         total_daily_dose: data.totalDailyDose ?? data.total_daily_dose,
//         dose_unit: data.doseUnit ?? data.dose_unit,
//         start_date: data.startDate ?? data.start_date,
//         end_date: data.endDate ?? data.end_date,
//         schedule_type: data.scheduleType ?? data.schedule_type,
//         schedule_payload: data.schedulePayload ?? data.schedule_payload,
//         timezone: data.timezone,
//     });

//     const res = await post(PATH_PROFILE_REGIMENS(profileId), payload);
//     return unwrap(res);
// };

/**
 * Get regimen details
 * GET /regimens/{regimenId}
 */
export const getRegimenDetail = async (regimenId) => {
    if (!regimenId) throw new Error("regimenId is required");

    const res = await get(PATH_REGIMEN_DETAIL(regimenId));
    return unwrap(res);
};

/**
 * Update regimen (partial)
 * PATCH /regimens/{regimenId}
 *
 * Contract: Partial regimen fields
 */
export const updateRegimen = async (regimenId, patchData = {}) => {
    if (!regimenId) throw new Error("regimenId is required");

    // accept either camelCase or snake_case
    const payload = pickDefined({
        prescription_item_id: patchData.prescriptionItemId ?? patchData.prescription_item_id,
        drug_product_id: patchData.drugProductId ?? patchData.drug_product_id,
        display_name: patchData.displayName ?? patchData.display_name,
        total_daily_dose: patchData.totalDailyDose ?? patchData.total_daily_dose,
        dose_unit: patchData.doseUnit ?? patchData.dose_unit,
        start_date: patchData.startDate ?? patchData.start_date,
        end_date: patchData.endDate ?? patchData.end_date,
        schedule_type: patchData.scheduleType ?? patchData.schedule_type,
        schedule_payload: patchData.schedulePayload ?? patchData.schedule_payload,
        timezone: patchData.timezone,
        // nhiều backend dùng is_active để deactivate/activate
        is_active: patchData.isActive ?? patchData.is_active,
    });

    const res = await patch(PATH_REGIMEN_DETAIL(regimenId), payload);
    return unwrap(res);
};

/**
 * Delete/deactivate regimen
 * DELETE /regimens/{regimenId}
 * Returns: 204 No Content
 */
export const deleteRegimen = async (regimenId) => {
    if (!regimenId) throw new Error("regimenId is required");
    return await del(PATH_REGIMEN_DETAIL(regimenId));
};

/**
 * Convenience: get active regimens for linking symptom
 * GET /patient-profiles/{profileId}/regimens?is_active=true
 */
export const getActiveRegimensForLink = async (profileId) => {
    return await getRegimens(profileId, { is_active: true });
};

export const createRegimen = (profileId, payload) => {
    return post(`/patient-profiles/${profileId}/regimens`, payload);
};