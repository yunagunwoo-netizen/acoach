// 식사 기록 Firestore 서비스 — users/{userId}/meals/{mealId}
// ⚠️ MVP: 사진 원본은 저장하지 않음(분석 결과만). Storage 미사용.

import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

import type { Meal } from '@/types';
import { db } from './firebase';

function mealsCol(userId: string) {
  return collection(db, 'users', userId, 'meals');
}

// 식사 기록 저장 → 생성된 문서 id 반환
export async function saveMeal(userId: string, meal: Omit<Meal, 'id'>): Promise<string> {
  const ref = await addDoc(mealsCol(userId), meal);
  return ref.id;
}

// 특정 날짜("YYYY-MM-DD")의 식사 목록 (시간순)
// 정렬은 코드에서 처리 → Firestore 복합 인덱스 불필요
export async function getMealsByDate(userId: string, date: string): Promise<Meal[]> {
  const q = query(mealsCol(userId), where('date', '==', date));
  const snap = await getDocs(q);
  const meals = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Meal, 'id'>) }));
  return meals.sort((a, b) => a.createdAt - b.createdAt);
}

// 특정 날짜 이후(>= startDate)의 모든 식사 — 주간/월간 집계용 (단일 범위필터=인덱스 불필요)
export async function getMealsSince(userId: string, startDate: string): Promise<Meal[]> {
  const q = query(mealsCol(userId), where('date', '>=', startDate));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Meal, 'id'>) }));
}

// 식사 기록 삭제
export async function deleteMeal(userId: string, mealId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'meals', mealId));
}

// 합계 계산 헬퍼 (순수 계산이지만 Meal 의존이라 여기 둠)
export function sumCalories(meals: Meal[]): number {
  return meals.reduce((acc, m) => acc + (m.totalCalories || 0), 0);
}

export function sumSugar(meals: Meal[]): number {
  return meals.reduce((acc, m) => acc + (m.totalSugar || 0), 0);
}

// 하루 섭취 단백질 합계(g) — 근육 조절 핵심 지표. Meal.foods의 protein 합산.
export function sumProtein(meals: Meal[]): number {
  return meals.reduce(
    (acc, m) => acc + (m.foods?.reduce((s, f) => s + (f.protein || 0), 0) || 0),
    0
  );
}
