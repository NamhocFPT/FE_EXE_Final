import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import { register } from '../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Modal: mở tài liệu
  const [docOpen, setDocOpen] = useState(null); // 'tos' | 'privacy' | null

  const doc = useMemo(() => {
    if (docOpen === 'tos') {
      return { title: 'Điều khoản dịch vụ', content: TERMS_OF_SERVICE_VI };
    }
    if (docOpen === 'privacy') {
      return { title: 'Chính sách quyền riêng tư', content: PRIVACY_POLICY_VI };
    }
    return null;
  }, [docOpen]);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ Tên, Email và Mật khẩu.");
      return;
    }
    if (!termsAccepted) {
      Alert.alert("Chưa đồng ý", "Bạn vui lòng đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư.");
      return;
    }

    setLoading(true);

    try {
      await register(fullName, email, password, phone);

      Alert.alert("Thành công", "Tài khoản đã được tạo!", [
        { text: "Đăng nhập ngay", onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert("Lỗi đăng ký", err.message || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#4EA3F1', '#1E5BA8']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Tạo tài khoản</Text>
              </View>

              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Họ và tên</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nguyễn Văn A"
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
                  placeholder="email@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Phone */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Số điện thoại <Text style={styles.optional}>(Tuỳ chọn)</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="09xxxxxxxx"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Password */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Tạo mật khẩu mạnh"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Checkbox + links */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.85}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>

                <Text style={styles.checkboxLabel}>
                  Tôi đồng ý với{" "}
                  <Text
                    style={styles.link}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      setDocOpen('tos');
                    }}
                  >
                    Điều khoản dịch vụ
                  </Text>{" "}
                  và{" "}
                  <Text
                    style={styles.link}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      setDocOpen('privacy');
                    }}
                  >
                    Chính sách quyền riêng tư
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              {/* Button */}
              <TouchableOpacity
                style={[styles.primaryButton, (!termsAccepted || loading) && styles.disabledButton]}
                onPress={handleSignUp}
                disabled={!termsAccepted || loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Tạo tài khoản</Text>}
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.signInLink}>Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ✅ Modal đọc điều khoản */}
      <Modal
        visible={!!docOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDocOpen(null)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{doc?.title}</Text>
              <TouchableOpacity onPress={() => setDocOpen(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator>
              <Text style={styles.docText}>{doc?.content}</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.primaryBtnModal} onPress={() => setDocOpen(null)}>
                <Text style={styles.primaryBtnModalText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ====== Nội dung điều khoản / privacy ====== */
const TERMS_OF_SERVICE_VI = `
ĐIỀU KHOẢN DỊCH VỤ CAREDOSE
Cập nhật lần cuối: 19/01/2026

1. Giới thiệu
CareDose (“Ứng dụng”) là ứng dụng hỗ trợ quản lý hồ sơ thuốc, nhắc nhở lịch uống thuốc và các thông tin liên quan. Khi tạo tài khoản hoặc sử dụng Ứng dụng, bạn đồng ý với Điều khoản này.

2. Tuyên bố y tế quan trọng (BẮT BUỘC ĐỌC)
- CareDose KHÔNG phải là cơ sở y tế và KHÔNG cung cấp chẩn đoán, điều trị, tư vấn y khoa hoặc kê đơn.
- Mọi gợi ý/nhắc nhở/nội dung trong Ứng dụng chỉ mang tính THAM KHẢO và hỗ trợ ghi nhớ.
- Bạn KHÔNG được tự ý thay đổi liều dùng, ngừng thuốc, đổi thuốc, thay đổi phác đồ điều trị, hoặc thay đổi chỉ định bác sĩ dựa trên thông tin của Ứng dụng.
- Mọi quyết định liên quan đến sức khỏe phải dựa trên chỉ định của bác sĩ/dược sĩ. Khi có dấu hiệu bất thường, hãy liên hệ cơ sở y tế ngay.

3. Tài khoản & tính chính xác dữ liệu
- Bạn cam kết cung cấp thông tin đăng ký đúng và cập nhật khi cần.
- Bạn chịu trách nhiệm về tính đúng/sai của dữ liệu thuốc, liều lượng, thời gian nhắc, hồ sơ người thân… mà bạn nhập.
- CareDose không chịu trách nhiệm nếu nhắc nhở sai do dữ liệu bạn nhập sai, thiết bị sai giờ, tắt thông báo, mất kết nối mạng, hệ điều hành chặn thông báo, hoặc lỗi từ bên thứ ba.

4. Nhắc nhở & giới hạn vận hành
- CareDose cố gắng gửi nhắc nhở đúng lịch, nhưng không đảm bảo 100% do phụ thuộc thiết bị, hệ điều hành, mạng, cấu hình tiết kiệm pin, quyền thông báo…
- Bạn cần tự kiểm tra cài đặt: quyền thông báo, âm thanh, chế độ tiết kiệm pin, múi giờ, và cập nhật ứng dụng.

5. Hành vi bị cấm
Bạn không được:
- sử dụng Ứng dụng cho mục đích trái pháp luật;
- can thiệp, phá hoại, khai thác lỗ hổng, đảo ngược mã (reverse engineer);
- phát tán mã độc, spam, hoặc nội dung gây hại.

6. Quyền sở hữu trí tuệ
Giao diện, thương hiệu, mã nguồn và nội dung thuộc quyền sở hữu của CareDose (hoặc bên cấp phép). Bạn không được sao chép/biến đổi/phân phối khi chưa được cho phép.

7. Miễn trừ trách nhiệm & giới hạn trách nhiệm (RẤT QUAN TRỌNG)
- CareDose không chịu trách nhiệm pháp lý trong mọi trường hợp phát sinh từ việc bạn sử dụng Ứng dụng, bao gồm nhưng không giới hạn: bỏ lỡ liều thuốc, dùng sai liều, tác dụng phụ, biến chứng sức khỏe, thiệt hại trực tiếp/gián tiếp, mất dữ liệu, hoặc tổn thất khác.
- Trong mọi trường hợp, nếu pháp luật không cho phép miễn trừ hoàn toàn, trách nhiệm của CareDose (nếu có) sẽ được giới hạn ở mức tối đa theo luật hiện hành và/hoặc (nếu có thanh toán) không vượt quá số tiền bạn đã trả trong 3 tháng gần nhất.

8. Chấm dứt sử dụng
- Bạn có thể ngừng sử dụng bất kỳ lúc nào.
- CareDose có quyền tạm khóa/chấm dứt tài khoản nếu phát hiện vi phạm Điều khoản hoặc rủi ro an toàn/hệ thống.

9. Thay đổi Điều khoản
CareDose có thể cập nhật Điều khoản. Việc bạn tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn chấp nhận nội dung mới.

10. Liên hệ hỗ trợ
Email: support@caredose.vn
`.trim();

const PRIVACY_POLICY_VI = `
CHÍNH SÁCH QUYỀN RIÊNG TƯ CAREDOSE
Cập nhật lần cuối: 19/01/2026

1. Tổng quan
Chính sách này giải thích cách CareDose thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu của bạn khi bạn dùng Ứng dụng.

2. Dữ liệu có thể được thu thập
a) Dữ liệu bạn cung cấp:
- Họ tên, email, số điện thoại (nếu có)
- Hồ sơ thuốc: tên thuốc, liều dùng, lịch nhắc, ghi chú
- Hồ sơ người thân (nếu bạn tạo)

b) Dữ liệu thu thập tự động:
- Thông tin thiết bị (hệ điều hành, phiên bản app)
- Dữ liệu chẩn đoán lỗi (crash logs), nhật ký sự kiện cơ bản để cải thiện chất lượng
- Dữ liệu thông báo (trạng thái cho phép thông báo)

3. Mục đích sử dụng dữ liệu
CareDose dùng dữ liệu để:
- tạo và quản lý tài khoản;
- cung cấp chức năng quản lý thuốc & nhắc lịch;
- hỗ trợ khách hàng;
- cải thiện hiệu năng, sửa lỗi, tăng bảo mật;
- tuân thủ yêu cầu pháp luật (nếu có).

4. Chia sẻ dữ liệu
CareDose KHÔNG bán dữ liệu cá nhân.
CareDose có thể chia sẻ dữ liệu trong phạm vi cần thiết:
- với nhà cung cấp dịch vụ hạ tầng (lưu trữ, phân tích lỗi, gửi thông báo) để vận hành Ứng dụng;
- khi có yêu cầu của cơ quan nhà nước theo quy định pháp luật;
- để bảo vệ quyền lợi, an toàn và an ninh hệ thống.

5. Lưu trữ & thời hạn lưu trữ
- Dữ liệu được lưu trữ trong thời gian cần thiết để cung cấp dịch vụ hoặc theo yêu cầu pháp luật.
- Bạn có thể yêu cầu xóa dữ liệu/tài khoản (nếu hệ thống hỗ trợ) bằng cách liên hệ CareDose.

6. Bảo mật
CareDose áp dụng các biện pháp hợp lý để bảo vệ dữ liệu. Tuy nhiên, không có hệ thống nào an toàn tuyệt đối. Bạn cần bảo mật mật khẩu và thiết bị của mình.

7. Quyền của bạn
Bạn có thể:
- yêu cầu truy cập/cập nhật/xóa dữ liệu (trong phạm vi luật cho phép);
- rút lại sự đồng ý (một số tính năng có thể không hoạt động).

8. Trẻ em
Ứng dụng không hướng đến người dùng dưới độ tuổi theo quy định pháp luật nếu không có sự đồng ý của người giám hộ.

9. Thay đổi chính sách
CareDose có thể cập nhật Chính sách này. Việc bạn tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn chấp nhận nội dung mới.

10. Liên hệ
Email: privacy@caredose.vn
`.trim();


/* ====== Styles ====== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: { width: '100%', maxWidth: 448, alignSelf: 'center' },
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backButton: { marginRight: 16 },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#0F172A', marginBottom: 8 },
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

  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 44 },
  eyeIcon: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center' },

  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, marginBottom: 24 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: '#CBD5E1',
    marginRight: 8, marginTop: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#4EA3F1', borderColor: '#4EA3F1' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#64748B', lineHeight: 20 },
  link: { color: '#4EA3F1', textDecorationLine: 'underline', fontWeight: '600' },

  primaryButton: { backgroundColor: '#4EA3F1', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  disabledButton: { backgroundColor: '#94A3B8', opacity: 0.7 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  signInContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signInText: { fontSize: 14, color: '#64748B' },
  signInLink: { fontSize: 14, color: '#4EA3F1', fontWeight: '600' },

  // ✅ Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, paddingRight: 10 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalBody: { paddingHorizontal: 16, paddingVertical: 14 },
  docText: { fontSize: 14, lineHeight: 20, color: '#0F172A' },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#EFEFEF' },
  primaryBtnModal: {
    height: 44, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#0F172A',
  },
  primaryBtnModalText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
