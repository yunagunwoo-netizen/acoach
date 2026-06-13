// 사용자 프로필 Firestore 서비스 — users/{userId}

import { doc, getDoc, setDoc } from 'firebase/firestore';

import type { UserProfile } from '@/types';
import { db } from './firebase';

// 프로필 조회 (없으면 null)
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// 프로필 저장/수정
export async function saveProfile(userId: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', userId), profile, { merge: true });
}
