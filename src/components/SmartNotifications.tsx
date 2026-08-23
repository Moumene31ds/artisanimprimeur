"use client";

// ---------------------------------------------------------------------------
// SmartNotifications — تشغيل المحرك الذكي للإشعارات محلياً
// ---------------------------------------------------------------------------
// - مسح أسعار المفضلة عند الإقلاع + كل 10 دقائق + عند تغيّر المفضلة.
// - أول زيارة تنشئ خط الأساس فقط (لا إزعاج).
// ---------------------------------------------------------------------------

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import {
  announcePriceDrops,
  scanFavoritePriceDrops,
} from "@/lib/notification-engine";

export default function SmartNotifications() {
  useEffect(() => {
    const runScan = () => {
      try {
        const drops = scanFavoritePriceDrops();
        if (drops.length > 0) announcePriceDrops(drops);
      } catch {
        /* ignore */
      }
    };

    // مسح أولي بعد قليل (بعد ترطيب المخزن) — يبني خط الأساس في أول زيارة.
    const initial = setTimeout(runScan, 4000);
    const interval = setInterval(runScan, 10 * 60 * 1000);

    // عند تعديل المفضلة → امسح بعد استقرار القائمة.
    let favTimer: ReturnType<typeof setTimeout> | undefined;
    let prevFavs = useAppStore.getState().favorites;
    const unsub = useAppStore.subscribe((state) => {
      if (state.favorites !== prevFavs) {
        prevFavs = state.favorites;
        clearTimeout(favTimer);
        favTimer = setTimeout(runScan, 2500);
      }
    });

    return () => {
      clearTimeout(initial);
      clearTimeout(favTimer);
      clearInterval(interval);
      unsub();
    };
  }, []);

  return null;
}
