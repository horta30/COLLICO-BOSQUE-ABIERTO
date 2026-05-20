// =============================================================================
// COLLICO BOSQUE ABIERTO — Service Worker
// 
// OBJETIVO: garantizar que el mapa funcione SIN SEÑAL en el Tótem y dentro
// del parque. Se cachean:
//   • Los archivos HTML/JS/CSS del proyecto (app shell)
//   • ~455 tiles ESRI World Imagery del bounding box del parque (zoom 13-17)
//     Total: ~6.7 MB — cabe holgado en la cuota iOS (~50 MB)
// 
// ESTRATEGIA:
//   • App shell: cache-first (siempre disponible offline)
//   • Tiles del parque: cache-first (descargados al cargar mapa.html)
//   • Tiles fuera del bbox: network-only (no se cachean)
//   • Firebase / Apps Script: network-only (data dinámica, NO se intercepta)
// 
// LIMITACIONES iOS:
//   • iOS borra cache tras ~7 días de inactividad → se re-cachea al volver
//   • iOS no permite background sync → cache solo se actualiza con la app abierta
// =============================================================================

const CACHE_VERSION   = 'cba-v23';       // Cambiar para invalidar todo el cache (v23: tramos ripio visibles encima + markers responden al filtro)
const APP_CACHE       = `${CACHE_VERSION}-app`;
const TILES_CACHE     = `${CACHE_VERSION}-tiles`;

// App shell — archivos críticos para que la app cargue offline
const APP_SHELL = [
  './',
  './index.html',
  './landing.html',
  './registro.html',
  './mapa.html',
  './supervisor.html',
  './assets/config.js',
  './assets/senderos.js',
  './assets/cc.js',
  './assets/offline.js',
  './assets/devnav.js',
  // CDN críticos (MapLibre + fuentes) — se cachean al primer fetch
  'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'
];

// Dominios de tiles que se cachean (ESRI + OSM)
const TILE_DOMAINS = [
  'server.arcgisonline.com',
  'tile.openstreetmap.org'
];

// Dominios que NUNCA se cachean (data dinámica)
const NO_CACHE_DOMAINS = [
  'firebaseio.com',
  'googleapis.com',     // gstatic firebase + apps script
  'script.google.com',
  'googleusercontent.com'
];


// ─────────────────────────────────────────────────────────────────────────────
// INSTALL — Pre-cachear el app shell
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(err => {
        // No bloquear instalación si algún recurso falla (ej. CDN caído)
        console.warn('[SW] install partial:', err);
        return self.skipWaiting();
      })
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE — Limpiar caches antiguos
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});


// ─────────────────────────────────────────────────────────────────────────────
// FETCH — Estrategia híbrida
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Dominios bloqueados: pasan directo sin intercepción
  if (NO_CACHE_DOMAINS.some(d => url.hostname.includes(d))) {
    return;
  }

  // 2. Tiles de mapa: cache-first
  if (TILE_DOMAINS.some(d => url.hostname === d)) {
    event.respondWith(cacheFirst(req, TILES_CACHE));
    return;
  }

  // 3. App shell + assets: cache-first con fallback a network
  if (url.origin === self.location.origin || req.destination === 'script' || req.destination === 'style') {
    event.respondWith(cacheFirst(req, APP_CACHE));
    return;
  }

  // 4. Resto: network-first
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req, cacheName) {
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(req);
    if (cached) return cached;
    const fresh  = await fetch(req);
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (e) {
    // Sin red y sin cache → respuesta vacía (no rompe la app)
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(req) {
  try {
    return await fetch(req);
  } catch (e) {
    const cached = await caches.match(req);
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE — Pre-cache de tiles del bbox del parque
// 
// El cliente (offline.js) envía un mensaje con la lista de URLs de tiles
// a pre-cachear cuando entra al mapa. El SW las descarga en background
// y reporta progreso de vuelta al cliente.
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, urls } = event.data || {};

  if (type === 'PRECACHE_TILES' && Array.isArray(urls)) {
    event.waitUntil(precacheTiles(urls, event.source));
  }
});

async function precacheTiles(urls, source) {
  const cache = await caches.open(TILES_CACHE);
  let done = 0, ok = 0, fail = 0;

  // Concurrencia limitada para no saturar la red ni la batería
  const BATCH = 6;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    await Promise.all(batch.map(async (url) => {
      try {
        // Si ya está en cache, no re-descargar
        const cached = await cache.match(url);
        if (cached) { ok++; done++; return; }

        const resp = await fetch(url, { mode: 'cors' });
        if (resp.ok) {
          await cache.put(url, resp.clone());
          ok++;
        } else {
          fail++;
        }
      } catch (e) {
        fail++;
      }
      done++;
      // Notificar progreso al cliente cada N
      if (source && done % 10 === 0) {
        source.postMessage({ type: 'PRECACHE_PROGRESS', done, total: urls.length, ok, fail });
      }
    }));
  }

  // Notificar fin
  if (source) {
    source.postMessage({
      type: 'PRECACHE_DONE',
      done, total: urls.length, ok, fail,
      timestamp: Date.now()
    });
  }
}
