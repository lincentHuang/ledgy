import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Mail, Lock, User, ShieldCheck } from 'lucide-react-native';

export default function MobileLoginScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('提示', '請輸入電子郵件與密碼');
      return;
    }
    Alert.alert('登入成功', `歡迎回來，${email.split('@')[0]}！`);
  };

  const handleRegister = () => {
    if (!email || !password || !displayName) {
      Alert.alert('提示', '請填寫完整註冊資訊');
      return;
    }
    Alert.alert('註冊成功', `已建立帳號：${displayName}，開始記帳吧！`);
  };

  const handleSSO = (provider: string) => {
    Alert.alert(`${provider} SSO`, `已透過 ${provider} 快速連線驗證！`);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Brand */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>記</Text>
        </View>
        <Text style={styles.title}>AI 智慧記帳</Text>
        <Text style={styles.subtitle}>台灣電子發票 • 家庭共享 • 多模態 AI</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          onPress={() => setTab('login')}
          style={[styles.tabBtn, tab === 'login' && styles.activeTabBtn]}
        >
          <Text style={[styles.tabBtnText, tab === 'login' && styles.activeTabBtnText]}>
            登入帳號
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('register')}
          style={[styles.tabBtn, tab === 'register' && styles.activeTabBtn]}
        >
          <Text style={[styles.tabBtnText, tab === 'register' && styles.activeTabBtnText]}>
            快速註冊
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        {tab === 'register' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>暱稱 / 姓名</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：王小明"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>電子郵件 (Email)</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>密碼</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={tab === 'login' ? handleLogin : handleRegister}
        >
          <Text style={styles.submitBtnText}>
            {tab === 'login' ? '登入帳號' : '立即註冊'}
          </Text>
        </TouchableOpacity>

        {/* SSO */}
        <Text style={styles.ssoDivider}>或使用第三方帳號一鍵登入</Text>
        <View style={styles.ssoRow}>
          <TouchableOpacity style={styles.ssoBtn} onPress={() => handleSSO('Google')}>
            <Text style={styles.ssoBtnText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ssoBtn} onPress={() => handleSSO('Apple')}>
            <Text style={styles.ssoBtnText}>Apple</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ssoBtn} onPress={() => handleSSO('LINE')}>
            <Text style={styles.ssoBtnText}>LINE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { alignItems: 'center', marginVertical: 24 },
  logo: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoText: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  tabHeader: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 14, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTabBtn: { backgroundColor: '#ffffff' },
  tabBtnText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  activeTabBtnText: { color: '#10b981', fontWeight: 'bold' },
  formCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, elevation: 2 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  submitBtn: { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  ssoDivider: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginVertical: 16 },
  ssoRow: { flexDirection: 'row', gap: 8 },
  ssoBtn: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  ssoBtnText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
});
