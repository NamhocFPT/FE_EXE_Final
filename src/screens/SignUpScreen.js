import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { register } from '../services/authService'; // <--- Import hàm register
// --- CHÚ Ý PHẦN IMPORT GRADIENT ---

// 2. Nếu dùng Expo Go thì bỏ comment dòng dưới và xóa dòng trên:
import { LinearGradient } from 'expo-linear-gradient';

// --- CHÚ Ý PHẦN IMPORT ICON ---
// Nếu dùng Expo thì giữ nguyên. Nếu dùng CLI thì sửa thành: 
// import Ionicons from 'react-native-vector-icons/Ionicons';
import { Ionicons } from '@expo/vector-icons';

// Đã XÓA đoạn "interface SignUpScreenProps..." gây lỗi

export default function SignUpScreen({ onNavigate }) { 
  // Đã XÓA phần ": SignUpScreenProps" sau onNavigate
  
  // 1. Quản lý trạng thái (State)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // State cho checkbox và ẩn/hiện mật khẩu
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Hàm xử lý khi bấm nút Đăng ký
  const [loading, setLoading] = useState(false);
  const handleSignUp = async () => {
  // 1. Validate
  if (!fullName || !email || !password) {
    Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ Tên, Email và Mật khẩu.");
    return;
  }
  if (!termsAccepted) {
    Alert.alert("Chưa đồng ý", "Bạn vui lòng đồng ý với Điều khoản dịch vụ.");
    return;
  }

  setLoading(true);

  try {
    // 2. Gọi API đăng ký
    // Lưu ý: Thứ tự tham số phải khớp với hàm register trong authService.js
    const result = await register(fullName, email, password, phone);

    // 3. Thành công
    Alert.alert("Thành công", "Tài khoản đã được tạo!", [
      {
        text: "Đăng nhập ngay",
        onPress: () => onNavigate('profile') // Hoặc 'login' tùy luồng của bạn
      }
    ]);
  } catch (err) {
    // 4. Thất bại (Ví dụ: Email trùng)
    Alert.alert("Lỗi đăng ký", err.message || "Có lỗi xảy ra, vui lòng thử lại.");
  } finally {
    setLoading(false);
  }
};

  return (
    <LinearGradient
      colors={['#4EA3F1', '#1E5BA8']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate('login')} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Create Account</Text>
              </View>

              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="john.doe@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Phone Number <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Password */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Create a strong password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#64748B" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Checkbox */}
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton, 
                  !termsAccepted && styles.disabledButton
                ]}
                onPress={handleSignUp}
                disabled={!termsAccepted}
              >
                <Text style={styles.primaryButtonText}>Create Account</Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => onNavigate('login')}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: { marginRight: 16 },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 8,
  },
  optional: { color: '#64748B' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: { paddingRight: 44 },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 8,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4EA3F1',
    borderColor: '#4EA3F1',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  link: { color: '#4EA3F1' },
  primaryButton: {
    backgroundColor: '#4EA3F1',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInText: { fontSize: 14, color: '#64748B' },
  signInLink: {
    fontSize: 14,
    color: '#4EA3F1',
    fontWeight: '600',
  },
});