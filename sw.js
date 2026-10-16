/* درب الحاج — service worker.
   • App code is fetched fresh when online (updates show up right away); 3D, map, fonts and icons come from the cache.
   • Shows "new report" notifications on the supervisor's phone even when the app is closed (Web Push via ntfy.sh). */
const CACHE = 'darb-alhajj-v5';
const LIBS = ['three.module.min.js', 'OrbitControls.js', 'RoomEnvironment.js', 'jsQR.js', 'qrcode.js', 'leaflet.js', 'leaflet.css'];
const SHELL = [
  './', 'index.html', 'app.js?v=5', 'kaaba3d.js?v=5', 'manifest.json', ...LIBS,
  'Tajawal-Regular.ttf', 'Tajawal-Medium.ttf', 'Tajawal-Bold.ttf', 'Tajawal-ExtraBold.ttf',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // live relay + maps always go to the network
  const file = url.pathname.split('/').pop();
  const isCode = req.mode === 'navigate' || (/\.(html|js|json)$/.test(url.pathname) && !LIBS.includes(file));
  if (isCode) {
    e.respondWith(fetch(req).then((res) => save(req, res))
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
});

/* ---------- push notifications (payload from ntfy.sh: {event, subscription_id, message:{title, message, tags, click, id}}) ---------- */
const EMOJI = { rotating_light: '🚨 ', round_pushpin: '📍 ', white_check_mark: '✅ ' };
self.addEventListener('push', (e) => {
  let d = null;
  try { d = e.data ? e.data.json() : null; } catch (err) { d = null; }
  const m = (d && d.message && typeof d.message === 'object') ? d.message : (d || {});
  let title = 'درب الحاج', body = 'بلاغ جديد — اضغطي لفتح لوحة المشرفة', url = './#super', tag = 'darb';
  if (d && d.event === 'subscription_expiring') {
    body = 'افتحي لوحة المشرفة عشان تتجدد التنبيهات'; tag = 'darb-renew';
  } else if (m) {
    const em = (m.tags || []).map((t) => EMOJI[t] || '').join('');
    title = em + (m.title || title);
    body = m.message || body;
    url = m.click || url;
    tag = m.id || tag;
  }
  e.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body, tag, renotify: true, requireInteraction: true, dir: 'rtl', lang: 'ar',
      icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [300, 120, 300, 120, 500], data: { url },
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'push', title }))),
  ]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './#super', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.postMessage({ type: 'open' }); return c.focus(); }
    }
    return self.clients.openWindow(target);
  }));
});
