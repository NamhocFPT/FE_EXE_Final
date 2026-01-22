// src/services/notifications.js
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, post, del } from "../utils/request";

// ===========================
// API PATHS (theo contract)
// ===========================
const PATH_PUSH_DEVICES = "/push-devices";

// ===========================
// STORAGE KEYS
// ===========================
const KEY_PUSH_DEVICE_ID = "pushDeviceId";
const KEY_PUSH_TOKEN = "fcmToken"; // ✅ đổi tên cho đúng

// ===========================
// Notification Handler (UI)
// ===========================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

// ===========================
// Helpers
// ===========================
const pickArray = (res) => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const pickObject = (res) => res?.data ?? res;

const safeString = (v) => (v === null || v === undefined ? "" : String(v));

const normalizePlatform = () => {
  // contract: ios/android/web/other
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "other";
};

// ===========================
// UC-N1: Ensure ready + register token to BE
// Call after login success (token already stored)
// ===========================
export async function ensureNotificationReady() {
  // A) Android channel (khuyến nghị)
  if (Platform.OS === "android") {
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

  // B) Permission
  let finalStatus = "undetermined";
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  } catch (e) {
    console.log("⚠️ get/requestPermissionsAsync error:", e?.message || e);
    return false;
  }

  if (finalStatus !== "granted") {
    console.log("🚫 Người dùng từ chối quyền thông báo!");
    return false;
  }

  // C) Get DEVICE push token (FCM on Android) + POST /push-devices
  try {
    // ✅ Đây là token để BE firebase-admin gửi được (Android: FCM)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const deviceToken = tokenData?.data;

    console.log("📲 Device Push Token (FCM on Android):", deviceToken);

    if (!deviceToken) {
      console.log("⚠️ Không lấy được Device/FCM token.");
      return false;
    }

    // Lưu local
    await AsyncStorage.setItem(KEY_PUSH_TOKEN, deviceToken);

    // Gửi lên BE
    const res = await post(PATH_PUSH_DEVICES, {
      device_platform: normalizePlatform(),
      device_token: deviceToken,
    });

    const payload = pickObject(res);
    const deviceObj = payload?.push_device ?? payload?.device ?? payload;
    const deviceId = deviceObj?.id ?? deviceObj?.device_id;

    if (deviceId) {
      await AsyncStorage.setItem(KEY_PUSH_DEVICE_ID, safeString(deviceId));
      console.log("✅ Đã register device lên BE. deviceId =", deviceId);
    } else {
      console.log(
        "⚠️ POST /push-devices OK nhưng không thấy deviceId trong response:",
        deviceObj
      );
    }

    return true;
  } catch (error) {
    console.log("⚠️ Không thể gửi Token lên Server:", error?.message || error);
    return false;
  }
}

// ===========================
// UC-N2: Unregister current device on logout
// Call BEFORE clearing accessToken
// ===========================
export async function unregisterCurrentPushDevice() {
  try {
    const deviceId = await AsyncStorage.getItem(KEY_PUSH_DEVICE_ID);

    if (deviceId) {
      await del(`${PATH_PUSH_DEVICES}/${deviceId}`);
      console.log("🗑️ Đã xoá device trên BE:", deviceId);
      return true;
    }

    // Fallback: nếu thiếu deviceId, match theo token qua GET /push-devices
    const token = await AsyncStorage.getItem(KEY_PUSH_TOKEN);
    if (!token) {
      console.log("ℹ️ Không có token/deviceId để unregister.");
      return false;
    }

    const listRes = await get(PATH_PUSH_DEVICES);
    const items = pickArray(listRes);

    const matched = items.find((x) => x?.device_token === token);
    const matchedId = matched?.id ?? matched?.device_id;

    if (matchedId) {
      await del(`${PATH_PUSH_DEVICES}/${matchedId}`);
      console.log("🗑️ Đã xoá device theo token match:", matchedId);
      return true;
    }

    console.log("ℹ️ Không tìm thấy device trên BE để xoá (match token failed).");
    return false;
  } catch (e) {
    console.log("⚠️ unregisterCurrentPushDevice error:", e?.message || e);
    return false;
  } finally {
    await AsyncStorage.removeItem(KEY_PUSH_DEVICE_ID);
    await AsyncStorage.removeItem(KEY_PUSH_TOKEN);
  }
}

// ===========================
// Local notifications (offline)
// ===========================
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
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    trigger = target;
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({ content, trigger });
    return id;
  } catch (e) {
    console.error("❌ scheduleMedNotification error:", e?.message || e);
    return null;
  }
}

export async function cancelNotification(id) {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("🗑️ Đã hủy tất cả thông báo Local");
}

// ===========================
// Optional debug helpers
// ===========================
export async function debugListPushDevices() {
  try {
    const res = await get(PATH_PUSH_DEVICES);
    const items = pickArray(res);
    console.log("📦 Push devices:", items);
    return items;
  } catch (e) {
    console.log("⚠️ debugListPushDevices error:", e?.message || e);
    return [];
  }
}

export async function debugGetStoredPushDeviceInfo() {
  const deviceId = await AsyncStorage.getItem(KEY_PUSH_DEVICE_ID);
  const token = await AsyncStorage.getItem(KEY_PUSH_TOKEN);
  return { deviceId, token };
}
