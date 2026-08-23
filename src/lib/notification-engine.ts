"use client";

// ---------------------------------------------------------------------------
// notification-engine.ts — المحرك الذكي للإشعارات المجانية (100% محلي)
// ---------------------------------------------------------------------------
// ذكاء إشعاري كامل بدون أي خادم أو تكلفة:
//  - احترام تفضيلات المستخدم (فئات، صوت، اهتزاز).
//  - ساعات السكون الليلية: لا صوت ولا اهتزاز ولا toast مزعج.
//  - مراقبة أسعار المفضلة: تنبيه احتفالي عند انخفاض السعر.
//  - منع التكرار (dedup) لكل تنبيه خلال نافذة زمنية.
// ---------------------------------------------------------------------------

import { toast } from "sonner";
import { useAppStore, type NotificationPrefs } from "@/lib/store";

const PRICE_WATCH_KEY = "artisan-price-watch";
export const PRICE_DROP_EVENT = "smart-alert:price-drop";

/** آخر الأسعار المرصودة لكل منتج مفضل. */
type PriceWatchMap = Record<string, number>;

function readPriceWatch(): PriceWatchMap {
  try {
    return JSON.parse(localStorage.getItem(PRICE_WATCH_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePriceWatch(map: PriceWatchMap): void {
  try {
    localStorage.setItem(PRICE_WATCH_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/* ------------------------- ساعات السكون ------------------------- */

function minutesOf(hhmm: string): number {
  const [h, m] = (hhmm || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

/** هل نحن الآن داخل فترة السكون؟ (تدعم الفترة العابرة لمنتصف الليل) */
export function isQuietNow(prefs: NotificationPrefs, now = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = minutesOf(prefs.quietFrom);
  const to = minutesOf(prefs.quietTo);
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

/* ------------------------- إصدار تنبيه ذكي ------------------------- */

interface SmartAlert {
  category: keyof Pick<NotificationPrefs, "orders" | "billing" | "promos" | "system" | "priceDrops">;
  title: string;
  description?: string;
  url?: string;
  /** أيقونة emoji تُعرض في بداية العنوان. */
  emoji?: string;
}

const DEDUP_WINDOW_MS = 30 * 60 * 1000; // نفس التنبيه مرة كل 30 دقيقة
let lastAlerts: Record<string, number> = {};

/**
 * إصدار تنبيه عبر القنوات المسموحة فقط:
 * الفئة معطلة → يُهمل تماماً. سكون → بدون صوت/اهتزاز.
 */
export function emitSmartAlert(alert: SmartAlert): void {
  const state = useAppStore.getState();
  if (!state.notificationsEnabled) return;
  if (!state.notificationPrefs[alert.category]) return;

  // منع التكرار
  const key = `${alert.category}:${alert.title}`;
  const last = lastAlerts[key] || 0;
  if (Date.now() - last < DEDUP_WINDOW_MS) return;
  lastAlerts[key] = Date.now();

  const quiet = isQuietNow(state.notificationPrefs);
  const title = alert.emoji ? `${alert.emoji} ${alert.title}` : alert.title;

  if (!quiet && state.notificationPrefs.sound) {
    try {
      // استيراد ديناميكي: نغمة الإشعار المشتركة في التطبيق.
      import("@/lib/utils").then((m) => m.playNotificationSound()).catch(() => {});
    } catch {
      /* ignore */
    }
  }
  if (!quiet && state.notificationPrefs.vibration) {
    try {
      navigator.vibrate?.([80, 40, 80]);
    } catch {
      /* ignore */
    }
  }

  toast(title, {
    description: alert.description,
    duration: quiet ? 3500 : 6000,
  });
}

/* ---------------------- مراقبة أسعار المفضلة ---------------------- */

export interface PriceDropResult {
  productId: string | number;
  name: string;
  oldPrice: number;
  newPrice: number;
  image?: string;
  dropPercent: number;
}

/**
 * مسح المفضلة بحثاً عن انخفاضات الأسعار منذ آخر مشاهدة.
 * الحد الأدنى للتنبيه: انخفاض ≥ 3% و≥ 20 دج (لتجنب الضجيج).
 */
export function scanFavoritePriceDrops(): PriceDropResult[] {
  const { favorites, notificationPrefs, notificationsEnabled } = useAppStore.getState();
  if (!notificationsEnabled || !notificationPrefs.priceDrops || !favorites?.length) {
    return [];
  }

  const watched = readPriceWatch();
  const drops: PriceDropResult[] = [];

  for (const fav of favorites) {
    const price = Number(fav.price) || 0;
    if (price <= 0) continue;
    const id = String(fav.id);
    const seen = watched[id];

    if (seen !== undefined && price < seen) {
      const dropPercent = ((seen - price) / seen) * 100;
      if (dropPercent >= 3 && seen - price >= 20) {
        drops.push({
          productId: fav.id,
          name: fav.name,
          oldPrice: seen,
          newPrice: price,
          image: fav.image,
          dropPercent: Math.round(dropPercent),
        });
      }
    }
    // تحديث الرصد دائماً لأحدث سعر.
    watched[id] = price;
  }

  writePriceWatch(watched);
  return drops;
}

/** إطلاق تنبيهات انخفاض الأسعار (يستخدم scanFavoritePriceDrops). */
export function announcePriceDrops(drops: PriceDropResult[]): void {
  for (const drop of drops.slice(0, 3)) {
    emitSmartAlert({
      category: "priceDrops",
      title: `انخفض سعر ${drop.name}!`,
      description: `من ${drop.oldPrice.toLocaleString()} إلى ${drop.newPrice.toLocaleString()} دج — وفّر ${drop.dropPercent}% 🎉`,
      url: `/`,
      emoji: "🏷️",
    });
    // حفيف احتفالي صغير (canvas-confetti متوفرة أصلاً).
    if (!isQuietNow(useAppStore.getState().notificationPrefs)) {
      import("canvas-confetti")
        .then((confetti) =>
          confetti.default({
            particleCount: 45,
            spread: 55,
            startVelocity: 28,
            origin: { y: 0.75 },
            colors: ["#10b981", "#3b82f6", "#f59e0b"],
            disableForReducedMotion: true,
          })
        )
        .catch(() => {});
    }
  }

  if (drops.length > 0) {
    try {
      window.dispatchEvent(
        new CustomEvent(PRICE_DROP_EVENT, { detail: drops.length })
      );
    } catch {
      /* ignore */
    }
  }
}
