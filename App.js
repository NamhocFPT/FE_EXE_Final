// App.js
import React, { useState } from "react";
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
import HomeScreen from "./src/screens/HomeScreen";
import ScheduleScreen from "./src/screens/ScheduleScreen";
import ProfilesScreen from "./src/screens/ProfilesScreen";
import MyPrescriptionsScreen from "./src/screens/MyPrescriptionsScreen";
import AddPrescriptionScreen from "./src/screens/AddPrescriptionScreen";

import { COLORS, RADIUS } from "./src/constants/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- 1. COMPONENT: CUSTOM HEADER ---
const CustomHeader = ({ activeProfile, onLogout, onSwitchProfile }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity style={styles.profilePill} onPress={onSwitchProfile}>
          <View style={styles.avatarSm} />
          <Text style={styles.profileName}>
            {activeProfile?.name || "Chọn hồ sơ"}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconTxt}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { marginLeft: 8 }]}
            onPress={onLogout}
          >
            <Text style={styles.iconTxt}>⎋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- 2. COMPONENT: CUSTOM BOTTOM BAR (Đã sửa logic ẩn nút thừa) ---
function MyCustomTabBar({ state, descriptors, navigation }) {
  // Danh sách các tab hiển thị (2 trái, 2 phải)
  const visibleRoutes = ["Home", "MyPrescriptions", "Schedule", "Profiles"];

  // Hàm chọn icon dựa trên tên màn hình và trạng thái focus
  const getTabBarIcon = (routeName, isFocused) => {
    let iconName;

    switch (routeName) {
      case "Home":
        iconName = isFocused ? "home" : "home-outline";
        break;
      case "MyPrescriptions":
        // Dùng icon lọ thuốc hoặc bệnh án
        iconName = isFocused ? "medkit" : "medkit-outline";
        break;
      case "Schedule":
        iconName = isFocused ? "calendar" : "calendar-outline";
        break;
      case "Profiles":
        iconName = isFocused ? "person" : "person-outline";
        break;
      default:
        iconName = "alert-circle-outline";
    }
    return iconName;
  };

  return (
    <View style={styles.bottomBarContainer}>
      {/* Nút FAB ở giữa (Dấu cộng) */}
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
          // Chỉ hiển thị các route cho phép
          if (!visibleRoutes.includes(route.name)) return null;

          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : route.name;

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

          // Màu sắc: Xanh khi chọn, Xám khi không chọn
          const color = isFocused ? COLORS.primary600 : "#9CA3AF";
          const iconName = getTabBarIcon(route.name, isFocused);

          return (
            <TouchableOpacity
              key={index}
              style={styles.bottomItem}
              onPress={onPress}
              activeOpacity={0.8}
            >
              {/* Thay thế ô vuông cũ bằng Ionicons */}
              <Ionicons name={iconName} size={24} color={color} style={{ marginBottom: 4 }} />

              <Text style={[styles.bottomText, { color }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// --- 3. MAIN TABS (Chứa TẤT CẢ các màn hình cần hiện Bottom Bar) ---
// --- 3. MAIN TABS ---
function MainTabs({ navigation, activeProfile, accessToken, handleLogout, updateActiveProfile }) {
  return (
    <View style={{ flex: 1 }}>
      <CustomHeader
        activeProfile={activeProfile}
        onLogout={handleLogout}
        onSwitchProfile={() => navigation.navigate("Profiles")}
      />

      <Tab.Navigator
        tabBar={(props) => <MyCustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
        initialRouteName="Home"
      >
        {/* VỊ TRÍ 1: TRÁI */}
        <Tab.Screen
          name="Home"
          options={{ tabBarLabel: "Trang chủ" }}
        >
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

        {/* VỊ TRÍ 2: TRÁI */}
        <Tab.Screen
          name="MyPrescriptions"
          options={{ tabBarLabel: "Đơn thuốc" }}
        >
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

        {/* --- NÚT CỘNG (FAB) SẼ NẰM Ở KHOẢNG CÁCH NÀY --- */}

        {/* VỊ TRÍ 3: PHẢI */}
        <Tab.Screen
          name="Schedule"
          options={{ tabBarLabel: "Lịch nhắc" }}
        >
          {(props) => (
            <ScheduleScreen
              {...props}
              accessToken={accessToken}
              onBackHome={() => navigation.navigate("Home")}
            />
          )}
        </Tab.Screen>

        {/* VỊ TRÍ 4: PHẢI */}
        <Tab.Screen
          name="Profiles"
          options={{ tabBarLabel: "Hồ sơ" }}
        >
          {(props) => (
            <ProfilesScreen
              {...props}
              accessToken={accessToken}
              onBackHome={() => navigation.navigate("Home")}
              onSelectProfile={(profile) => {
                updateActiveProfile(profile);
                navigation.navigate("Home");
              }}
            />
          )}
        </Tab.Screen>

        {/* VỊ TRÍ 5: ẨN (AddPrescription không có trong visibleRoutes nên không hiện icon) */}
        <Tab.Screen name="AddPrescription">
          {(props) => (
            <AddPrescriptionScreen
              {...props}
              accessToken={accessToken}
              onBackHome={() => navigation.goBack()}
              onSuccess={() => navigation.navigate("MyPrescriptions")}
            />
          )}
        </Tab.Screen>

      </Tab.Navigator>
    </View>
  );
}

// --- 4. APP COMPONENT CHÍNH ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);

  const handleSignIn = (userData) => {
    setUser(userData);
    setActiveProfile({
      id: 1,
      name: userData.name || "Nguyễn Văn Nam",
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
        <StatusBar style="dark-content" backgroundColor="white" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          {!user ? (
            // --- LUỒNG AUTH ---
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onSignIn={handleSignIn} />}
            </Stack.Screen>
          ) : (
            // --- LUỒNG CHÍNH ---
            // Chỉ còn duy nhất MainTabs, mọi màn hình con đều nằm trong MainTabs
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
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// --- STYLES (Giữ nguyên) ---
// --- STYLES ---
const styles = StyleSheet.create({
  // ============================
  // 1. CONTAINER & GLOBAL
  // ============================
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Màu nền chung cho toàn app (xám nhạt)
  },

  // ============================
  // 2. HEADER STYLES
  // ============================
  headerContainer: {
    backgroundColor: COLORS.white,
    // PaddingTop được xử lý dynamic trong component bằng useSafeAreaInsets
    // Nhưng ta thêm border dưới để tách biệt nội dung
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 100, // Luôn nổi lên trên cùng
  },
  headerContent: {
    height: 60, // Chiều cao cố định cho phần nội dung header
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  
  // Profile Pill (Cục bo tròn chứa Avatar + Tên)
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary100 || '#E0F2FE', // Màu nền xanh nhạt
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
    maxWidth: 120, // Giới hạn độ dài tên tránh vỡ layout
  },
  caret: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.text600 || '#6B7280',
    marginTop: -2,
  },

  // Header Right (Icon chuông, logout)
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Khoảng cách giữa các icon
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6', // Nền xám nhạt cho nút
    alignItems: "center",
    justifyContent: "center",
  },
  iconTxt: {
    fontSize: 18,
    color: COLORS.text900,
  },

  // ============================
  // 3. BOTTOM BAR STYLES
  // ============================
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Đổ bóng (Shadow) cho iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // Đổ bóng cho Android
    elevation: 20, 
    zIndex: 90,
  },
  bottomBar: {
    height: 70, // Cao hơn một chút để thao tác dễ hơn
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    // Bo 2 góc trên cho mềm mại
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: '100%',
    paddingTop: 8, // Đẩy icon xuống một chút cho cân đối
  },
  bottomText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
    textAlign: 'center',
  },

  // ============================
  // 4. FAB (FLOATING ACTION BUTTON)
  // ============================
  fab: {
    position: "absolute",
    top: -28, // Nổi lên một nửa (56/2)
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary600 || '#2563EB',
    alignItems: "center",
    justifyContent: "center",
    
    // Shadow cho nút
    shadowColor: COLORS.primary600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    
    // Viền trắng (hoặc màu nền app) để tạo hiệu ứng "tách biệt"
    borderWidth: 4,
    borderColor: '#F5F5F5', // Trùng với màu nền safeArea để tạo cảm giác trong suốt
    zIndex: 100,
  },
});