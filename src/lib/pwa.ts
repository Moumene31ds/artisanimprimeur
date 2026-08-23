// ---------------------------------------------------------------------------
// pwa.ts — كل ما يتعلق بدورة حياة الـ PWA: التسجيل، كشف التحديثات الفوري،
// المزامنة، الإشعارات، وحالة التركيب.
// ---------------------------------------------------------------------------

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      // لا تخزين sw.js نفسه في الكاش: كل فحص تحديث يسحب النسخة الحية مباشرة
      // (يمنع تعثر اكتشاف التحديثات بسبب HTTP cache).
      updateViaCache: 'none',
    });
    return registration;
  } catch (error) {
    return false;
  }
}

export interface SWUpdateEvent {
  hasUpdate: boolean;
  registration?: ServiceWorkerRegistration;
}

/**
 * مراقبة توفّر تحديث جديد للسيرفس ووركر (تحديث موثوق):
 * يغطي الحالات التالية:
 *  - يوجد بالفعل worker في حالة waiting (اكتُشف التحديث في زيارة سابقة).
 *  - worker جديد قيد التثبيت (installing) ووصل إلى حالة installed.
 * يعيد دالة إلغاء الاشتراك + وسيط updateAvailable.
 */
export function onServiceWorkerUpdate(
  cb: (hasUpdate: boolean, reg?: ServiceWorkerRegistration) => void
): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  let unregister = () => {};
  navigator.serviceWorker.getRegistration('/').then((registration) => {
    if (!registration) return;

    // تحديث موجود مسبقاً في انتظار السيطرة (وصل في جلسة سابقة).
    if (registration.waiting) {
      cb(true, registration);
      return;
    }

    const onUpdateFound = () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      const onStateChange = () => {
        // installed = نسخة جديدة جاهزة بالكامل في cache.
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          cb(true, registration);
          newWorker.removeEventListener('statechange', onStateChange);
        }
        // في أول تثبيت (لا يوجد controller) لا حاجة للإبلاغ.
        if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
          newWorker.removeEventListener('statechange', onStateChange);
        }
      };
      newWorker.addEventListener('statechange', onStateChange);
    };

    registration.addEventListener('updatefound', onUpdateFound);
    unregister = () => {
      registration.removeEventListener('updatefound', onUpdateFound);
    };
  });

  return unregister;
}

/** مراقبة انتقال السيطرة إلى سيرفس ووركر جديد (controllerchange). */
export function watchControllerChange(cb: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  navigator.serviceWorker.addEventListener('controllerchange', cb);
  return () => navigator.serviceWorker.removeEventListener('controllerchange', cb);
}

/** الاستماع لرسائل السيرفس ووركر (مثل NEW_VERSION_ACTIVATED). */
export function onServiceWorkerMessage(
  cb: (data: any) => void
): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = (event: MessageEvent) => cb(event.data);
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

/** تطبيق التحديث الفوري: يخطّي السيرفس ووركر القديم ثم يُحدَّث التطبيق. */
export async function applyServiceWorkerUpdate(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else if (registration?.installing) {
      registration.installing.postMessage({ type: 'SKIP_WAITING' });
    } else {
      await registration?.update();
    }
  } catch (e) {
    console.error('Failed to apply SW update:', e);
  }
}

/** التحقق اليدوي من وجود تحديث جديد (يسحب sw.js الجديد من الشبكة). */
export async function checkForUpdates(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) return null;
    await registration.update();
    return registration;
  } catch {
    return null;
  }
}

/** فحص دوري آلي للتحديثات كل intervalMs (افتراضياً 5 دقائق). */
export function pollForUpdates(intervalMs = 5 * 60 * 1000): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  let timer: ReturnType<typeof setInterval> | null = null;
  timer = setInterval(() => {
    checkForUpdates().catch(() => {});
  }, intervalMs);
  return () => {
    if (timer) clearInterval(timer);
  };
}

export interface BuildFeatureSet {
  version: string;
  date?: string | null;
  kind?: 'normal' | 'critical';
  features: { ar: string[]; fr: string[] };
}

export interface BuildInfo {
  version: string;
  release?: string;
  releaseDate?: string | null;
  kind?: 'normal' | 'critical';
  features?: { ar: string[]; fr: string[] };
  /** الميزات التراكمية لكل الإصدارات الأحدث من نسخة المستخدم (عند تمرير ?since=). */
  changelogSince?: BuildFeatureSet[];
}

/** مفتاح آخر نسخة شاهدها المستخدم (مخزّن محلياً). */
export const LAST_SEEN_BUILD = "pwa-last-seen-build";

/** اسم حدث إظهار واجهة التحديث فوراً (يستمع إليه PWALifecycle). */
export const SHOW_UPDATE_EVENT = "app:show-update";

/** آخر نسخة رآها/رفضها/طبّقها المستخدم. */
export function getLastSeenBuild(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_BUILD);
  } catch {
    return null;
  }
}

/** تعليم نسخة معيّنة على أنها شوهدت. */
export function markBuildSeen(buildId: string): void {
  try {
    localStorage.setItem(LAST_SEEN_BUILD, buildId);
  } catch {
    /* ignore */
  }
}

/** بثّ حدث لإظهار واجهة التحديث فوراً (مثل التحقق اليدوي من صفحة الإعدادات). */
export function dispatchShowUpdate(info: BuildInfo): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHOW_UPDATE_EVENT, { detail: info }));
}

/**
 * الحصول على نسخة البناء من الخادم (بلا تخزين مؤقت).
 * - `since`: آخر نسخة شاهدها المستخدم، ليعيد الخادم الميزات التراكمية.
 * - مهلة قصيرة (AbortSignal) كي لا تبقى واجهة التحقق معلّقة على شبكة بطيئة.
 */
export async function getBuildInfo(since?: string | null): Promise<BuildInfo | null> {
  try {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    const res = await fetch(`/api/build-info${query}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BuildInfo;
  } catch {
    return null;
  }
}

/** الحصول على إصدار السيرفس ووركر الحالي (عبر MessageChannel). */
export async function getSWVersion(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const controller = registration?.active || navigator.serviceWorker.controller;
    if (!controller) return null;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(null), 1500);
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        if (event.data?.type === 'VERSION') {
          resolve(event.data.version);
        } else {
          resolve(null);
        }
      };
      controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    });
  } catch {
    return null;
  }
}

/** تفعيل المزامنة الدورية للأوامر والبيانات الرئيسية (Chrome-based). */
export async function registerPeriodicSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PeriodicSyncManager' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;
    if (!periodicSync) return;
    const status = await (navigator as any).permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await periodicSync.register('sync-orders', { minInterval: 6 * 60 * 60 * 1000 });
      await periodicSync.register('sync-home', { minInterval: 12 * 60 * 60 * 1000 });
    }
  } catch (e) {
    console.debug('Periodic sync unavailable:', e);
  }
}

/** طلب مزامنة فورية من السيرفس ووركر (يُستخدم عند توفّر الشبكة). */
export async function triggerSyncNow(kind: 'orders' | 'home'): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    registration?.active?.postMessage({ type: kind === 'orders' ? 'SYNC_ORDERS' : 'SYNC_NOW' });
  } catch (e) {
    console.debug('triggerSyncNow failed:', e);
  }
}

/** حالة الشبكة الحالية. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

// ---------------------------------------------------------------------------
// Content Indexing — إتاحة الصفحات المخزّنة مؤقتاً في قائمة "من أجل لاحقاً"
// بمتصفح كروم (يظهر المحتوى المتاح أوفلاين في قسم التنزيلات).
// ---------------------------------------------------------------------------

const CONTENT_INDEX_ITEMS = [
  {
    id: 'home',
    url: '/',
    title: "L'Artisan Imprimeur",
    description: 'الرئيسية — Accueil',
    icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
  },
  {
    id: 'services',
    url: '/services',
    title: 'Nos services | خدماتنا',
    description: 'كل خدمات الطباعة — Tous nos services',
    icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
  },
];

export async function registerContentIndex(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration: any = await navigator.serviceWorker.ready;
    if (!registration.index) return;
    const existing = await registration.index.getAll();
    const known = new Set((existing || []).map((d: any) => d.id));
    for (const item of CONTENT_INDEX_ITEMS) {
      if (!known.has(item.id)) {
        await registration.index.add(item);
      }
    }
  } catch (e) {
    console.debug('Content Indexing unavailable:', e);
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!('Notification' in window)) return null;
  if (!('serviceWorker' in navigator)) return null;
  if (!('PushManager' in window)) return null;

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    return null;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch {
    return null;
  }
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ),
    });
    return subscription;
  } catch {
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * ضمان صلاحية اشتراك Push (تجديد تلقائي صامت):
 *  - انتهت الصلاحية (expirationTime قريبة) → إعادة اشتراك.
 *  - تغيّر مفتاح VAPID للخادم → إعادة اشتراك بالمفتاح الحالي.
 * يعيد الاشتراك الجديد عند حدوث تجديد، وnull إذا لم يكن هناك شيء لفعله
 * (لا اشتراك سابق — التسجيل يبقى اختيار المستخدم من زر الإشعارات).
 */
export async function ensureFreshPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    if (!vapidKey) return null;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return null;

    // 1) فحص انتهاء الصلاحية (قبلها بأسبوع احتياطاً).
    const expiresSoon =
      !!existing.expirationTime && existing.expirationTime - Date.now() < 7 * 24 * 60 * 60 * 1000;

    // 2) فحص تطابق مفتاح VAPID.
    let keyChanged = false;
    try {
      const currentKey = urlBase64ToUint8Array(vapidKey);
      const storedKey = existing.options.applicationServerKey;
      if (storedKey) {
        const a = new Uint8Array(currentKey);
        const b = new Uint8Array(storedKey as ArrayBuffer);
        keyChanged = a.length !== b.length || a.some((v, i) => v !== b[i]);
      } else {
        keyChanged = true;
      }
    } catch {
      /* ignore */
    }

    if (!expiresSoon && !keyChanged) return null;

    // تجديد: ألغِ القديم واشترك من جديد بنفس النطاق.
    const oldEndpoint = existing.endpoint;
    await existing.unsubscribe();
    const fresh = await subscribeToPushNotifications();
    if (fresh && fresh.endpoint !== oldEndpoint) {
      return fresh;
    }
    return fresh;
  } catch {
    return null;
  }
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// ---------------------------------------------------------------------------
// Badging API — شارة عدد الإشعارات غير المقروءة على أيقونة التطبيق
// ---------------------------------------------------------------------------

/** هل تدعم البيئة شارة التطبيق (Badging API)؟ */
export function isBadgeSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "setAppBadge" in navigator && "clearAppBadge" in navigator;
}

/** تعيين شارة بعدد معيّن (مثل الإشعارات غير المقروءة). */
export async function setAppBadge(count: number): Promise<void> {
  try {
    if (!isBadgeSupported() || count <= 0) return;
    await (navigator as any).setAppBadge(Math.min(count, 99));
  } catch {
    /* غير مدعوم أو مرفوض */
  }
}

/** إزالة شارة التطبيق. */
export async function clearAppBadge(): Promise<void> {
  try {
    if (!isBadgeSupported()) return;
    await (navigator as any).clearAppBadge();
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// قبلinstallprompt (مشترك) — تُخزَّن المطالبة على مستوى الوحدة حتى تتمكن أي
// صفحة (مثل الإعدادات) من استخدامها حتى لو أطلق المتصفح الحدث قبل فتحها.
// ---------------------------------------------------------------------------
let deferredInstallPrompt: any = null;

/** التقاط حدث التثبيت من المتصفح (يُستدعى من PWAPrompt). */
export function captureInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredInstallPrompt = event;
}

/** الحصول على المطالبة المحفوظة (قد تكون null إذا لم تتوفر أو استُهلكت). */
export function getInstallPrompt(): any {
  return deferredInstallPrompt;
}

/** مسح المطالبة المحفوظة بعد استخدامها. */
export function clearInstallPrompt(): void {
  deferredInstallPrompt = null;
}

/**
 * تشغيل مطالبة التثبيت بشكل مباشر (مثلاً من الإعدادات).
 * يُعيد "accepted" عند قبول المستخدم، و"dismissed" عند الإلغاء،
 * و"unavailable" إذا لم تتوفر مطالبة (متصفح غير داعم أو سبق استهلاكها).
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = getInstallPrompt();
  if (!prompt) return 'unavailable';
  clearInstallPrompt();
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}

/** هل التطبيق مثبّت (وضع مستقل أو سُجّل سابقاً). */
export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return isPWAInstalled() || localStorage.getItem('pwa-installed') === 'true';
  } catch {
    return isPWAInstalled();
  }
}

export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return !isPWAInstalled() && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
