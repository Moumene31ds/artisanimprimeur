"use client";

// ---------------------------------------------------------------------------
// wakelock.ts — Screen Wake Lock API
// ---------------------------------------------------------------------------
// يمنع تعتيم/إيقاف الشاشة تلقائياً أثناء المهام النشطة:
// مسح رموز QR، معاينة الواقع المعزز، جلسات التصميم الطويلة…
// يعاد الحصول على القفل تلقائياً عند رجوع الصفحة للواجهة (المتصفح يحرره
// عند إخفاء التبويب)، ويُحرَّر عند إلغاء التنشيط.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";

/** هل Wake Lock مدعوم في هذه البيئة؟ */
export function isWakeLockSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "wakeLock" in navigator;
}

/**
 * قفل الشاشة أثناء نشاط معيّن.
 * @param active تفعيل القفل (true) أو تحريره (false)
 */
export function useWakeLock(active: boolean): void {
  const lockRef = useRef<any>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const acquire = async () => {
    try {
      if (!isWakeLockSupported() || !activeRef.current || lockRef.current) return;
      lockRef.current = await (navigator as any).wakeLock.request("screen");
      // المتصفح يُحرر القفل تلقائياً عند إخفاء التبويب → نعيد الطلب عند الرجوع.
      lockRef.current.addEventListener("release", () => {
        if (lockRef.current === null) return;
        lockRef.current = null;
      });
    } catch {
      /* الإذن مرفوض أو غير مدعوم */
    }
  };

  const release = async () => {
    try {
      if (lockRef.current) {
        await lockRef.current.release();
        lockRef.current = null;
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (active) {
      acquire();
    } else {
      release();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && activeRef.current) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
