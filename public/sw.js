const CACHE_NAME = '1-better-v1'

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
]

// Install: precache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: cache-first for same-origin, network-first for others
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isSameOrigin = url.origin === self.location.origin

  if (isSameOrigin) {
    // Cache-first for same-origin
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          // Only cache GET responses that are ok
          if (
            event.request.method === 'GET' &&
            response.ok &&
            response.type !== 'opaque'
          ) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
  } else {
    // Network-first for cross-origin (e.g. Supabase API calls)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = { title: '1% Better', body: 'Time for your daily habit.', url: '/' }

  try {
    payload = { ...payload, ...event.data.json() }
  } catch {
    payload.body = event.data.text() || payload.body
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
      requireInteraction: false,
    })
  )
})

// Notification click: open target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Try to focus an existing window
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      // Open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
