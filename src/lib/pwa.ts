export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
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
 * مراقبة توفّر تحديث جديد للسيرفس ووركر.
 * يعيد دالة فكّ الاشتراك + وسيط updateAvailable لاستدعاء عند ظهور تحديث.
 */
export function onServiceWorkerUpdate(cb: (hasUpdate: boolean, reg?: ServiceWorkerRegistration) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  let unregister = () => {};
  navigator.serviceWorker.getRegistration('/').then((registration) => {
    if (!registration) return;
    const onUpdateFound = () => {
      const newWorker = registration.installing || registration.waiting;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          cb(true, registration);
        }
      });
    };
    registration.addEventListener('updatefound', onUpdateFound);
    unregister = () => registration.removeEventListener('updatefound', onUpdateFound);
  });

  return unregister;
}

/** تطبيق التحديث الفوري: يخطّي السيرفس ووركر القديم ثم يُحدَّث التطبيق. */
export async function applyServiceWorkerUpdate(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      await registration?.update();
    }
  } catch (e) {
    console.error('Failed to apply SW update:', e);
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

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export function isAppInstalled(): boolean {
  return isPWAInstalled();
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
