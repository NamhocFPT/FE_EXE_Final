// src/services/notificationClient.js
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    registerPushDevice,
    getPushDevices,
    deletePushDevice,
    pickArray,
    pickObject,
} from "./pushDeviceService";

const STORAGE_KEY = "push_device_registry_v1"; // { token, deviceId, platform, updatedAt }

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

async function saveRegistry(data) {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) { }
}

async function readRegistry() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

async function clearRegistry() {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (_) { }
}

/**
 * Setup channel (Android)
 */
async function ensureAndroidChannel() {
    if (Platform.OS !== "android") return;

    try {
        await Notifications.setNotificationChannelAsync("med-reminders", {
            name: "Nhắc nhở uống thuốc",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            sound: "default",
        });
    } catch (e) {
        console.log("⚠️ setNotificationChannelAsync error:", e?.message || e);
    }
}

const normalizePlatform = () => {
    if (Platform.OS === "android") return "android";
    if (Platform.OS === "ios") return "ios";
    return "other";
};

/**
 * Xin quyền + lấy DEVICE token
 * Android build APK: đây là FCM registration token (BE firebase-admin gửi được)
 */
export async function getFcmDeviceToken() {
    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        return { granted: false, token: null };
    }

    // ✅ FCM token (Android). iOS sẽ phụ thuộc APNs setup.
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return { granted: true, token: tokenData?.data || null };
}

/**
 * UC-N1: xin quyền + register token lên server
 * Trả về {granted, deviceId?, token?}
 */
export async function ensureNotificationReady() {
    const { granted, token } = await getFcmDeviceToken();
    if (!granted || !token) {
        console.log("🚫 Người dùng từ chối quyền thông báo hoặc không lấy được FCM token.");
        return { granted: false, token: null, deviceId: null };
    }

    const device_platform = normalizePlatform();

    try {
        const res = await registerPushDevice({
            device_platform,
            device_token: token,
        });

        const payload = pickObject(res);
        const deviceId = payload?.id || payload?.device_id;

        await saveRegistry({
            token,
            deviceId: deviceId || null,
            platform: device_platform,
            updatedAt: new Date().toISOString(),
        });

        console.log("✅ Registered FCM token to server:", { deviceId, token });
        return { granted: true, token, deviceId: deviceId || null };
    } catch (e) {
        console.log("⚠️ Không thể register token lên server:", e?.message || e);
        return { granted: true, token, deviceId: null };
    }
}

/**
 * UC-N2: unregister current device on logout
 */
export async function unregisterCurrentPushDevice() {
    try {
        const reg = await readRegistry();

        if (reg?.deviceId) {
            await deletePushDevice(reg.deviceId);
            await clearRegistry();
            console.log("🗑️ Deleted push device (by saved deviceId).");
            return true;
        }

        if (reg?.token) {
            const listRes = await getPushDevices();
            const list = pickArray(listRes);

            const match = (list || []).find(
                (x) => x?.device_token === reg.token || x?.token === reg.token
            );
            const id = match?.id || match?.device_id;

            if (id) {
                await deletePushDevice(id);
                await clearRegistry();
                console.log("🗑️ Deleted push device (found by token).");
                return true;
            }
        }

        await clearRegistry();
        return true;
    } catch (e) {
        console.log("⚠️ unregisterCurrentPushDevice failed:", e?.message || e);
        return false;
    }
}

/**
 * Local notification scheduling (offline)
 */
export async function scheduleMedNotification({ title, body, hour, minute, repeat }) {
    const content = {
        title,
        body,
        sound: true,
        data: { type: "medicine_reminder" },
        channelId: "med-reminders",
    };

    let trigger;

    if (repeat === "daily") {
        trigger = { hour, minute, repeats: true };
    } else {
        const now = new Date();
        const target = new Date();
        target.setHours(hour, minute, 0, 0);
        if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
        trigger = target;
    }

    try {
        const id = await Notifications.scheduleNotificationAsync({ content, trigger });
        return id;
    } catch (e) {
        console.error("❌ scheduleMedNotification error:", e);
        return null;
    }
}

export async function cancelNotification(id) {
    if (!id) return;
    await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🗑️ Đã huỷ tất cả local notifications");
}
