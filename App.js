// App.js
import React, { useState, useEffect } from "react";
import { ensureNotificationReady } from "./src/services/notifications";
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
import { COLORS, RADIUS } from "./src/constants/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- 1. COMPONENT: CUSTOM HEADER (App Bar) ---
const CustomHeader = ({ activeProfile, onLogout, onSwitchProfile, navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {/* Nút Avatar: Bấm vào chuyển sang trang Tài khoản (AccountDetails) */}
        <TouchableOpacity
          style={styles.profilePill}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("AccountDetails")} // <--- ĐIỀU HƯỚNG SANG ACCOUNT
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
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.text900} />
          </TouchableOpacity>
          {/* Nút Logout nhanh (nếu cần) */}
          <TouchableOpacity
            style={[styles.iconBtn, { marginLeft: 8 }]}
            onPress={onLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.text900} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 2. COMPONENT: CUSTOM BOTTOM BAR ---
function MyCustomTabBar({ state, descriptors, navigation }) {
  // Chỉ hiển thị các tab này, ẩn các màn khác nếu lỡ lọt vào
  const visibleRoutes = ["Home", "MyPrescriptions", "Schedule", "Profiles"];

  const getTabBarIcon = (routeName, isFocused) => {
    switch (routeName) {
      case "Home": return isFocused ? "home" : "home-outline";
      case "MyPrescriptions": return isFocused ? "medkit" : "medkit-outline";
      case "Schedule": return isFocused ? "calendar" : "calendar-outline";
      case "Profiles": return isFocused ? "people" : "people-outline";
      default: return "alert-circle-outline";
    }
  };

  return (
    <View style={styles.bottomBarContainer}>
      {/* Nút FAB (Dấu cộng) nằm giữa, đè lên trên */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.fab}
        onPress={() => navigation.navigate("AddPrescription")}
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      {/* Thanh Menu */}
      <View style={styles.bottomBar}>
        {state.routes.map((route, index) => {
          if (!visibleRoutes.includes(route.name)) return null;

          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = isFocused ? COLORS.primary600 : "#9CA3AF";
          const iconName = getTabBarIcon(route.name, isFocused);

          return (
            <TouchableOpacity
              key={index}
              style={styles.bottomItem}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Ionicons name={iconName} size={24} color={color} style={{ marginBottom: 4 }} />
              <Text style={[styles.bottomText, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// --- 3. MAIN TABS (Màn hình chính chứa Tab Bar) ---
function MainTabs({ navigation, activeProfile, accessToken, handleLogout, updateActiveProfile }) {
  return (
    <View style={{ flex: 1 }}>
      <CustomHeader
        activeProfile={activeProfile}
        onLogout={handleLogout}
        onSwitchProfile={() => { }} // Logic này đã chuyển vào onPress của Header
        navigation={navigation}
      />

      <Tab.Navigator
        tabBar={(props) => <MyCustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        initialRouteName="Home"
      >
        {/* Tab 1: Trang chủ */}
        <Tab.Screen name="Home" options={{ tabBarLabel: "Trang chủ" }}>
          {(props) => (
            <HomeScreen
              {...props}
              accessToken={accessToken}
              activeProfile={activeProfile}
              onGoProfiles={() => navigation.navigate("Profiles")}
              onGoPrescriptions={() => navigation.navigate("MyPrescriptions")}
              onGoSchedule={() => navigation.navigate("Schedule")}
              onGoAddPrescription={() => navigation.navigate("AddPrescription")}
            />
          )}
        </Tab.Screen>

        {/* Tab 2: Đơn thuốc */}
        <Tab.Screen name="MyPrescriptions" options={{ tabBarLabel: "Đơn thuốc" }}>
          {(props) => (
            <MyPrescriptionsScreen
              {...props}
              accessToken={accessToken}
              activeProfileId={activeProfile?.id}
              onBackHome={() => navigation.navigate("Home")}
              onGoSchedule={() => navigation.navigate("Schedule")}
            />
          )}
        </Tab.Screen>

        {/* Tab 3: Lịch nhắc */}
        <Tab.Screen name="Schedule" options={{ tabBarLabel: "Lịch nhắc" }}>
          {(props) => (
            <ScheduleScreen
              {...props}
              accessToken={accessToken}
              onBackHome={() => navigation.navigate("Home")}
            />
          )}
        </Tab.Screen>

        {/* Tab 4: Hồ sơ */}
        <Tab.Screen name="Profiles" options={{ tabBarLabel: "Hồ sơ" }}>
          {(props) => (
            <ProfilesScreen
              {...props}
              accessToken={accessToken}
              // ProfilesScreen tự xử lý navigate
              onSelectProfile={(profile) => {
                updateActiveProfile(profile);
              }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

// --- 4. APP COMPONENT (ROOT) ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    const initNotifications = async () => {
      await ensureNotificationReady();
    };
    initNotifications();
  }, []);

  const handleSignIn = (userData) => {
    setUser(userData);
    // Profile mặc định là bản thân
    setActiveProfile({
      id: userData.id || 1,
      name: userData.full_name || userData.name || "Tôi",
      relationship: 'self'
    });
  };

  const handleLogout = () => {
    setUser(null);
    setActiveProfile(null);
  };

  const updateActiveProfile = (profile) => {
    setActiveProfile(profile);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          {!user ? (
            // --- LUỒNG AUTH ---
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onSignIn={handleSignIn} />}
              </Stack.Screen>
              <Stack.Screen name="SignUp">
                {(props) => (
                  <SignUpScreen
                    {...props}
                    onNavigate={(screenName) => {
                      if (screenName === 'login' || screenName === 'profile') {
                        props.navigation.navigate("Login");
                      }
                    }}
                  />
                )}
              </Stack.Screen>
            </>
          ) : (
            // --- LUỒNG CHÍNH ---
            <>
              {/* 1. Màn hình Tabs chính */}
              <Stack.Screen name="MainTabs">
                {(props) => (
                  <MainTabs
                    {...props}
                    activeProfile={activeProfile}
                    accessToken={user.accessToken}
                    handleLogout={handleLogout}
                    updateActiveProfile={updateActiveProfile}
                  />
                )}
              </Stack.Screen>

              {/* 2. Màn hình Thêm đơn thuốc (Nằm ngoài Tab để che BottomBar) */}
              <Stack.Screen
                name="AddPrescription"
                options={{ headerShown: false }} // Tắt header mặc định để dùng Custom Header
              >
                {(props) => (
                  <AddPrescriptionScreen
                    {...props}
                    accessToken={user.accessToken}
                    onSuccess={() => props.navigation.navigate("MyPrescriptions")}
                  />
                )}
              </Stack.Screen>

              {/* 3. Màn hình Chi tiết tài khoản (Nằm ngoài Tab) */}
              <Stack.Screen
                name="AccountDetails"
                options={{ headerShown: false }} // Tắt header mặc định
              >
                {(props) => (
                  <AccountDetailsScreen
                    {...props}
                    onLogout={handleLogout}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="EditAccount"
                options={{ headerShown: false }}
              >
                {(props) => <EditAccountScreen {...props} />}
              </Stack.Screen>

            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  // 1. CONTAINER
  headerContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 100,
  },
  headerContent: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // 2. HEADER ELEMENTS
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary100 || '#E0F2FE',
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 12,
    borderRadius: 30,
  },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent700 || '#0369A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text900 || '#111827',
    maxWidth: 120,
  },
  caret: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.text600 || '#6B7280',
    marginTop: -2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: "center",
    justifyContent: "center",
  },

  // 3. BOTTOM BAR
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 90,
  },
  bottomBar: {
    height: 70,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: '100%',
    paddingTop: 8,
  },
  bottomText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    textAlign: 'center',
  },

  // 4. FAB
  fab: {
    position: "absolute",
    top: -28,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary600 || '#2563EB',
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#F5F5F5',
    zIndex: 100,
  },
});