import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
// Import hàm gửi request
import { post } from "../utils/request"; 

// --- CẤU HÌNH API ---
const PATH_PUSH_DEVICES = "/push-devices"; // Theo API Contract

// 1. Cấu hình hiển thị (Giữ nguyên)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

// 2. Hàm khởi tạo & ĐĂNG KÝ VỚI SERVER (Đã sửa)
export async function ensureNotificationReady() {
  let finalStatus;

  // A. Cấu hình Channel cho Android (Giữ nguyên)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("med-reminders", {
      name: "Nhắc nhở uống thuốc",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }

  // B. Xin quyền (Giữ nguyên)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  finalStatus = existingStatus;
  
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== "granted") {
    console.log("🚫 Người dùng từ chối quyền thông báo!");
    return false;
  }

  // --- C. BỔ SUNG: LẤY TOKEN VÀ GỬI LÊN SERVER ---
  try {
    // 1. Lấy token từ Expo/Firebase
    const tokenData = await Notifications.getExpoPushTokenAsync({
      // projectId: "..." // Nếu bạn dùng EAS Build thì cần Project ID ở đây
    });
    const deviceToken = tokenData.data;
    console.log("📲 Device Token:", deviceToken);

    // 2. Gọi API đăng ký thiết bị (Theo Contract: POST /api/v1/push-devices)
    // Body: { device_platform, device_token }
    await post(PATH_PUSH_DEVICES, {
      device_platform: Platform.OS, // 'android' hoặc 'ios'
      device_token: deviceToken
    });
    
    console.log("✅ Đã đồng bộ Token lên Server");
  } catch (error) {
    // Không chặn app nếu lỗi mạng hoặc server, chỉ log ra thôi
    console.log("⚠️ Không thể gửi Token lên Server:", error.message);
  }

  return true;
}

/**
 * Lên lịch thông báo Local (Giữ nguyên logic nhắc thuốc offline)
 */
export async function scheduleMedNotification({ title, body, hour, minute, repeat }) {
  const content = { 
    title, 
    body, 
    sound: true,
    data: { type: 'medicine_reminder' },
    channelId: "med-reminders"
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
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
    return id;
  } catch (e) {
    console.error("❌ Lỗi đặt lịch:", e);
    return null;
  }
}

export async function cancelNotification(id) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// Bổ sung: Xóa Token trên server khi đăng xuất (Optional nhưng nên làm)
export async function unregisterPushDevice(deviceId) {
    // Theo Contract: DELETE /api/v1/push-devices/{deviceId}
    // Logic này cần xử lý khéo để lưu deviceId lại sau khi register
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("🗑️ Đã hủy tất cả thông báo Local");
}