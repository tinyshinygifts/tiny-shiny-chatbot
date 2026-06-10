const CACHE_NAME = 'tiny-shiny-cache-20260610133602';
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.pathname.includes('admin') || url.pathname.includes('api-settings') || url.pathname.includes('whatsapp') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req, {cache:'no-store'}).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
