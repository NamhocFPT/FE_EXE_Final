// App.js
import React, { useState, useEffect } from "react";
import { ensureNotificationReady } from "./src/services/notificationClient";
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { NavigationContainer, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from '@expo/vector-icons';

// --- IMPORT CÁC MÀN HÌNH ---
import LoginScreen from "./src/screens/LoginScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";
import ProfilesScreen from "./src/screens/ProfilesScreen";
import MyPrescriptionsScreen from "./src/screens/MyPrescriptionsScreen";
import AddPrescriptionScreen from "./src/screens/AddPrescriptionScreen";
import AccountDetailsScreen from "./src/screens/AccountDetailsScreen";
import EditAccountScreen from "./src/screens/EditAccountScreen";
import ProfileDetailScreen from "./src/screens/ProfileDetailScreen"; // <--- Thêm màn hình chi tiết

import { COLORS, RADIUS } from "./src/constants/theme";
import ShareProfileScreen from "./src/screens/ShareProfileScreen";
import AddManualMedicationScreen from "./src/screens/AddManualMedicationScreen";
import ComplianceReportScreen from "./src/screens/ComplianceReportScreen";
import SymptomHistoryScreen from "./src/screens/SymptomHistoryScreen";
import AddSymptomScreen from "./src/screens/AddSymptomScreen";
import SymptomDetailScreen from "./src/screens/SymptomDetailScreen";
import { unregisterCurrentPushDevice } from "./src/services/notificationClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationSettingsScreen from "./src/screens/NotificationSettingsScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- 1. COMPONENT: CUSTOM HEADER (Avatar + Notifications + Logout) ---
const CustomHeader = ({ activeProfile, onLogout, navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.profilePill}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("AccountDetails")}
        >
          <View style={styles.avatarSm}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {activeProfile?.name ? activeProfile.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {activeProfile?.name || "Chọn hồ sơ"}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.text900} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { marginLeft: 8 }]}
            onPress={onLogout}
          >
            <Ionicons name="power-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 2. COMPONENT: CUSTOM BOTTOM TAB BAR ---
function MyCustomTabBar({ state, descriptors, navigation }) {
  const visibleRoutes = ["Home", "MyPrescriptions", "Schedule", "Profiles"];

  return (
    <View style={styles.bottomBarContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.fab}
        onPress={() => navigation.navigate("AddPrescription")}
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      <View style={styles.bottomBar}>
        {state.routes.map((route, index) => {
          if (!visibleRoutes.includes(route.name)) return null;

          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const color = isFocused ? COLORS.primary600 : "#9CA3AF";
          let iconName;
          if (route.name === "Home") iconName = isFocused ? "home" : "home-outline";
          else if (route.name === "MyPrescriptions") iconName = isFocused ? "medkit" : "medkit-outline";
          else if (route.name === "Schedule") iconName = isFocused ? "calendar" : "calendar-outline";
          else if (route.name === "Profiles") iconName = isFocused ? "people" : "people-outline";

          return (
            <TouchableOpacity key={index} style={styles.bottomItem} onPress={onPress} activeOpacity={0.8}>
              <Ionicons name={iconName} size={24} color={color} style={{ marginBottom: 4 }} />
              <Text style={[styles.bottomText, { color }]}>{descriptors[route.key].options.tabBarLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// --- 3. MAIN TABS NAVIGATION ---
function MainTabs({ navigation, route, activeProfile, accessToken, handleLogout, updateActiveProfile }) {

  // Ẩn Header Avatar nếu đang ở tab Profiles (vì Profiles có tiêu đề riêng)
  const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
  const showCustomHeader = routeName !== "Profiles";

  return (
    <View style={{ flex: 1 }}>
      {showCustomHeader && (
        <CustomHeader activeProfile={activeProfile} onLogout={handleLogout} navigation={navigation} />
      )}
      <Tab.Navigator
        tabBar={(props) => <MyCustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        initialRouteName="Home"
      >
        <Tab.Screen name="Home" options={{ tabBarLabel: "Trang chủ" }}>
          {(props) => <HomeScreen {...props} accessToken={accessToken} activeProfile={activeProfile} />}
        </Tab.Screen>

        <Tab.Screen name="MyPrescriptions" options={{ tabBarLabel: "Đơn thuốc" }}>
          {(props) => <MyPrescriptionsScreen {...props} accessToken={accessToken} activeProfileId={activeProfile?.id} />}
        </Tab.Screen>

        <Tab.Screen name="Schedule" options={{ tabBarLabel: "Lịch nhắc" }}>
          {(props) => <ScheduleScreen {...props} accessToken={accessToken} />}
        </Tab.Screen>

        <Tab.Screen name="Profiles" options={{ tabBarLabel: "Hồ sơ" }}>
          {(props) => <ProfilesScreen {...props} accessToken={accessToken} onSelectProfile={updateActiveProfile} />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

// --- 4. ROOT APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);

  // useEffect(() => {
  //   ensureNotificationReady();
  // }, []);

  const handleSignIn = async (userData) => {
    setUser(userData);

    setActiveProfile({
      id: userData.id || 1,
      name: userData.full_name || userData.name || "Tôi",
      relationship: "self",
    });

    // ✅ UC-N1: login xong mới xin quyền + lấy token + POST /push-devices
    try {
      await ensureNotificationReady();
    } catch (e) {
      console.log("⚠️ ensureNotificationReady error:", e?.message);
    }
  };
  const handleLogout = async () => {
    try {
      // ✅ UC-N2: xoá device khỏi BE
      await unregisterCurrentPushDevice();
    } catch (e) {
      console.log("⚠️ unregister push device error:", e?.message);
    } finally {
      await AsyncStorage.removeItem("accessToken");
      // await AsyncStorage.removeItem("pushDeviceId"); // nếu bạn có lưu
      setUser(null);
      setActiveProfile(null);
    }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onSignIn={handleSignIn} />}
              </Stack.Screen>
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          ) : (
            <>
              {/* Màn hình chứa Tab Bar */}
              <Stack.Screen name="MainTabs">
                {(props) => (
                  <MainTabs
                    {...props}
                    activeProfile={activeProfile}
                    accessToken={user.accessToken}
                    handleLogout={handleLogout}
                    updateActiveProfile={setActiveProfile}
                  />
                )}
              </Stack.Screen>

              {/* Màn hình chi tiết nằm ngoài Tab để ẩn BottomBar */}
              <Stack.Screen name="ProfileDetail">
                {(props) => (
                  <ProfileDetailScreen
                    {...props}
                    accessToken={user?.accessToken} // Truyền token vào đây
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="AddPrescription">
                {(props) => (
                  <AddPrescriptionScreen
                    {...props}
                    accessToken={user.accessToken}
                    onSuccess={() => props.navigation.navigate("MainTabs", { screen: "MyPrescriptions" })}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="AccountDetails">
                {(props) => <AccountDetailsScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>

              <Stack.Screen name="EditAccount" component={EditAccountScreen} />
              <Stack.Screen name="ShareProfile" component={ShareProfileScreen} />
              <Stack.Screen name="SymptomHistory">
                {(props) => (
                  <SymptomHistoryScreen
                    {...props}
                    accessToken={user?.accessToken} // Truyền token vào đây
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="AddSymptom">
                {(props) => (
                  <AddSymptomScreen
                    {...props}
                    accessToken={user?.accessToken} // Truyền token vào đây
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="SymptomDetail">
                {(props) => (
                  <SymptomDetailScreen
                    {...props}
                    accessToken={user?.accessToken} // Truyền token vào đây
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="AddManualMedication"
                component={AddManualMedicationScreen}
                options={{
                  title: "Thêm thuốc tự do",
                  headerShown: false // Hiện thanh tiêu đề nếu cần
                }}
              />
              <Stack.Screen
                name="ComplianceReport"
                component={ComplianceReportScreen}
                options={({ navigation }) => ({
                  title: 'Báo cáo tuân thủ',
                  headerShown: true,
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => navigation.goBack()}
                      style={{ marginLeft: 0, flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Ionicons name="chevron-back" size={28} color={COLORS.primary600} />
                      {/* Không để Text ở đây, chữ MainTabs sẽ biến mất vĩnh viễn */}
                    </TouchableOpacity>
                  ),
                })}
              />
              <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', zIndex: 100 },
  headerContent: { height: 60, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profilePill: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary100, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 30 },
  avatarSm: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary600, alignItems: 'center', justifyContent: 'center' },
  profileName: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: COLORS.text900, maxWidth: 120 },
  caret: { marginLeft: 4, fontSize: 12, color: COLORS.text600 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', alignItems: "center", justifyContent: "center" },
  bottomBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 20, zIndex: 90 },
  bottomBar: { height: 70, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  bottomItem: { flex: 1, alignItems: "center", justifyContent: "center", height: '100%', paddingTop: 8 },
  bottomText: { fontSize: 10, fontWeight: "600", marginTop: 4, textAlign: 'center' },
  fab: { position: "absolute", top: -28, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary600, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary600, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, borderWidth: 4, borderColor: '#F5F5F5', zIndex: 100 },
});