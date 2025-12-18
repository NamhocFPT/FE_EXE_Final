import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";

// Import Service
import { updateMyAccount } from "../services/authService";

export default function EditAccountScreen({ navigation, route }) {
  // Lấy dữ liệu user truyền từ màn hình trước (nếu có)
  const user = route.params?.user || {};

  const [fullName, setFullName] = useState(user.full_name || "");
  const [phone, setPhone] = useState(user.phone_number || "");
  // Email không cho sửa nên chỉ hiển thị
  const email = user.email || "";
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Họ và tên không được để trống");
      return;
    }

    setLoading(true);
    try {
      // Gọi API Update (UC-A4)
      await updateMyAccount({
        full_name: fullName.trim(),
        phone_number: phone.trim()
      });

      Alert.alert("Thành công", "Cập nhật hồ sơ thành công!", [
        {
          text: "OK",
          onPress: () => navigation.goBack() // Quay lại để màn hình trước tự reload data
        }
      ]);
    } catch (error) {
      Alert.alert("Lỗi", error.message || "Không thể cập nhật hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* --- CUSTOM HEADER (Đồng bộ style) --- */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.headerLeft} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.primary600} />
          <Text style={styles.headerBackText}>Quay lại</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
           <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
        </View>

        <View style={styles.headerRight} /> 
      </View>

      {/* --- FORM BODY --- */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ và tên</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email Input (Disabled) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={email}
                  editable={false}
                />
                <Text style={styles.helperText}>Email không thể chỉnh sửa</Text>
              </View>

            </View>
          </ScrollView>

          {/* --- FOOTER ACTION --- */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.btnPrimary, loading && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // HEADER
  headerContainer: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    fontSize: 16,
    color: COLORS.primary600,
    fontWeight: '500',
    marginLeft: -4,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text900,
  },
  headerRight: { flex: 1 },

  // CONTENT
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 20,
  },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text900,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text900,
    backgroundColor: 'white',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6', // gray-100
    color: '#9CA3AF', // gray-400
    borderColor: '#E5E7EB', // gray-200
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280', // gray-500
  },

  // FOOTER
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary600,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: "600",
  },
});