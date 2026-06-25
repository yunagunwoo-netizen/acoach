// 날짜/시간 관련 순수 헬퍼 (UI/외부 API와 분리 — utils/)

import type { ImageSourcePropType } from 'react-native';
import type { MealType } from '@/types';

// 오늘 날짜 키 "YYYY-MM-DD" (기기 로컬 시간 기준)
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 최근 n일(오늘 포함) 날짜 키 배열 (오래된→최신). 누락된 날을 0으로 채울 때 사용.
export function lastNDateKeys(n: number, base: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(todayKey(d));
  }
  return keys;
}

// 현재 시각 "HH:MM"
export function nowTime(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// 시간대로 끼니 자동 추정 (사용자가 화면에서 바꿀 수 있음)
export function guessMealType(d: Date = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 21) return 'dinner';
  return 'snack';
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// 끼니별 커스텀 3D 아이콘 (assets/icons, 투명 PNG)
export const MEAL_TYPE_ICONS: Record<MealType, ImageSourcePropType> = {
  breakfast: require('../assets/icons/breakfast.png'),
  lunch: require('../assets/icons/lunch.png'),
  dinner: require('../assets/icons/dinner.png'),
  snack: require('../assets/icons/snack.png'),
};

export const BLOOD_SUGAR_LABELS = {
  low: { label: '낮음', color: '#30A46C' },
  moderate: { label: '보통', color: '#F5A623' },
  high: { label: '높음', color: '#E5484D' },
} as const;
