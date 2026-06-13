// 에이코치 앱 전역 타입 정의
// 4단계 DB 구조(가이드 문서)를 그대로 TypeScript 타입으로 옮긴 것

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary' // 비활동적
  | 'light' // 가벼운 활동
  | 'moderate' // 보통 활동
  | 'active' // 활발한 활동
  | 'very_active'; // 매우 활발

// 사용자 프로필 (Firestore: users/{userId})
export interface UserProfile {
  name: string;
  birthDate: string; // "1985-03-15"
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  targetCalories: number; // 일일 목표 칼로리 (자동 계산)
  targetBloodSugar?: { fasting: number; postMeal: number };
  createdAt: number; // timestamp (ms)
  role?: 'user' | 'premium' | 'admin'; // 🔮 서비스 전환 대비
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type BloodSugarImpact = 'low' | 'moderate' | 'high';

// 음식 한 항목
export interface FoodItem {
  name: string;
  calories: number;
  sugar: number;
  carbs: number;
  protein: number;
  fat: number;
}

// 식사 기록 (Firestore: users/{userId}/meals/{mealId})
export interface Meal {
  id?: string;
  date: string; // "2026-06-13"
  mealType: MealType;
  time: string; // "12:30"
  photoUrl?: string; // Day 2 MVP에서는 미저장
  foods: FoodItem[];
  totalCalories: number;
  totalSugar: number;
  estimatedBloodSugarImpact: BloodSugarImpact;
  aiAnalysis: string;
  createdAt: number;
}

// 건강검진 기록 (Firestore: users/{userId}/healthCheckups/{year})
export interface HealthCheckup {
  year: number;
  date: string;
  bloodSugar: { fasting: number; hba1c: number };
  bloodPressure: { systolic: number; diastolic: number };
  cholesterol: { total: number; hdl: number; ldl: number; triglyceride: number };
  weight: number;
  bmi: number;
  waistCircumference: number;
  doctorNotes: string;
}

// 일일 요약 (Firestore: users/{userId}/dailySummary/{date})
export interface DailySummary {
  date: string;
  totalCaloriesConsumed: number;
  totalCaloriesBurned: number;
  netCalories: number;
  targetCalories: number;
  totalSugar: number;
  mealsCount: number;
}
