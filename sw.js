/* K-note 서비스 워커
   - 앱을 켤 때 최신 화면을 직접 가져옴
   - 인터넷이 없을 때만 저장해둔 화면으로 실행
   - 적어둔 내용은 여기와 무관하며 지워지지 않음 */

const CACHE = 'knote-v5';
const PAGE  = './index.html';
const ASSETS = [
  './',
  PAGE,
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

  if (isPage) {
    /* 화면 파일: 주소로 새 요청을 만들어 가져온다.
       원래 요청을 그대로 재사용하면 브라우저가 거부한다. */
    e.respondWith(
      fetch(PAGE, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(PAGE, copy));
          }
          return res;
        })
        .catch(() => caches.match(PAGE))
    );
    return;
  }

  if (isManifest) {
    e.respondWith(
      fetch(url.pathname, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  /* 아이콘 등: 저장본 우선 */
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
