// 체성분 기록 Firestore 서비스 — users/{userId}/bodyComposition/{date}
// 문서 ID = 날짜("YYYY-MM-DD") → 같은 날 재입력하면 덮어씀(하루 1건)

import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

import type { BodyComposition } from '@/types';
import { db } from './firebase';

function bodyCol(userId: string) {
  return collection(db, 'users', userId, 'bodyComposition');
}

// 체성분 저장/수정 (date를 문서 ID로 사용 → 같은 날은 덮어씀)
export async function saveBodyComposition(
  userId: string,
  record: BodyComposition
): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'bodyComposition', record.date), record, { merge: true });
}

// 특정 날짜 기록 조회 (없으면 null)
export async function getBodyComposition(
  userId: string,
  date: string
): Promise<BodyComposition | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'bodyComposition', date));
  return snap.exists() ? (snap.data() as BodyComposition) : null;
}

// 전체 기록을 날짜 오름차순으로 반환 (추이 차트용)
// 문서 ID가 날짜라 그대로 정렬하면 시간순. 개인용 소량 데이터라 전체 조회.
export async function getBodyCompositions(userId: string): Promise<BodyComposition[]> {
  const snap = await getDocs(bodyCol(userId));
  const list = snap.docs.map((d) => d.data() as BodyComposition);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
