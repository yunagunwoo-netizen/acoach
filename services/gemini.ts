// 음식 사진 분석 서비스 — Gemini 2.5 Flash (비전)
// 이미지(base64) → 음식명·칼로리·탄단지·당류·혈당영향 구조화 결과
// ⚠️ 키 노출 방지: Gemini를 직접 부르지 않고 프록시(Cloudflare Worker) 경유.
//    키는 프록시 서버에만 있고, 앱 번들에는 프록시 주소만 들어감.

import type { BloodSugarImpact, FoodItem } from '@/types';

// 프록시 주소 (공개돼도 무방). 키는 프록시 서버 쪽 시크릿에만 존재.
const PROXY_URL = process.env.EXPO_PUBLIC_GEMINI_PROXY_URL;

// 분석 결과(저장 전, 사용자가 수정 가능한 형태)
export interface FoodAnalysisResult {
  foods: FoodItem[];
  estimatedBloodSugarImpact: BloodSugarImpact;
  aiAnalysis: string; // 한두 문장 코칭 코멘트
}

// Gemini 구조화 출력 스키마 — 항상 이 형태의 JSON으로 답하도록 강제
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    foods: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          calories: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          sugar: { type: 'NUMBER' },
        },
        required: ['name', 'calories', 'carbs', 'protein', 'fat', 'sugar'],
      },
    },
    estimatedBloodSugarImpact: { type: 'STRING', enum: ['low', 'moderate', 'high'] },
    aiAnalysis: { type: 'STRING' },
  },
  required: ['foods', 'estimatedBloodSugarImpact', 'aiAnalysis'],
} as const;

const PROMPT = `당신은 한국 음식에 정통한 영양 분석 전문가입니다.
사진 속 음식을 분석해 주세요.

규칙:
- 사진에 보이는 음식 각각을 foods 배열에 넣으세요. 한국 음식명은 한국어로 적으세요(예: "김치찌개", "공기밥").
- 각 음식의 1인분 기준 추정값을 적으세요: calories(kcal), carbs(탄수화물 g), protein(단백질 g), fat(지방 g), sugar(당류 g). 모두 숫자만.
- estimatedBloodSugarImpact: 이 식사가 혈당을 얼마나 빠르게 올릴지 low/moderate/high 중 하나. (정제 탄수화물·당류·흰쌀밥·면류가 많으면 high)
- aiAnalysis: 한두 문장의 한국어 코칭 코멘트. 혈당·칼로리 관점에서 부드럽고 실용적으로. 의학적 단정은 피하세요.
- 음식이 아니거나 식별이 어려우면 foods를 빈 배열로 두고 aiAnalysis에 그 이유를 적으세요.
- 모든 수치는 추정값입니다. 과장 없이 합리적으로 추정하세요.`;

// 사진 한 장을 분석. base64는 데이터 URL 접두사 없는 순수 base64.
export async function analyzeFoodImage(
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<FoodAnalysisResult> {
  if (!PROXY_URL) {
    throw new Error('분석 서버 주소가 설정되지 않았습니다. (.env의 EXPO_PUBLIC_GEMINI_PROXY_URL 확인)');
  }

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new Error('네트워크 오류로 분석에 실패했습니다. 연결을 확인해 주세요.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ?? '';
    } catch {}
    if (res.status === 429) throw new Error('오늘 무료 분석 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.');
    if (res.status === 400 || res.status === 403)
      throw new Error('분석 서버 인증에 실패했습니다. (프록시 설정/허용 주소 확인)');
    throw new Error(`분석 서버 오류 (${res.status}) ${detail}`.trim());
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('분석 결과가 비어 있습니다. 다른 사진으로 시도해 주세요.');

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('분석 결과를 해석하지 못했습니다. 다시 시도해 주세요.');
  }

  // 숫자 보정(음수/NaN 방지) + 형태 정규화
  const foods: FoodItem[] = Array.isArray(parsed.foods)
    ? parsed.foods.map((f: any) => ({
        name: String(f?.name ?? '알 수 없음'),
        calories: clampNum(f?.calories),
        carbs: clampNum(f?.carbs),
        protein: clampNum(f?.protein),
        fat: clampNum(f?.fat),
        sugar: clampNum(f?.sugar),
      }))
    : [];

  const impact: BloodSugarImpact = ['low', 'moderate', 'high'].includes(
    parsed.estimatedBloodSugarImpact
  )
    ? parsed.estimatedBloodSugarImpact
    : 'moderate';

  return {
    foods,
    estimatedBloodSugarImpact: impact,
    aiAnalysis: String(parsed.aiAnalysis ?? ''),
  };
}

function clampNum(v: any): number {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
