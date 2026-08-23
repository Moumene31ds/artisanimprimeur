"use client";

// ---------------------------------------------------------------------------
// background-fetch.ts — رفع ملفات التصميم الكبيرة بالخلفية
// ---------------------------------------------------------------------------
// عند فشل رفع عادي بسبب الشبكة (أو لملفات ضخمة)، يُسجَّل الرفع عبر
// Background Fetch API فيستمر حتى مع إغلاق التبويب، مع شريط تقدم نظامي.
// عند الاكتمال يُخزَّن الجواب في Cache Storage بواسطة السيرفس ووركر ويُبثّ
// للنوافذ المفتوحة؛ وعند العودة يُقرأ من الذاكرة تلقائياً (استعادة).
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { isBackgroundFetchSupported } from "@/lib/capabilities";

const PENDING_KEY = "bg-uploads-pending";
const RESULT_CACHE = "artisan-bgfetch-v9";

export interface PendingUpload {
  id: string;
  createdAt: number;
  /** بيانات سياقية يعيدها المستهلك عند اكتمال الرفع (مثل أبعاد الصورة). */
  meta?: Record<string, unknown>;
}

function readPending(): Record<string, PendingUpload> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePending(map: Record<string, PendingUpload>): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** بدء رفع خلفي إلى /api/upload (JSON {file:dataUrl}). */
export async function startBackgroundUpload(
  dataUrl: string,
  meta?: Record<string, unknown>
): Promise<string | null> {
  if (!isBackgroundFetchSupported()) return null;
  try {
    const registration: any = await navigator.serviceWorker.ready;
    const bgFetch = registration.backgroundFetch;
    if (!bgFetch) return null;

    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await bgFetch.fetch(
      id,
      new Request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUrl }),
      })
    );

    const pending = readPending();
    pending[id] = { id, createdAt: Date.now(), meta };
    writePending(pending);
    return id;
  } catch {
    return null;
  }
}

/**
 * هوك متابعة نتائج الرفع الخلفي:
 * - يستقبل رسائل السيرفس ووركر الفورية (الصفحة مفتوحة).
 * - وعند الإقلاع يفحص السجلات المعلقة وينهي ما اكتمل غياباً (استعادة).
 */
export function useBackgroundUploadResult(
  onResult: (id: string, data: any | null, meta?: Record<string, unknown>) => void
): void {
  useEffect(() => {
    const handlerRef = { current: onResult };
    handlerRef.current = onResult;

    const finish = async (id: string, ok: boolean) => {
      const pending = readPending();
      const record = pending[id];
      if (!record) return; // رسالة غير معنية بنا.
      delete pending[id];
      writePending(pending);
      if (!ok) {
        handlerRef.current(id, null, record.meta);
        return;
      }
      try {
        const cache = await caches.open(RESULT_CACHE);
        const res = await cache.match(`/__bgfetch/${id}`);
        await cache.delete(`/__bgfetch/${id}`);
        const data = res ? await res.json() : null;
        handlerRef.current(id, data, record.meta);
      } catch {
        handlerRef.current(id, null, record.meta);
      }
    };

    // 1) رسائل مباشرة من السيرفس ووركر.
    let unsubMsg: (() => void) | undefined;
    if ("serviceWorker" in navigator) {
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === "BG_FETCH_DONE") finish(event.data.id, Boolean(event.data.ok));
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
      unsubMsg = () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }

    // 2) استعادة السجلات التي اكتملت أثناء الغياب.
    const recover = async () => {
      if (!isBackgroundFetchSupported()) return;
      try {
        const registration: any = await navigator.serviceWorker.ready;
        if (!registration.backgroundFetch) return;
        const pending = readPending();
        for (const id of Object.keys(pending)) {
          const reg = await registration.backgroundFetch.get(id);
          if (!reg) {
            // سجل غير موجود (أُلغى/فُقد) → نظّفه.
            delete pending[id];
            writePending(pending);
            continue;
          }
          if (reg.result === "success") finish(id, true);
          else if (reg.result === "failure") finish(id, false);
        }
      } catch {
        /* ignore */
      }
    };
    recover();

    return () => unsubMsg?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
