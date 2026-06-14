// 식약처 식품영양성분 DB 서비스 (data.go.kr 15127578, 통합 DB)
// 음식명으로 검색 → 100g당 공식 영양성분. Gemini 추정값 보정에 사용.
// ⚠️ 외부 API 호출은 services/에만.

import type { FoodItem } from '@/types';

// https 필수 (모바일 http 차단). 통합DB 엔드포인트(getFoodNtrCpntDbInq02).
const ENDPOINT =
  'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02';

// 통합DB AMT_NUM 칼럼 매핑 (SERVING_SIZE=100g 기준)
//  1=에너지(kcal) 3=단백질 4=지방 6=탄수화물 7=당류
export interface FoodDbItem {
  foodCd: string;
  name: string; // FOOD_NM_KR
  group: string; // DB_GRP_NM (음식 / 가공식품 / 농축수산물 ...)
  per100: { calories: number; carbs: number; protein: number; fat: number; sugar: number };
}

function num(v: any): number {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/,/g, ''));
  return isFinite(n) && n >= 0 ? n : 0;
}

// 음식명으로 검색 (부분일치). '음식' 분류를 위로 정렬해서 반환.
export async function searchFoodDb(name: string): Promise<FoodDbItem[]> {
  const apiKey = process.env.EXPO_PUBLIC_FOOD_API_KEY;
  if (!apiKey) throw new Error('식약처 API 키가 설정되지 않았습니다. (.env 확인)');
  const q = name.trim();
  if (!q) return [];

  const url =
    `${ENDPOINT}?serviceKey=${encodeURIComponent(apiKey)}` +
    `&pageNo=1&numOfRows=20&type=json&FOOD_NM_KR=${encodeURIComponent(q)}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('네트워크 오류로 식약처 검색에 실패했습니다.');
  }
  if (!res.ok) throw new Error(`식약처 서버 오류 (${res.status})`);

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('식약처 응답을 해석하지 못했습니다.');
  }

  const msg = data?.header?.resultMsg;
  if (msg && !/NORMAL/i.test(msg)) throw new Error(`식약처: ${msg}`);

  const items: any[] = data?.body?.items ?? [];
  const mapped: FoodDbItem[] = items.map((it) => ({
    foodCd: String(it.FOOD_CD ?? ''),
    name: String(it.FOOD_NM_KR ?? '이름 없음'),
    group: String(it.DB_GRP_NM ?? ''),
    per100: {
      calories: num(it.AMT_NUM1),
      protein: num(it.AMT_NUM3),
      fat: num(it.AMT_NUM4),
      carbs: num(it.AMT_NUM6),
      sugar: num(it.AMT_NUM7),
    },
  }));

  // '음식' 분류를 먼저, 그 안에서 칼로리 정보 있는 것 우선
  return mapped.sort((a, b) => {
    const ag = a.group === '음식' ? 0 : 1;
    const bg = b.group === '음식' ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return (b.per100.calories > 0 ? 1 : 0) - (a.per100.calories > 0 ? 1 : 0);
  });
}

// 선택한 DB 항목을 특정 그램수로 환산 → FoodItem
export function scaleToFoodItem(item: FoodDbItem, grams: number): FoodItem {
  const f = grams / 100;
  const r = (x: number) => Math.round(x * f);
  return {
    name: item.name,
    calories: r(item.per100.calories),
    carbs: r(item.per100.carbs),
    protein: r(item.per100.protein),
    fat: r(item.per100.fat),
    sugar: r(item.per100.sugar),
  };
}
