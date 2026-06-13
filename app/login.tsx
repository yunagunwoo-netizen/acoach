// 로그인 화면

import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authErrorMessage, signIn } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // 로그인 성공 시 _layout이 자동으로 홈/프로필로 보냄
    } catch (e: any) {
      setError(authErrorMessage(e?.code ?? ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <Text style={styles.logo}>에이코치</Text>
        <Text style={styles.subtitle}>건강 코칭을 시작해요</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#9AA0A6"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (6자 이상)"
          placeholderTextColor="#9AA0A6"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>로그인</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>계정이 없으신가요? </Text>
          <Link href="/signup" style={styles.link}>
            회원가입
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 36, fontWeight: '800', color: '#208AEF', textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: '#60646C',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E1E6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    color: '#000',
  },
  error: { color: '#E5484D', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#60646C', fontSize: 14 },
  link: { color: '#208AEF', fontSize: 14, fontWeight: '700' },
});
