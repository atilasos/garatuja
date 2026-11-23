/**
 * Build-time offline support: emits `sw.js` with a precache list generated from
 * the final bundle plus every file in `public/`, and adds a strict Content
 * Security Policy to the built `index.html`. (The CSP is not added in dev mode,
 * where Vite needs inline scripts and a websocket for hot reload.)
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';

export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "media-src 'self' blob: data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function walk(directory: string): string[] {
  let files: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    files = statSync(path).isDirectory() ? files.concat(walk(path)) : files.concat(path);
  }
  return files;
}

export function serviceWorker(source: { cacheName: string; files: string[] }) {
  return `// Garatuja offline cache (generated at build time).
const cacheName = ${JSON.stringify(source.cacheName)};
const files = ${JSON.stringify(source.files)};
self.addEventListener('install', event => {
  // No skipWaiting: a new version waits quietly and takes over on the next visit.
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('garatuja-') && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(cacheName).then(async cache =>
    await cache.match(request, { ignoreVary: true, ignoreSearch: true }) ||
    (request.mode === 'navigate' && await cache.match('./')) ||
    fetch(request)
  ));
});
`;
}

export function offline(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'garatuja-offline',
    apply: 'build',
    configResolved(resolved) { config = resolved; },
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy }, injectTo: 'head-prepend' }];
    },
    generateBundle(_options, bundle) {
      const publicFiles = config.publicDir ? walk(config.publicDir)
        .map(path => './' + relative(config.publicDir, path).split(sep).join('/')) : [];
      const bundled = Object.keys(bundle).map(name => './' + name);
      const files = ['./', ...new Set([...publicFiles, ...bundled])].filter(file => file !== './sw.js').sort();
      const hash = createHash('sha256');
      for (const item of Object.values(bundle)) hash.update(item.type === 'asset' ? item.source : item.code);
      for (const file of publicFiles) hash.update(file).update(readFileSync(join(config.publicDir, file.slice(2))));
      const cacheName = 'garatuja-' + hash.digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorker({ cacheName, files }) });
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify({ cacheName, files }, null, 2) });
    },
  };
}

export default defineConfig({
  base: './',
  build: { assetsInlineLimit: 0 },
  plugins: [offline()],
});
