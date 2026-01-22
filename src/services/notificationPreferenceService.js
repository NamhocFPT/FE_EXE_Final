// src/services/notificationPreferenceService.js
import { get, put } from "../utils/request";

const PATH_NOTIFICATION_PREFERENCES = "/notification-preferences";

const buildQuery = (params = {}) => {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    return qs ? `?${qs}` : "";
};

/**
 * GET /notification-preferences?profile_id?
 * Res: [{notification_preference}]
 */
export async function getNotificationPreferences(options = {}) {
    const url = `${PATH_NOTIFICATION_PREFERENCES}${buildQuery({
        profile_id: options.profile_id,
    })}`;

    return await get(url);
}

/**
 * PUT /notification-preferences
 * Body:
 * {
 *  profile_id?,
 *  allow_push?,
 *  allow_email?,
 *  quiet_hours_start?,
 *  quiet_hours_end?,
 *  timezone?
 * }
 * Res: {notification_preference}
 */
export async function upsertNotificationPreference(data = {}) {
    const payload = {
        ...(data.profile_id !== undefined ? { profile_id: data.profile_id } : {}),
        ...(data.allow_push !== undefined ? { allow_push: data.allow_push } : {}),
        ...(data.allow_email !== undefined ? { allow_email: data.allow_email } : {}),
        ...(data.quiet_hours_start !== undefined
            ? { quiet_hours_start: data.quiet_hours_start }
            : {}),
        ...(data.quiet_hours_end !== undefined ? { quiet_hours_end: data.quiet_hours_end } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
    };

    return await put(PATH_NOTIFICATION_PREFERENCES, payload);
}

/** helpers */
export function pickArray(res) {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

export function pickObject(res) {
    const payload = res?.data ?? res;
    if (payload?.notification_preference) return payload.notification_preference;
    if (payload?.data?.notification_preference) return payload.data.notification_preference;
    return payload;
}
