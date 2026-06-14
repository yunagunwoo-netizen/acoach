// 칼로리 관련 순수 계산 함수 (UI/외부 API와 분리 — utils/)
// 가이드 6-1단계 공식 기반. 미플린-세인트 지어 공식을 기본으로 사용.

import type { ActivityLevel, Gender, GoalMode } from '@/types';

// 생년월일("1985-03-15")로 만 나이 계산
export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// 기초대사량(BMR) — 미플린-세인트 지어 공식 (최신 권장)
export function calcBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

// 활동 계수
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// 일일 권장(목표) 칼로리 = BMR × 활동계수
export function calcTargetCalories(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  birthDate: string,
  activityLevel: ActivityLevel
): number {
  const age = calcAge(birthDate);
  const bmr = calcBMR(gender, weightKg, heightCm, age);
  return Math.round(bmr * ACTIVITY_FACTOR[activityLevel]);
}

// 운동 소모 칼로리 = MET × 체중 × 시간(hour)
export function calcCaloriesBurned(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

// ── 목표 방향(감량/유지/증량) 관련 ── 북극성: 칼로리 수지 + 근육량 조절
// 목표별 칼로리 조정 계수 (TDEE 대비). 중장년 안전 범위로 보수적으로 설정.
export const GOAL_CALORIE_FACTOR: Record<GoalMode, number> = {
  lose: 0.85, // -15%
  maintain: 1.0,
  gain: 1.1, // +10% (린 벌크)
};

// 목표별 단백질 목표 (체중 kg당 g) — 근육 조절의 핵심 레버
export const PROTEIN_PER_KG: Record<GoalMode, number> = {
  lose: 2.0, // 감량 중 근손실 방지
  maintain: 1.6,
  gain: 1.8, // 근합성 촉진
};

export const GOAL_LABELS: Record<GoalMode, string> = {
  lose: '감량',
  maintain: '유지',
  gain: '증량',
};

export const GOAL_DESC: Record<GoalMode, string> = {
  lose: '체지방 줄이기',
  maintain: '현상 유지',
  gain: '근육 늘리기',
};

export const GOAL_ORDER: GoalMode[] = ['lose', 'maintain', 'gain'];

// 목표 방향을 반영한 일일 목표 칼로리 (tdee = calcTargetCalories 결과)
export function calcGoalCalories(tdee: number, goal: GoalMode): number {
  return Math.round(tdee * GOAL_CALORIE_FACTOR[goal]);
}

// 일일 목표 단백질(g)
export function calcTargetProtein(weightKg: number, goal: GoalMode): number {
  return Math.round(weightKg * PROTEIN_PER_KG[goal]);
}

// 활동 수준 한글 라벨
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: '비활동적 (거의 앉아서 생활)',
  light: '가벼운 활동 (주 1~3회 운동)',
  moderate: '보통 활동 (주 3~5회 운동)',
  active: '활발한 활동 (주 6~7회 운동)',
  very_active: '매우 활발 (육체노동/하루 2회 운동)',
};
