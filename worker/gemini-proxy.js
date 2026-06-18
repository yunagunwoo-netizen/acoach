// 에이코치 Gemini 프록시 (Cloudflare Worker)
// 앱은 이 Worker를 호출하고, 진짜 Gemini 키는 여기 서버 시크릿(GEMINI_API_KEY)에만 있음.
// 배포: Cloudflare 대시보드 → Workers → Create → 이 코드 붙여넣기
//       Settings → Variables → Secret로 GEMINI_API_KEY 추가 (값 = AQ.로 시작하는 Gemini 키)

// 허용할 사이트(브라우저) — 내 PWA 주소. 다른 데서 못 쓰게 막음.
const ALLOWED_ORIGINS = [
  'https://yunagunwoo-netizen.github.io',
  'http://localhost:8081',
];

// 고정 모델 (앱과 동일)
const UPSTREAM =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // 프리플라이트
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return new Response('Only POST', { status: 405, headers: corsHeaders(origin) });
    }
    // 허용된 사이트에서 온 요청만 (간단한 남용 방지)
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden origin', { status: 403, headers: corsHeaders(origin) });
    }
    if (!env.GEMINI_API_KEY) {
      return new Response('Server key not set', { status: 500, headers: corsHeaders(origin) });
    }

    const body = await request.text();
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  },
};
