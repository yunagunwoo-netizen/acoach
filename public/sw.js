// 에이코치 PWA 서비스 워커 (보수적 설정 — 동적 데이터/외부 API는 건드리지 않음)
const CACHE = 'acoach-v1';
const SHELL = ['/acoach/', '/acoach/manifest.json', '/acoach/icon-192.png', '/acoach/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // 식사 분석 등 POST는 그대로 네트워크로
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Gemini/식약처/Firebase 등 외부 API는 통과

  // 같은 출처 GET: 네트워크 우선, 실패 시 캐시 (오프라인 대비)
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('/acoach/')))
  );
});
