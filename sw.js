// Offline page: keeps a copy of offline.html and shows it in place of any page that can't load (built by cms/build/src/tools/post.py)
const V = 'km-offline-01d1471c', OFF = 'offline.html';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.add(new Request(OFF, { cache: 'reload' }))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V && k.startsWith('km-offline')) await caches.delete(k);
  if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
  await self.clients.claim(); })()); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.mode !== 'navigate' || r.method !== 'GET') return;   // pictures, scripts and the rest go straight to the network
  e.respondWith((async () => {
    try { const p = await e.preloadResponse; if (p) return p; return await fetch(r); }
    catch (_) { const c = await caches.open(V); return (await c.match(OFF)) || Response.error(); }
  })());
});
