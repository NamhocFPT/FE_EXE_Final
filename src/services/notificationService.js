// src/services/notificationService.js
import { get } from "../utils/request";

const PATH_NOTIFICATIONS = "/notifications";

const buildQuery = (params = {}) => {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    return qs ? `?${qs}` : "";
};

/**
 * UC-N5: List notifications history
 * GET /notifications
 * Query: profile_id?, type?, status?, limit?, offset?
 * Res: [{notification}]
 */
export async function getNotifications(options = {}) {
    const url = `${PATH_NOTIFICATIONS}${buildQuery({
        profile_id: options.profile_id,
        type: options.type,
        status: options.status,
        limit: options.limit,
        offset: options.offset,
    })}`;

    return await get(url);
}

export function pickArray(res) {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
}
