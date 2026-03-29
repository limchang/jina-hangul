const CACHE_NAME = 'jina-hangul-v1';

// 설치 — 핵심 정적 파일 프리캐시
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        './',
        './index.html',
        './glyphs.json',
      ])
    )
  );
  self.skipWaiting();
});

// 활성화 — 오래된 캐시 정리
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch — 네트워크 우선, 실패 시 캐시 (앱 셸은 캐시 우선)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // HTML 네비게이션 → 캐시 우선 (오프라인 지원)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 정적 자산 (JS/CSS/폰트/이미지/JSON) → stale-while-revalidate
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.otf') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.wav')
  ) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) => {
          const fetched = fetch(e.request).then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // 나머지 — 네트워크만
  e.respondWith(fetch(e.request));
});
