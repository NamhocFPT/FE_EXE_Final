// src/services/pushDeviceService.js
import { get, post, del } from "../utils/request";

const PATH_PUSH_DEVICES = "/push-devices";

/**
 * UC-N1: Register or refresh push device token
 * POST /push-devices
 * Body: { device_platform, device_token }
 * Res: {push_device} (hoặc wrapper data)
 */
export async function registerPushDevice(payload) {
    const { device_platform, device_token } = payload || {};
    if (!device_platform) throw new Error("device_platform is required");
    if (!device_token) throw new Error("device_token is required");

    return await post(PATH_PUSH_DEVICES, { device_platform, device_token });
}

/**
 * GET /push-devices
 * Res: [{push_device}]
 */
export async function getPushDevices() {
    return await get(PATH_PUSH_DEVICES);
}

/**
 * UC-N2: Delete push device
 * DELETE /push-devices/{deviceId}
 * Res: 204 No Content
 */
export async function deletePushDevice(deviceId) {
    if (!deviceId) throw new Error("deviceId is required");
    return await del(`${PATH_PUSH_DEVICES}/${encodeURIComponent(deviceId)}`);
}

/**
 * Helper: normalize list from response
 */
export function pickArray(res) {
    const payload = res?.data ?? res;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

/**
 * Helper: normalize object from response
 */
export function pickObject(res) {
    const payload = res?.data ?? res;
    // backend có thể trả { push_device: {...} }
    if (payload?.push_device) return payload.push_device;
    if (payload?.data?.push_device) return payload.data.push_device;
    return payload;
}
