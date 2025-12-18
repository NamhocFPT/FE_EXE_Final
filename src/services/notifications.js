import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 1. Cấu hình hiển thị thông báo khi App đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

// 2. Hàm khởi tạo (Gọi 1 lần ở App.js hoặc Home)
export async function ensureNotificationReady() {
  if (Platform.OS === "android") {
    // Tạo kênh thông báo riêng cho nhắc thuốc (quan trọng cho Android)
    await Notifications.setNotificationChannelAsync("med-reminders", {
      name: "Nhắc nhở uống thuốc",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default", // Hoặc file âm thanh tùy chỉnh nếu có
    });
  }

  // Xin quyền thông báo
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== "granted") {
    console.log("Người dùng từ chối quyền thông báo!");
    return false;
  }
  return true;
}

/**
 * Lên lịch thông báo
 * @param {string} title - Tiêu đề
 * @param {string} body - Nội dung
 * @param {number} hour - Giờ (0-23)
 * @param {number} minute - Phút (0-59)
 * @param {string} repeat - "daily" | "none"
 */
export async function scheduleMedNotification({ title, body, hour, minute, repeat }) {
  // SỬA LỖI: channelId phải nằm ở 'content', không phải 'trigger'
  const content = { 
    title, 
    body, 
    sound: true,
    data: { type: 'medicine_reminder' }, // Để sau này xử lý khi bấm vào thông báo
    channelId: "med-reminders" // <-- QUAN TRỌNG CHO ANDROID
  };

  let trigger;

  if (repeat === "daily") {
    // Lặp hàng ngày
    trigger = { 
      hour, 
      minute, 
      repeats: true 
    };
  } else {
    // Chỉ báo 1 lần (One-off)
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // Nếu giờ đã qua thì đặt cho ngày mai
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    trigger = target; // Expo tự hiểu Date object là trigger 1 lần
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });
    console.log(`✅ Đã đặt lịch: ${hour}:${minute} (${repeat}) - ID: ${id}`);
    return id;
  } catch (e) {
    console.error("❌ Lỗi đặt lịch:", e);
    return null;
  }
}

// Hủy 1 thông báo theo ID
export async function cancelNotification(id) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// Hủy toàn bộ thông báo (Dùng khi Logout hoặc Xóa hết lịch)
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("🗑️ Đã hủy tất cả thông báo");
}