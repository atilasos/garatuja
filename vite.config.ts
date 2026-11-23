import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'offline-workspace',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', './manifest.webmanifest', './pingo.svg', ...Object.keys(bundle).map(name => './' + name)];
      const hash = createHash('sha256');
      for (const item of Object.values(bundle)) hash.update(item.type === 'asset' ? item.source : item.code);
      const cache = 'garatuja-' + hash.digest('hex').slice(0, 16);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `
const cacheName = ${JSON.stringify(cache)};
const files = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('garatuja-') && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(cacheName).then(async cache =>
    await cache.match(event.request, { ignoreVary: true }) ||
    (event.request.mode === 'navigate' && await cache.match('./')) ||
    fetch(event.request)
  ));
});
`,
      });
    },
  }],
});
