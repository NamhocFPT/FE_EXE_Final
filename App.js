// App.js
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";

// --- IMPORT CÁC MÀN HÌNH ---
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ProfilesScreen from "./src/screens/ProfilesScreen";
import AddPrescriptionScreen from "./src/screens/AddPrescriptionScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";
import MyPrescriptionsScreen from "./src/screens/MyPrescriptionsScreen";

// --- IMPORT UTILS & CONSTANTS ---
import { getBase } from "./src/utils/apiBase";
import { ensureNotificationReady } from "./src/services/notifications";
import { COLORS, RADIUS } from "./src/constants/theme";

export default function App() {
  const [activeProfile, setActiveProfile] = useState(null);
  const [screen, setScreen] = useState("home");
  const [accessToken, setAccessToken] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Mock progress data
  const progress = useMemo(
    () => ({ takenPct: 0.87, missed: 3, total: 12 }),
    []
  );

  // --- LOGIC FETCH API ---
  const fetchProfiles = useCallback(async () => {
    if (!accessToken) return;
    try {
      const base = getBase();
      const res = await fetch(`${base}/api/profiles`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setProfiles(json.data);
        if (activeProfile && json.data.length > 0) {
          const selfProfile =
            json.data.find((p) => p.relationship === "self") || json.data[0];
          setActiveProfile({ id: selfProfile.id, name: selfProfile.name });
        }
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    }
  }, [accessToken, !activeProfile]);

  const fetchTodayReminders = useCallback(async () => {
    if (!accessToken || !activeProfile) return;
    setLoadingReminders(true);
    try {
      const base = getBase();
      const res = await fetch(`${base}/api/schedules`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        // Filter schedules for active profile and today (Mock logic)
        const reminders = json.data
          .filter(
            (schedule) =>
              schedule.tbl_prescription?.tbl_profile?.id === activeProfile.id
          )
          .map((schedule) => {
            const prescription = schedule.tbl_prescription;
            const medicine = prescription?.tbl_medicine;
            return {
              id: schedule.id,
              time: schedule.reminder_time?.substring(0, 5) || "00:00",
              title: medicine?.name || "Thuốc",
              dose: prescription?.dosage || "",
              extra: `${schedule.quantity} ${
                prescription?.unit || "viên"
              } • ${prescription?.note || ""}`,
              scheduleId: schedule.id,
            };
          });

        setTodayReminders(reminders);
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoadingReminders(false);
    }
  }, [accessToken, activeProfile]);

  useEffect(() => {
    if (accessToken) fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (accessToken && activeProfile) fetchTodayReminders();
  }, [fetchTodayReminders]);

  useEffect(() => {
    (async () => {
      try {
        await ensureNotificationReady();
      } catch (e) {
        console.warn("Không thể khởi tạo notification:", e.message);
      }
    })();
  }, []);

  // --- RENDER MÀN HÌNH LOGIN ---
  if (!activeProfile) {
    return (
      <LoginScreen
        onSignIn={(payload) => {
          setActiveProfile({ id: payload.id || null, name: payload.name });
          if (payload.accessToken) setAccessToken(payload.accessToken);
        }}
      />
    );
  }

  // --- RENDER APP CHÍNH ---
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profilePill}>
          <View style={styles.avatarSm} />
          <Text style={styles.profileName}>{activeProfile.name}</Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconTxt}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { marginLeft: 8 }]}
            onPress={() => {
              setActiveProfile(null);
              setAccessToken(null);
              setScreen("home");
            }}
          >
            <Text style={styles.iconTxt}>⎋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY CONTENT */}
      {screen === "home" ? (
        <HomeScreen
          activeProfile={activeProfile}
          profiles={profiles}
          todayReminders={todayReminders}
          loadingReminders={loadingReminders}
          progress={progress}
          onGoPrescriptions={() => setScreen("rx")}
          onGoProfiles={() => setScreen("profiles")}
          onGoAddPrescription={() => setScreen("addRx")}
          onGoSchedule={() => setScreen("schedule")}
          onSelectProfile={(p) => setActiveProfile({ id: p.id, name: p.name })}
          accessToken={accessToken}
          onRefreshReminders={fetchTodayReminders}
        />
      ) : screen === "rx" ? (
        <MyPrescriptionsScreen
          onBackHome={() => setScreen("home")}
          activeProfileId={activeProfile?.id}
          activeProfile={activeProfile}
          profiles={profiles}
          onSelectProfile={(p) => setActiveProfile({ id: p.id, name: p.name })}
          onGoSchedule={() => setScreen("schedule")}
          accessToken={accessToken}
        />
      ) : screen === "profiles" ? (
        <ProfilesScreen
          onBackHome={() => setScreen("home")}
          accessToken={accessToken}
          onSelectProfile={(p) => {
            setActiveProfile({ id: p.id, name: p.name });
            fetchTodayReminders();
            setScreen("home");
          }}
        />
      ) : screen === "addRx" ? (
        <AddPrescriptionScreen
          onBackHome={() => setScreen("home")}
          accessToken={accessToken}
          onSuccess={() => fetchTodayReminders()}
        />
      ) : screen === "schedule" ? (
        <ScheduleScreen
          onBackHome={() => setScreen("home")}
          accessToken={accessToken}
          onSuccess={() => fetchTodayReminders()}
        />
      ) : null}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.fab}
        onPress={() => setScreen("addRx")}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </TouchableOpacity>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomBar}>
        {[
          { label: "Trang chủ", key: "home" },
          { label: "Đơn thuốc", key: "rx" },
          { label: "Lịch nhắc", key: "schedule" },
          { label: "Báo cáo", key: "reports" },
          { label: "Hồ sơ", key: "profile" },
        ].map((item) => {
          const active = screen === item.key;
          const target = item.key === "profile" ? "profiles" : item.key;
          const pressable = ["home", "rx", "schedule", "profile"].includes(
            item.key
          );

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.bottomItem}
              activeOpacity={pressable ? 0.8 : 1}
              onPress={() => pressable && setScreen(target)}
            >
              <View
                style={[
                  styles.bottomIcon,
                  { backgroundColor: active ? COLORS.primary600 : "#D1D5DB" },
                ]}
              />
              <Text
                style={[
                  styles.bottomText,
                  { color: active ? COLORS.primary600 : "#9CA3AF" },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line300,
  },
  profilePill: {
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary100,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  profileName: { marginLeft: 8, color: COLORS.text900, fontWeight: "600" },
  caret: { marginLeft: 4, color: COLORS.accent700 },
  avatarSm: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent700,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary100,
  },
  iconTxt: { fontSize: 14 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 76,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary600,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  fabPlus: { color: COLORS.white, fontSize: 24, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line300,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  bottomItem: { alignItems: "center", justifyContent: "center" },
  bottomIcon: { width: 20, height: 20, borderRadius: 6, marginBottom: 4 },
  bottomText: { fontSize: 11, fontWeight: "600" },
});