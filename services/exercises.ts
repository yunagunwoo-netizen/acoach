// 운동 기록 Firestore 서비스 — users/{userId}/exercises/{exerciseId}

import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

import type { Exercise } from '@/types';
import { db } from './firebase';

function exercisesCol(userId: string) {
  return collection(db, 'users', userId, 'exercises');
}

// 운동 기록 저장 → 생성된 문서 id 반환
export async function saveExercise(
  userId: string,
  exercise: Omit<Exercise, 'id'>
): Promise<string> {
  const ref = await addDoc(exercisesCol(userId), exercise);
  return ref.id;
}

// 특정 날짜("YYYY-MM-DD")의 운동 목록 (시간순)
// 정렬은 코드에서 처리 → Firestore 복합 인덱스 불필요 (meals와 동일 패턴)
export async function getExercisesByDate(userId: string, date: string): Promise<Exercise[]> {
  const q = query(exercisesCol(userId), where('date', '==', date));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }));
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

// 특정 날짜 이후(>= startDate)의 모든 운동 — 주간/월간 집계용 (단일 범위필터=인덱스 불필요)
export async function getExercisesSince(userId: string, startDate: string): Promise<Exercise[]> {
  const q = query(exercisesCol(userId), where('date', '>=', startDate));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }));
}

// 운동 기록 삭제
export async function deleteExercise(userId: string, exerciseId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'exercises', exerciseId));
}

// 하루 소모 칼로리 합계(kcal) — 칼로리 수지 계산용
export function sumCaloriesBurned(exercises: Exercise[]): number {
  return exercises.reduce((acc, e) => acc + (e.caloriesBurned || 0), 0);
}
