const CACHE_VERSION = 'v9';
const CACHE_NAME = `artisan-print-${CACHE_VERSION}`;
const STATIC_CACHE = `artisan-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `artisan-dynamic-${CACHE_VERSION}`;
const API_CACHE = `artisan-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `artisan-images-${CACHE_VERSION}`;
const META_CACHE = `artisan-meta-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// إصدار البناء — يُحدَّث عند كل إصدار جديد ليتمكّن العملاء من التحقق منه.
const BUILD_ID = 'v9';

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
const DYNAMIC_MAX_ENTRIES = 150;
const API_MAX_ENTRIES = 100;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // نؤجّل السيطرة على الصفحة عند التحديثات: يبقى السيرفس ووركر الجديد في
  // حالة waiting حتى يقرّر العميل (عبر زر "تحديث الآن") إرسال SKIP_WAITING.
  // فقط في أول تثبيت (لا يوجد سيرفس ووركر قديم) نستحوذ فوراً.
  if (!self.registration.active) {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // تنظيف كل ذاكرات الإصدارات القديمة (بدون تمييز الـ v8).
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith('artisan-') && !n.endsWith(`-${CACHE_VERSION}`))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
  // Navigation Preload — تقليل زمن أول تحميل للصفحات.
  if (self.registration.navigationPreload) {
    event.waitUntil(self.registration.navigationPreload.enable().catch(() => {}));
  }
  // إخبار كل النوافذ المفتوحة أن نسخة جديدة أصبحت مسيطرة (لإعادة التحميل).
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'NEW_VERSION_ACTIVATED', version: BUILD_ID });
      }
    })
  );
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

  // نقطة نهاية الإصدارات — دائماً من الشبكة (لا تخزين مؤقت) حتى يقارن العميل إصداره بدقة.
  if (url.pathname === '/api/build-info') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
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

/**
 * كتابة آمنة في الذاكرة المؤقتة:
 *  - تحدّ العدد الأقصى للإدخالات (منع امتلاء التخزين).
 *  - تلتقط أخطاء الحصة (QuotaExceeded) وتحذف الأقدم عند الضرورة.
 */
async function safePut(cacheName, request, response, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (maxEntries && maxEntries > 0) {
      const keys = await cache.keys();
      if (keys.length > maxEntries) {
        // إزالة الأقدم أولاً (مفاتيح Cache API مرتبة بترتيب الإدراج).
        const excess = keys.length - maxEntries;
        for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
      }
    }
  } catch (e) {
    // QuotaExceeded أو خطأ كتابة → نحاول تنظيف ثم نتجاهل (لا نفشل الطلب).
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      if (keys.length > 0) await cache.delete(keys[0]);
    } catch (e2) {
      /* ignore */
    }
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await safePut(DYNAMIC_CACHE, request, response, DYNAMIC_MAX_ENTRIES);
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
      await safePut(DYNAMIC_CACHE, request, response, DYNAMIC_MAX_ENTRIES);
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
      await safePut(DYNAMIC_CACHE, request, response, DYNAMIC_MAX_ENTRIES);
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
        await safePut(cacheName, request, response, API_MAX_ENTRIES);
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
      await safePut(IMAGE_CACHE, request, response, IMAGE_MAX_ENTRIES);
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

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // نافذة مفتوحة على نفس الصفحة → تركيز فقط دون إعادة تنقّل (لا فقدان حالة).
      for (const client of clientList) {
        if ('focus' in client && client.url === urlToOpen.href) {
          return client.focus();
        }
      }
      // نافذة موجودة → تنقّلها للهدف وركّزها.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(urlToOpen.href).catch(() => {});
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen.href);
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
  } else if (data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'VERSION', version: BUILD_ID });
    }
  } else if (data.type === 'SYNC_NOW') {
    event.waitUntil(syncHomeData());
  } else if (data.type === 'SYNC_ORDERS') {
    event.waitUntil(syncOrders());
  } else if (data.type === 'REPLAY_OUTBOX') {
    event.waitUntil(replayOutboxSW());
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

/* ---------- طابور الإجراءات غير المتصلة (Background Sync) ---------- */

const OUTBOX_DB_NAME = 'artisan-outbox';
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE = 'requests';

function openOutboxDb() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function outboxGetAll() {
  const db = await openOutboxDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OUTBOX_STORE, 'readonly');
      const req = tx.objectStore(OUTBOX_STORE).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); resolve([]); };
    } catch (e) {
      db.close();
      resolve([]);
    }
  });
}

async function outboxDelete(id) {
  const db = await openOutboxDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OUTBOX_STORE, 'readwrite');
      tx.objectStore(OUTBOX_STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch (e) {
      db.close();
      resolve();
    }
  });
}

/**
 * إعادة إرسال الإجراءات المخزنة أثناء الأوفلاين.
 * الإدخالات الناجحة أو المرفوضة نهائياً (4xx) تُحذف؛ أخطاء الشبكة/الخادم
 * تبقى لإعادة محاولة لاحقة.
 */
async function replayOutboxSW() {
  const entries = await outboxGetAll();
  let sent = 0;
  for (const entry of entries.slice().reverse()) {
    if (entry.id == null) continue;
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });
      if (res.ok || res.status < 500) {
        await outboxDelete(entry.id);
        if (res.ok) sent++;
      }
    } catch (e) {
      break; // لا شبكة → توقف (سيعيد المتصفح استدعاء sync لاحقاً).
    }
  }
  // إشعار الواجهات بحدوث مزامنة (لتحديث العدّادات).
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({ type: 'OUTBOX_SYNCED', sent });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'outbox-sync') {
    event.waitUntil(replayOutboxSW());
  }
});

/* ---------- الرفع بالخلفية (Background Fetch API) ---------- */

const BGFETCH_CACHE = `artisan-bgfetch-${CACHE_VERSION}`;

/**
 * نجاح رفع/تنزيل خلفي: نحفظ الاستجابة في ذاكرة خاصة ونبلّغ كل النوافذ
 * (تُقرأ النتيجة لاحقاً حتى لو كانت الصفحة مغلقة لحظة الاكتمال).
 */
self.addEventListener('backgroundfetchsuccess', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(BGFETCH_CACHE);
      const records = await event.registration.matchedRecords();
      for (const record of records) {
        try {
          const response = await record.responseReady;
          if (response && response.ok) {
            await cache.put(`/__bgfetch/${event.registration.id}`, response.clone());
          }
        } catch (e) { /* ignore */ }
      }
      await broadcastMessage({ type: 'BG_FETCH_DONE', id: event.registration.id, ok: true });
    } catch (e) {
      await broadcastMessage({ type: 'BG_FETCH_DONE', id: event.registration.id, ok: false });
    }
  })());
});

self.addEventListener('backgroundfetchfail', (event) => {
  event.waitUntil(
    broadcastMessage({ type: 'BG_FETCH_DONE', id: event.registration.id, ok: false })
  );
});

self.addEventListener('backgroundfetchabort', (event) => {
  event.waitUntil(
    broadcastMessage({ type: 'BG_FETCH_ABORTED', id: event.registration.id })
  );
});

// تقدم الرفع/التنزيل → بثّه للواجهة لعرض شريط تقدم.
self.addEventListener('backgroundfetchclick', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) return client.focus();
    })
  );
});

async function broadcastMessage(message) {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) client.postMessage(message);
}

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
        const cacheName = url.pathname.startsWith('/api/') ? API_CACHE : DYNAMIC_CACHE;
        const cache = await caches.open(cacheName);
        await cache.put(url, res.clone());
        await setMeta(API_CACHE, url.toString(), Date.now());
      }
    } catch (e) { /* ignore */ }
  }
}
