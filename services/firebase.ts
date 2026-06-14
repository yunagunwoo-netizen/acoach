// Firebase 초기화 (웹 JS SDK)
// 네이티브(Expo Go/APK)와 웹(PWA) 모두 지원 — 로그인 지속성/Firestore 연결을 플랫폼별로 분기
// 설정값은 .env에서 읽어옴 (EXPO_PUBLIC_ 접두사)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// 앱 중복 초기화 방지 (Fast Refresh 대응)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let _auth;
if (Platform.OS === 'web') {
  // 웹(PWA): 브라우저 저장소(IndexedDB/localStorage)로 로그인 유지
  try {
    _auth = initializeAuth(app, { persistence: browserLocalPersistence });
  } catch {
    _auth = getAuth(app); // 이미 초기화된 경우
  }
} else {
  // 네이티브: AsyncStorage로 로그인 유지
  // Firebase 버전에 따라 함수 이름이 달라서(getReactNativePersistence ↔ reactNativeLocalPersistence)
  // 둘 다 시도하고, 둘 다 없으면 기본(메모리) 방식으로 폴백.
  const fa = firebaseAuth as any;
  const rnPersistence =
    (typeof fa.getReactNativePersistence === 'function'
      ? fa.getReactNativePersistence(AsyncStorage)
      : undefined) ?? fa.reactNativeLocalPersistence;
  try {
    _auth = rnPersistence
      ? initializeAuth(app, { persistence: rnPersistence })
      : initializeAuth(app);
  } catch {
    _auth = getAuth(app);
  }
}
export const auth = _auth;

// Firestore — 네이티브는 연결 안정성을 위해 long polling 강제, 웹은 기본(웹소켓)
export const db =
  Platform.OS === 'web'
    ? getFirestore(app)
    : initializeFirestore(app, { experimentalForceLongPolling: true });

export default app;
