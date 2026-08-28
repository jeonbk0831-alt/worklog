/* 업무노트 서비스 워커
   - 화면과 설정 파일은 항상 인터넷에서 최신본을 확인
   - 인터넷이 없으면 저장해둔 것으로 실행
   - 적어둔 내용은 여기와 무관하며 지워지지 않음 */

const CACHE = 'worknote-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(
        ASSETS.map(u => fetch(u, { cache: 'reload' })
          .then(r => (r && r.ok) ? c.put(u, r) : null)
          .catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');
  const isManifest = url.pathname.endsWith('manifest.json');

  if (isPage || isManifest) {
    // 화면과 설정: 항상 최신본을 직접 확인
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(isPage ? './index.html' : req, copy));
          return res;
        })
        .catch(() => caches.match(isPage ? './index.html' : req))
    );
    return;
  }

  // 아이콘 등: 저장본 우선
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
