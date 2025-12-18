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
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../constants/theme";

// --- SỬA: Import Service ---
import { login } from "../services/authService";

export default function LoginScreen({ onSignIn, navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = async () => {
    setError(null);
    if (!phone.trim() || !password) {
      setError("Số điện thoại và mật khẩu là bắt buộc");
      return;
    }
    setLoading(true);

    try {
      // --- SỬA: Gọi Service thay vì fetch thủ công ---
      const data = await login(phone.trim(), password);

      // Data trả về thường có dạng: { accessToken: "...", user: {...} }
      // Hoặc nếu BE của bạn trả token trực tiếp ở root object
      const token = data.accessToken || data.token;

      if (!token) {
        throw new Error("Không nhận được token truy cập");
      }

      onSignIn({
        id: null, // Nếu API login trả về user id thì điền vào đây
        name: phone.trim(),
        accessToken: token
      });

    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
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
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>💊</Text>
              <Text style={styles.logoText}>CareDose</Text>
              <Text style={styles.subtitle}>Quản lý uống thuốc thông minh</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.h1}>Đăng nhập</Text>
              <Text style={styles.caption}>Nhập thông tin của bạn</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  placeholder="Số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

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

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Text>
              </TouchableOpacity>
              {/* --- BỔ SUNG ĐOẠN NÀY --- */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                  <Text style={styles.linkText}>Đăng ký ngay</Text>
                </TouchableOpacity>
              </View>
              {/* ----------------------- */}
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
    borderWidth: 2,
    borderColor: COLORS.line300,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  inputIcon: { fontSize: 20, marginRight: 8 },
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
  },
  btnDisabled: { backgroundColor: COLORS.line300, shadowOpacity: 0 },
  btnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
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
  },
});