// 인증 관련 서비스 — Firebase Auth 래퍼

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';

import { auth } from './firebase';

export async function signUp(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  await fbSignOut(auth);
}

// Firebase 에러 코드를 한국어 메시지로 변환
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일입니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/too-many-requests':
      return '잠시 후 다시 시도해 주세요.';
    default:
      return '오류가 발생했습니다. 다시 시도해 주세요.';
  }
}
