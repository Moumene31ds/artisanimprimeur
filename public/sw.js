const CACHE_NAME = 'artisan-print-v4';
const STATIC_CACHE = 'artisan-static-v4';
const DYNAMIC_CACHE = 'artisan-dynamic-v4';
const API_CACHE = 'artisan-api-v4';
const IMAGE_CACHE = 'artisan-images-v4';
const META_CACHE = 'artisan-meta-v4';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
  '/icons/apple-touch-icon.png',
];

const API_CACHE_DURATION = 5 * 60 * 1000;
const IMAGE_MAX_ENTRIES = 300;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith('artisan-') && !n.endsWith('-v4'))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
  // Navigation Preload — تقليل زمن أول تحميل للصفحات.
  if (self.registration.navigationPreload) {
    event.waitUntil(self.registration.navigationPreload.enable().catch(() => {}));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // صور خارجية (Cloudinary / Firebase Storage) — cache-first مع دعم الأوفلاين.
  if (url.origin !== self.location.origin) {
    if (isImage(url)) {
      event.respondWith(imageCacheFirst(request));
      return;
    }
    event.respondWith(networkFirst(request));
    return;
  }

  // واجهات برمجية — stale-while-revalidate مع زمن صلاحية.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, API_CACHE_DURATION));
    return;
  }

  // تنقّل بين الصفحات — network-first مع الاحتياط للأوفلاين.
  if (isPageRequest(request)) {
    event.respondWith(networkFirstWithFallback(request, OFFLINE_URL));
    return;
  }

  // أصول بناء ثابتة (JS/CSS/etc) — cache-first سريع.
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

/* ---------- استراتيجيات التخزين المؤقت ---------- */

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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(fallbackUrl);
    if (fallback) return fallback;
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-While-Revalidate: يخدم النسخة المخزنة فوراً إن لم تنتهِ صلاحيتها،
 * ويحدّثها في الخلفية. يحسب الوقت بشكل موثوق عبر cache ميتا (لا يعتمد على
 * ترويسة Date التي قد تكون غائبة).
 */
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const meta = await getMeta(cacheName, request.url);
  const now = Date.now();
  const fresh = cached && meta && now - meta.time < maxAge;

  const fetchAndCache = async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
        await setMeta(cacheName, request.url, now);
      }
      return response;
    } catch (e) {
      return cached || new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };

  if (fresh) {
    fetchAndCache().catch(() => {});
    return cached;
  }
  return fetchAndCache();
}

async function imageCacheFirst(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      // حد أقصى لعدد الصور المخزنة لتجنب امتلاء التخزين.
      const keys = await cache.keys();
      if (keys.length >= IMAGE_MAX_ENTRIES) {
        await cache.delete(keys[0]);
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // عند الأوفلاين نعيد أيقونة بديلة إن وُجدت، أو رد فارغ.
    const fallbackIcon = await caches.match('/icons/icon-192x192.png');
    return fallbackIcon || new Response('', { status: 408 });
  }
}

async function getMeta(cacheName, url) {
  const meta = await caches.open(META_CACHE);
  const entry = await meta.match(`${cacheName}::${url}`);
  if (!entry) return null;
  try {
    return await entry.json();
  } catch (e) {
    return null;
  }
}

async function setMeta(cacheName, url, time) {
  const meta = await caches.open(META_CACHE);
  await meta.put(
    `${cacheName}::${url}`,
    new Response(JSON.stringify({ url, time }), { headers: { 'Content-Type': 'application/json' } })
  );
}

/* ---------- أدوات مساعدة ---------- */

function isPageRequest(request) {
  return (request.headers.get('Accept') || '').includes('text/html');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  const re = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf)$/i;
  return re.test(url.pathname);
}

function isImage(url) {
  return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname);
}

/* ---------- إشعارات Web Push ---------- */

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'L\'Artisan Imprimeur', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon.svg',
    vibrate: data.vibrate || [200, 100, 200],
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
    renotify: Boolean(data.renotify),
    requireInteraction: true,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'L\'Artisan Imprimeur', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(urlToOpen).catch(() => {});
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

self.addEventListener('notificationclose', () => {
  // يمكن استخدامه لإرسال تحليلات — فارغ حالياً.
});

/* ---------- رسائل من التطبيق (تحديث فوري) ---------- */

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'SYNC_NOW') {
    event.waitUntil(syncHomeData());
  } else if (data.type === 'SYNC_ORDERS') {
    event.waitUntil(syncOrders());
  }
});

/* ---------- مزامنة دورية (Periodic Background Sync) ---------- */

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  } else if (event.tag === 'sync-home') {
    event.waitUntil(syncHomeData());
  }
});

async function syncOrders() {
  const cache = await caches.open(API_CACHE);
  const requests = await cache.keys();
  for (const request of requests) {
    if (request.url.includes('/api/orders/')) {
      try {
        await fetch(request);
      } catch (e) { /* ignore */ }
    }
  }
}

async function syncHomeData() {
  const targets = ['/', '/api/recommendations'];
  for (const path of targets) {
    try {
      const url = new URL(path, self.location.origin);
      const res = await fetch(url);
      if (res.ok) {
        const cache = await caches.open(url.pathname.startsWith('/api/') ? API_CACHE : DYNAMIC_CACHE);
        await cache.put(url, res.clone());
        await setMeta(API_CACHE, url.toString(), Date.now());
      }
    } catch (e) { /* ignore */ }
  }
}
