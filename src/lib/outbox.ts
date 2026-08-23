// ---------------------------------------------------------------------------
// outbox.ts — طابور الإجراءات غير المتصلة (Offline Outbox)
// ---------------------------------------------------------------------------
// عند فشل إرسال طلب (POST/PUT/PATCH) بسبب انقطاع الشبكة، يُخزَّن الطلب في
// IndexedDB ثم يُعاد إرساله تلقائياً عند عودة الاتصال:
//  - عبر Background Sync API في السيرفس ووركر (حتى لو كان التطبيق مغلقاً).
//  - وعبر OutboxManager عند عودة التطبيق للواجهة / حدث online.
// ---------------------------------------------------------------------------

export const OUTBOX_DB_NAME = "artisan-outbox";
export const OUTBOX_DB_VERSION = 1;
export const OUTBOX_STORE = "requests";
export const BG_SYNC_TAG = "outbox-sync";

/** الحد الأقصى لعدد الإجراءات المنتظرة (حماية من الامتلاء). */
const MAX_OUTBOX_ENTRIES = 60;

export interface OutboxEntry {
  id?: number;
  url: string;
  method: string;
  headers?: Record<string, string>;
  /** جسم الطلب كنص (JSON عادة) — الملفات لا تُدرج في الطابور. */
  body: string | null;
  createdAt: number;
  /** وصف قصير للعرض في الواجهة. */
  label?: string;
}

function openOutboxDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          const store = db.createObjectStore(OUTBOX_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | null> {
  const db = await openOutboxDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OUTBOX_STORE, mode);
      const store = tx.objectStore(OUTBOX_STORE);
      const result = fn(store);
      tx.oncomplete = () => {
        db.close();
        resolve((result as IDBRequest<T>)?.result ?? null);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/** إضافة طلب إلى الطابور (مع سقف أقصى للإدخالات). */
export async function enqueueRequest(entry: Omit<OutboxEntry, "id">): Promise<boolean> {
  // فرض حد أقصى: احذف الأقدم عند التجاوز.
  const count = await getPendingCount();
  if (count >= MAX_OUTBOX_ENTRIES) {
    await trimOldest(count - MAX_OUTBOX_ENTRIES + 1);
  }
  const ok = await withStore("readwrite", (store) => {
    store.add(entry as OutboxEntry);
  });
  notifyCountChange();
  return ok !== null;
}

/** كل الإجراءات المنتظرة (الأحدث أولاً للعرض). */
export async function getPendingEntries(): Promise<OutboxEntry[]> {
  const entries = await withStore<OutboxEntry[]>("readonly", (store) =>
    store.getAll() as IDBRequest<OutboxEntry[]>
  );
  return (entries || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPendingCount(): Promise<number> {
  const count = await withStore<number>("readonly", (store) =>
    store.count()
  );
  return count || 0;
}

async function deleteEntry(id: number): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

async function trimOldest(n: number): Promise<void> {
  const entries = await withStore<OutboxEntry[]>("readonly", (store) =>
    store.getAll() as IDBRequest<OutboxEntry[]>
  );
  if (!entries) return;
  const oldest = entries.sort((a, b) => a.createdAt - b.createdAt).slice(0, n);
  for (const e of oldest) {
    if (e.id != null) await deleteEntry(e.id);
  }
}

export async function clearOutbox(): Promise<void> {
  await withStore("readwrite", (store) => {
    store.clear();
  });
  notifyCountChange();
}

/**
 * إعادة إرسال كل الإجراءات المنتظرة.
 * يُستدعى من OutboxManager (عند online) ومن معالج sync في السيرفس ووركر.
 * الإدخالات التي تفشل بخطأ شبكة تبقى في الطابور؛ أخطاء HTTP النهائية
 * (4xx/5xx) تُحذف حتى لا تُعاد للأبد.
 */
export async function replayOutbox(): Promise<{ sent: number; remaining: number }> {
  const entries = await getPendingEntries();
  let sent = 0;
  for (const entry of [...entries].reverse()) {
    if (entry.id == null) continue;
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body,
      });
      if (res.ok || res.status < 500) {
        await deleteEntry(entry.id);
        if (res.ok) sent++;
      }
      // 5xx → نُبقي الإدخال لإعادة المحاولة لاحقاً.
    } catch {
      // لا شبكة بعد → توقف وأعد المحاولة لاحقاً.
      break;
    }
  }
  const remaining = await getPendingCount();
  notifyCountChange();
  return { sent, remaining };
}

/**
 * fetch مع احتياطي الطابور:
 * يحاول الإرسال مباشرة؛ عند فشل الشبكة للطلبات غير GET يُسجَّل في الطابور
 * ويُعاد إرساله تلقائياً عند العودة. يعيد `{ queued: true }` بدل الفشل.
 */
export async function fetchWithOutbox(
  input: RequestInfo | URL,
  init?: RequestInit & { outboxLabel?: string }
): Promise<Response | { queued: true }> {
  const method = (init?.method || "GET").toUpperCase();
  try {
    return await fetch(input, init);
  } catch (err) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const queueable =
      method !== "GET" &&
      !url.includes("/api/push") && // اشتراكات الإشعارات تُدار بشكل منفصل
      (!init?.body || typeof init.body === "string");
    if (!queueable) throw err;

    const headers: Record<string, string> = {};
    if (init?.headers) {
      new Headers(init.headers as HeadersInit).forEach((v, k) => {
        headers[k] = v;
      });
    }
    await enqueueRequest({
      url,
      method,
      headers,
      body: (init?.body as string) ?? null,
      createdAt: Date.now(),
      label: init?.outboxLabel,
    });
    registerBackgroundSync().catch(() => {});
    return { queued: true };
  }
}

/** تسجيل مزامنة خلفية (يعيد false إذا كانت غير مدعومة). */
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return false;
    const registration = await navigator.serviceWorker.ready;
    const sync = (registration as any).sync;
    if (!sync) return false;
    await sync.register(BG_SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

/* ---------- بثّ تغيّر عدد الإجراءات المنتظرة ---------- */

const COUNT_EVENT = "outbox-count-change";

function notifyCountChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<number>(COUNT_EVENT));
}

/** الاشتراك بتغيّرات عدد الإجراءات المنتظرة (للواجهة). */
export function onOutboxCountChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COUNT_EVENT, cb);
  return () => window.removeEventListener(COUNT_EVENT, cb);
}
