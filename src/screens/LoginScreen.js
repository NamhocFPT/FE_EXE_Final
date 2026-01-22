import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
// Dùng thư viện LinearGradient của Expo
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../constants/theme";

// Import Service login
import { login } from "../services/authService";

export default function LoginScreen({ onSignIn, navigation }) {
  // 1. Đổi state Phone -> Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async () => {
    setError(null);

    // 2. Validate Email & Password
    if (!email.trim() || !password) {
      setError("Vui lòng nhập Email và Mật khẩu");
      return;
    }

    // (Tùy chọn) Kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Địa chỉ Email không hợp lệ");
      return;
    }

    setLoading(true);

    try {
      const data = await login(email.trim(), password);

      const token = data?.accessToken;
      if (!token) throw new Error("Không nhận được token truy cập từ máy chủ");

      // 1) Cập nhật state login trước (để request.js có token)
      onSignIn({
        id: data.user?.id || null,
        name: data.user?.full_name || data.user?.name || email.trim(),
        accessToken: token,
      });


    } catch (err) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }

  };

  return (
    <LinearGradient
      colors={[COLORS.primary600, COLORS.accent700, "#1E5BA8"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>💊</Text>
              <Text style={styles.logoText}>CareDose</Text>
              <Text style={styles.subtitle}>Quản lý uống thuốc thông minh</Text>
            </View>

            {/* Login Form Card */}
            <View style={styles.card}>
              <Text style={styles.h1}>Đăng nhập</Text>
              <Text style={styles.caption}>Nhập thông tin tài khoản của bạn</Text>

              {/* Input Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  placeholder="Địa chỉ Email"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Input Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  placeholder="Mật khẩu"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>
                  {loading ? "Đang xử lý..." : "Đăng nhập"}
                </Text>
              </TouchableOpacity>

              {/* Footer Link to SignUp */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                  <Text style={styles.linkText}>Đăng ký ngay</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  innerContainer: { flex: 1, justifyContent: "center", padding: 20 },

  logoContainer: { alignItems: "center", marginBottom: 40 },
  logoIcon: { fontSize: 80, marginBottom: 16 },
  logoText: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  card: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text900,
    marginBottom: 8,
  },
  caption: { fontSize: 14, color: COLORS.text600, marginBottom: 24 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.line300,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#F9FAFB", // Màu nền input sáng nhẹ
  },
  inputIcon: { fontSize: 20, marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text900,
  },

  errorContainer: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: { color: COLORS.danger, fontSize: 14, fontWeight: "500" },

  btn: {
    backgroundColor: COLORS.primary600,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: COLORS.primary600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: COLORS.line300, shadowOpacity: 0 },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 15,
    color: COLORS.text600,
  },
  linkText: {
    fontSize: 15,
    color: COLORS.accent700,
    fontWeight: "700",
    marginLeft: 4,
  },
});