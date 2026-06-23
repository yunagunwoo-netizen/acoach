// "오늘의 코칭 카드" 제안 로직 (순수 함수 — UI/외부 API와 분리, utils/)
// 남은 칼로리·단백질·운동·목표 방향·시간대를 보고 코치처럼 한두 줄 제안을 만든다.
// 북극성: 칼로리 수지(목표−섭취+운동) + 근육량 조절(단백질).

import type { GoalMode, MealType } from '@/types';
import { guessMealType, MEAL_TYPE_LABELS } from '@/utils/date';

// 카드에 보여줄 제안 한 줄
export interface CoachTip {
  icon: string; // 앞에 붙일 이모지
  text: string; // 코치 멘트(한 줄)
}

// 제안을 만들기 위한 입력 (홈 화면에서 계산해 넘김)
export interface CoachInput {
  goal: GoalMode;
  remaining: number; // 남은 칼로리 = 목표 − 섭취 + 운동소모
  consumed: number; // 오늘 섭취 칼로리
  burned: number; // 오늘 운동 소모 칼로리
  targetCalories: number; // 일일 목표 칼로리
  consumedProtein: number; // 오늘 섭취 단백질(g)
  targetProtein: number; // 일일 목표 단백질(g)
  weightKg: number; // 체중(걷기 시간 추정용)
  eatenMealTypes: MealType[]; // 오늘 이미 기록한 끼니 종류
  now?: Date; // 기준 시각(테스트용, 기본 현재)
}

// 초과 칼로리를 "빠르게 걷기"로 태우는 데 걸리는 대략 분 (MET 3.5 기준, 10분 단위 반올림)
function walkMinutesFor(kcal: number, weightKg: number): number {
  const perMin = (3.5 * weightKg) / 60; // 분당 소모 kcal
  const min = Math.round(kcal / perMin / 10) * 10;
  return Math.max(10, Math.min(60, min)); // 10~60분 범위로 제한
}

// 남은 단백질 양에 맞춘 음식 추천 문구
function proteinFoodFor(gap: number): string {
  if (gap >= 40) return '닭가슴살 한 덩이(약 30g)에 계란 2개';
  if (gap >= 25) return '닭가슴살 한 덩이(약 30g)';
  if (gap >= 15) return '두부 반 모나 그릭요거트 하나';
  return '계란 2~3개나 우유 한 잔';
}

// 지금 시간대 기준으로 "다음 끼니" 라벨을 고른다.
// 그 끼니를 이미 먹었으면 '간식'으로 안내.
function nextMealLabel(eaten: MealType[], now: Date): string {
  const current = guessMealType(now); // breakfast/lunch/dinner/snack
  if (current !== 'snack' && !eaten.includes(current)) {
    return MEAL_TYPE_LABELS[current];
  }
  return '다음 끼니';
}

// 메인: 입력을 받아 제안 목록을 우선순위 순으로 반환 (홈에서 위 1~2개만 표시)
export function getCoachTips(input: CoachInput): CoachTip[] {
  const {
    goal,
    remaining,
    consumed,
    targetCalories,
    targetProtein,
    consumedProtein,
    weightKg,
    eatenMealTypes,
    now = new Date(),
  } = input;

  const tips: CoachTip[] = [];
  const proteinGap = targetProtein - consumedProtein;
  const nextMeal = nextMealLabel(eatenMealTypes, now);

  // 0) 아직 아무것도 안 먹은 아침 — 하루를 여는 한마디
  if (consumed === 0 && now.getHours() < 11) {
    tips.push({
      icon: '🌅',
      text: `좋은 아침이에요! 오늘 목표는 ${targetCalories.toLocaleString()}kcal · 단백질 ${targetProtein}g — ${nextMeal}부터 단백질 챙겨 시작해요.`,
    });
    return tips;
  }

  // 1) 단백질 — 근육 조절의 핵심 레버라 먼저 제안
  if (proteinGap > 8) {
    tips.push({
      icon: '💪',
      text: `단백질 ${proteinGap}g 남았어요 — ${proteinFoodFor(proteinGap)} 어때요?`,
    });
  } else {
    tips.push({ icon: '✅', text: '단백질 목표 달성! 근육 합성에 충분해요.' });
  }

  // 2) 칼로리 수지 — 목표 방향(감량/유지/증량)에 맞춰 멘트를 바꾼다
  if (remaining < 0) {
    // 목표를 넘김
    const over = Math.abs(remaining);
    if (goal === 'gain') {
      tips.push({
        icon: '🍚',
        text: `목표보다 +${over.toLocaleString()}kcal — 증량 중엔 나쁘지 않아요. 단백질만 챙기면 OK!`,
      });
    } else {
      tips.push({
        icon: '🚶',
        text: `오늘 ${over.toLocaleString()}kcal 초과 — ${walkMinutesFor(over, weightKg)}분 가볍게 걷기로 상쇄해 볼까요?`,
      });
    }
  } else {
    // 아직 여유 있음
    if (goal === 'gain' && remaining > 150) {
      tips.push({
        icon: '🍗',
        text: `근육 늘리려면 ${remaining.toLocaleString()}kcal 더 — ${nextMeal} 든든하게 채워요.`,
      });
    } else if (goal === 'lose') {
      tips.push({
        icon: '🥗',
        text: `아직 ${remaining.toLocaleString()}kcal 여유 — ${nextMeal}은 단백질 위주로 가볍게.`,
      });
    } else {
      tips.push({
        icon: '🍽️',
        text: `${remaining.toLocaleString()}kcal 남았어요 — ${nextMeal} 적당히 즐기세요.`,
      });
    }
  }

  return tips;
}
