const CACHE_NAME = 'artisan-print-v3';
const STATIC_CACHE = 'artisan-static-v3';
const DYNAMIC_CACHE = 'artisan-dynamic-v3';
const API_CACHE = 'artisan-api-v3';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
];

const API_CACHE_DURATION = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('artisan-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, API_CACHE_DURATION));
    return;
  }

  if (isPageRequest(request)) {
    event.respondWith(networkFirstWithFallback(request, OFFLINE_URL));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithFallback(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Response not OK');
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cachedTime = new Date(cached.headers.get('date') || 0).getTime();
    const now = Date.now();
    if (now - cachedTime < maxAge) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function isPageRequest(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('text/html');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  const staticExtensions = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf)$/i;
  return staticExtensions.test(url.pathname);
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon.svg',
      badge: '/icons/icon.svg',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
        orderId: data.orderId || null,
        dateOfArrival: Date.now(),
      },
      actions: data.actions || [
        { action: 'view', title: 'Voir' },
        { action: 'close', title: 'Fermer' },
      ],
      tag: data.tag || 'default',
      renotify: data.renotify || false,
      requireInteraction: true,
      silent: false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'L\'Artisan Imprimeur', options)
    );
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('L\'Artisan Imprimeur', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const orderId = event.notification.data?.orderId;

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();
  for (const request of requests) {
    if (request.url.includes('/api/orders/')) {
      try {
        await fetch(request);
      } catch (e) {
        console.log('Sync failed for:', request.url);
      }
    }
  }
}
