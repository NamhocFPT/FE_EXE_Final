import { get, post, del } from "../utils/request";

const USE_MOCK = false;

// ==============================
// PATHS
// ==============================
const PATH_PROFILE_SHARES = (profileId) =>
    `/patient-profiles/${encodeURIComponent(profileId)}/shares`;

const PATH_PROFILE_SHARE_DETAIL = (profileId, shareId) =>
    `/patient-profiles/${encodeURIComponent(profileId)}/shares/${encodeURIComponent(shareId)}`;

// ==============================
// HELPERS
// ==============================
const pickArray = (res) => {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
};

const normalizeRole = (role) => {
    const r = String(role || "").trim().toLowerCase();
    if (!["caregiver", "viewer"].includes(r)) {
        throw new Error('role must be "caregiver" or "viewer"');
    }
    return r;
};

const normalizeEmail = (email) => {
    const e = String(email || "").trim().toLowerCase();
    if (!e) throw new Error("user_email is required");
    // basic email check (frontend validation thôi)
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!ok) throw new Error("user_email is invalid");
    return e;
};

// ==============================
// API
// ==============================

/**
 * ProfileShares - List shares of a profile
 * GET /patient-profiles/{profileId}/shares
 * Res: [{share}]
 */
export const listProfileShares = async (profileId) => {
    if (!profileId) throw new Error("profileId is required");

    if (USE_MOCK) {
        return [];
    }

    const res = await get(PATH_PROFILE_SHARES(profileId));
    return pickArray(res); // ✅ trả luôn array cho UI dễ dùng
};

/**
 * ProfileShares - Share profile with another user
 * POST /patient-profiles/{profileId}/shares
 * Body: { user_email, role }
 * Res: {share}
 */
export const createProfileShare = async (profileId, data = {}) => {
    if (!profileId) throw new Error("profileId is required");

    const payload = {
        user_email: normalizeEmail(data.user_email ?? data.userEmail ?? data.email),
        role: normalizeRole(data.role),
    };

    if (USE_MOCK) {
        return { id: "share_" + Date.now(), profile_id: profileId, ...payload };
    }

    return await post(PATH_PROFILE_SHARES(profileId), payload);
};

/**
 * ProfileShares - Revoke share
 * DELETE /patient-profiles/{profileId}/shares/{shareId}
 * Res: 204 No Content
 */
export const revokeProfileShare = async (profileId, shareId) => {
    if (!profileId) throw new Error("profileId is required");
    if (!shareId) throw new Error("shareId is required");

    if (USE_MOCK) {
        return true;
    }

    return await del(PATH_PROFILE_SHARE_DETAIL(profileId, shareId));
};

/**
 * (OPTIONAL) UC-SH3 đổi role nếu backend CHƯA có PATCH:
 * => revoke rồi tạo lại với role mới
 *
 * @param {string} profileId
 * @param {string} shareId
 * @param {string} userEmail  email người đang được share
 * @param {"caregiver"|"viewer"} nextRole
 */
export const changeShareRoleByRecreate = async (profileId, shareId, userEmail, nextRole) => {
    await revokeProfileShare(profileId, shareId);
    return await createProfileShare(profileId, { user_email: userEmail, role: nextRole });
};
