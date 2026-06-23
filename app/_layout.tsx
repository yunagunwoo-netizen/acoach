// 앱 루트 레이아웃 — 로그인 상태에 따라 화면을 자동 분기
// - 비로그인 → /login
// - 로그인했지만 프로필 없음 → /profile-setup
// - 로그인 + 프로필 있음 → / (홈)

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';

function RootNavigator() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const first = segments[0];
    const inAuthScreens = first === 'login' || first === 'signup';
    const onProfileSetup = first === 'profile-setup';

    if (!user) {
      if (!inAuthScreens) router.replace('/login');
    } else if (!profile) {
      if (!onProfileSetup) router.replace('/profile-setup');
    } else {
      if (inAuthScreens || onProfileSetup) router.replace('/');
    }
  }, [user, profile, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="add-meal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-exercise" options={{ presentation: 'modal' }} />
      <Stack.Screen name="body" />
      <Stack.Screen name="stats" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
