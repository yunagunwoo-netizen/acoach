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
  const router =