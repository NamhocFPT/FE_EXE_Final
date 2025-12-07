// notifications.js
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Hiển thị thông báo cả khi app đang mở (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // hiển thị banner khi app foreground
    shouldShowList: true, // hiển thị trong Notification Center (iOS)
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Gọi 1 lần trước khi schedule
export async function ensureNotificationReady() {
  // Android: tạo channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("med-reminders", {
      name: "Medicine Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  // Quyền thông báo
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    throw new Error("Chưa được cấp quyền thông báo");
  }
}

/**
 * Lên lịch local notification.
 * repeat: "none" | "daily" | "weekly"
 * Nếu "weekly", truyền weekday: 1..7 (1=Chủ nhật ... 7=Thứ bảy)
 */
export async function scheduleMedNotification({
  title,
  body,
  hour,
  minute,
  repeat,
  weekday, // chỉ dùng cho weekly
}) {
  const content = { title, body, sound: true };

  let trigger;
  if (repeat === "daily") {
    trigger = { hour, minute, repeats: true, channelId: "med-reminders" };
  } else if (repeat === "weekly") {
    trigger = {
      weekday: weekday || 2, // mặc định Thứ Hai
      hour,
      minute,
      repeats: true,
      channelId: "med-reminders",
    };
  } else {
    // one-off: bắn lần gần nhất
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    trigger = target;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger,
  });

  return id; // lưu nếu muốn hủy sau
}

export async function cancelNotification(id) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
