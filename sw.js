const C = 'sibt-v2', A = ['./', './index.html', './css/style.css?v=2', './js/config.js?v=2', './js/app.js?v=2', './icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(A))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || /script\.google\.com|googleusercontent/.test(e.request.url)) return;   // API selalu ke jaringan
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
