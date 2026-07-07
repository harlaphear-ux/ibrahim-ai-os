/* ─────────────────────────────────────────────────────
   Ibrahim's AI OS — Service Worker
   Version: 1.3
   Strategy: Cache-first for assets, Network-first for API
───────────────────────────────────────────────────── */

const CACHE_NAME  = 'ibrahim-ai-os-v1.3'
const SHELL_CACHE = 'ibrahim-shell-v1.3'

/* App shell — cached on install for offline support */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

/* ── Activate: clear old caches ── */
self.addEventListener('activate', event => {
  const VALID = [CACHE_NAME, SHELL_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !VALID.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

/* ── Fetch strategy ── */
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // API calls → network only (don't cache)
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests (page loads) → serve index.html for SPA routing
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        if (cached) return cached
        return fetch('/index.html')
      })
    )
    return
  }

  // Static assets → cache-first, fallback to network then cache
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached

      return fetch(request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response
          }
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => {
          // Offline fallback for HTML
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html')
          }
        })
    })
  )
})

/* ── Push notification handler (ready for future use) ── */
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  self.registration.showNotification(data.title || "Ibrahim's AI OS", {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: data.url ? { url: data.url } : {},
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  }
})
