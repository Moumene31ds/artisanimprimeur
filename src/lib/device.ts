// src/lib/device.ts
// كشف ذكي لقدرات الجهاز: يجمع إشارات متعددة (CPU، RAM، الشبكة، الشاشة، توفير البيانات)
// ويحسب نقاط أداء (0-100) ثم يصنف الجهاز إلى: ضعيف / متوسط / قوي.

export type DeviceTier = "weak" | "medium" | "powerful";

export interface DeviceSignals {
  cores: number;
  memory: number | null;
  network: string;
  saveData: boolean;
  dpr: number;
  isMobile: boolean;
  reducedMotion: boolean;
  batteryLevel: number | null;
  charging: boolean | null;
  score: number;
  tier: DeviceTier;
}

const NETWORK_POINTS: Record<string, number> = {
  "slow-2g": 2,
  "2g": 4,
  "3g": 9,
  "4g": 16,
  "5g": 18,
};

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(ua);
}

/** قياس "الأداء" الخام عبر اختبار قصير (سرعة معالجة JS). */
function measureRawSpeed(): Promise<number> {
  return new Promise((resolve) => {
    try {
      const start = performance.now();
      let x = 0;
      for (let i = 0; i < 2_000_000; i++) x += Math.sqrt(i);
      const elapsed = performance.now() - start;
      // كلما كانت المدة أقصر كان الجهاز أسرع (نتيجة 0-1)
      const speed = Math.max(0, Math.min(1, 1 - elapsed / 600));
      resolve(speed);
    } catch {
      resolve(0.5);
    }
  });
}

/** جلب الإشارات المتاحة من المتصفح بأمان. */
function collectSignals(): Omit<DeviceSignals, "score" | "tier"> {
  let memory: number | null = null;
  let cores = 4;
  let network = "";
  let saveData = false;
  let dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  let reducedMotion = false;

  try {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
      connection?: { effectiveType?: string; saveData?: boolean };
    };
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0) {
      cores = nav.hardwareConcurrency;
    }
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0) {
      memory = nav.deviceMemory;
    }
    network = nav.connection?.effectiveType ?? "";
    saveData = nav.connection?.saveData ?? false;
  } catch {
    /* تجاهل */
  }

  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reducedMotion = true;
    }
  } catch {
    /* تجاهل */
  }

  return {
    cores,
    memory,
    network,
    saveData,
    dpr,
    isMobile: isMobileUA(),
    reducedMotion,
    batteryLevel: null,
    charging: null,
  };
}

/** حساب نقاط الأداء (0-100) من الإشارات المجمعة. */
function computeScore(signals: Omit<DeviceSignals, "score" | "tier">): number {
  const mobile = signals.isMobile;

  // CPU (0-30): 8 أنوية أو أكثر = كامل النقاط
  const cpu = Math.min(30, (Math.max(1, signals.cores) / 8) * 30);

  // الذاكرة (0-30): 8GB+ = كامل النقاط
  const mem = signals.memory ?? (mobile ? 4 : 8);
  const ram = Math.min(30, (mem / 8) * 30);

  // الشبكة (0-20)
  const net = NETWORK_POINTS[signals.network] ?? (mobile ? 8 : 14);

  // الشاشة (0-10): DPR منخفض = شاشة اقتصادية
  const screen = signals.dpr <= 1 ? 10 : signals.dpr <= 1.5 ? 8 : signals.dpr <= 2.5 ? 6 : 4;

  // توفير البيانات (0-10)
  const save = signals.saveData ? 2 : 10;

  return Math.round(Math.max(0, Math.min(100, cpu + ram + net + screen + save)));
}

/** تصنيف الجهاز حسب النقاط. */
export function tierForScore(score: number): DeviceTier {
  if (score < 45) return "weak";
  if (score <= 70) return "medium";
  return "powerful";
}

/** فحص شامل للجهاز: إشارات + نقاط + تصنيف. */
export async function detectDevice(): Promise<DeviceSignals> {
  const base = collectSignals();
  const [rawSpeed, battery] = await Promise.all([measureRawSpeed(), getBatteryInfo()]);

  // نعدّل نقاط CPU حسب السرعة المقاسة (إشارة دقيقة لضعف المعالجة)
  const speedAdjustedCores = base.cores * (0.5 + rawSpeed * 0.5);
  const scoreRaw = computeScore({ ...base, cores: speedAdjustedCores });
  const score = Math.max(0, Math.min(100, scoreRaw));
  const tier = tierForScore(score);

  return {
    ...base,
    batteryLevel: battery?.level ?? null,
    charging: battery?.charging ?? null,
    score,
    tier,
  };
}

/** حقائق سريعة (متزامنة) لعرضها في واجهة الإعدادات. */
export function getDeviceFacts(): Omit<DeviceSignals, "score" | "tier" | "reducedMotion"> {
  const { cores, memory, network, saveData, dpr, isMobile, batteryLevel, charging } = collectSignals();
  return { cores, memory, network, saveData, dpr, isMobile, batteryLevel, charging };
}

/** وصف نصي قصير لكل فئة للعرض. */
export function describeDevice(tier: DeviceTier): { ar: string; fr: string } {
  switch (tier) {
    case "weak":
      return {
        ar: "جهاز ذو إمكانيات محدودة — تفعيل وضع الأداء ينصح به",
        fr: "Appareil modeste — le mode performance est recommandé",
      };
    case "medium":
      return {
        ar: "جهاز متوسط الإمكانيات — أداء متوازن",
        fr: "Appareil intermédiaire — performances équilibrées",
      };
    default:
      return {
        ar: "جهاز قوي — كل الميزات متاحة",
        fr: "Appareil puissant — toutes les options disponibles",
      };
  }
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
}

/** قراءة حالة البطارية بأمان (قد تكون غير مدعومة). */
export async function getBatteryInfo(): Promise<BatteryInfo | null> {
  if (typeof navigator === "undefined" || !("getBattery" in navigator)) return null;
  try {
    const battery = await (navigator as any).getBattery();
    return { level: battery?.level ?? null, charging: !!battery?.charging };
  } catch {
    return null;
  }
}

export interface DeviceRecommendation {
  id: string;
  suggested: boolean;
  ar: string;
  fr: string;
}

/** توصيات تطبيقية مخصصة حسب فئة الجهاز. */
export function getRecommendations(tier: DeviceTier): DeviceRecommendation[] {
  switch (tier) {
    case "weak":
      return [
        { id: "performance", suggested: true, ar: "تفعيل وضع الأداء", fr: "Activer le mode performance" },
        { id: "animations", suggested: true, ar: "إيقاف الحركات والانتقالات", fr: "Désactiver les animations" },
        { id: "effects", suggested: true, ar: "إيقاف التأثيرات الزخرفية والتمويه", fr: "Couper effets décoratifs & flou" },
        { id: "haptics", suggested: true, ar: "إيقاف الاهتزازات لتوفير البطارية", fr: "Couper les vibrations (batterie)" },
        { id: "fonts", suggested: false, ar: "حجم خط قياسي للوضوح", fr: "Taille de texte standard" },
      ];
    case "medium":
      return [
        { id: "blur", suggested: true, ar: "تقليل التمويه لسلاسة أفضل", fr: "Réduire le flou pour la fluidité" },
        { id: "haptics", suggested: true, ar: "اهتزازات خفيفة (اقتصادية)", fr: "Vibrations légères (économes)" },
        { id: "effects", suggested: false, ar: "التأثيرات الزخرفية متاحة", fr: "Effets décoratifs disponibles" },
        { id: "performance", suggested: false, ar: "وضع الأداء اختياري", fr: "Mode performance optionnel" },
      ];
    default:
      return [
        { id: "quality", suggested: true, ar: "صور عالية الجودة", fr: "Images haute qualité" },
        { id: "effects", suggested: true, ar: "كل التأثيرات الزخرفية متاحة", fr: "Tous les effets décoratifs" },
        { id: "animations", suggested: true, ar: "حركات وانتقالات كاملة", fr: "Animations complètes" },
      ];
  }
}

/** تقدير توفير البطارية عند تطبيق التوصيات. */
export function estimateBatterySavings(tier: DeviceTier): { ar: string; fr: string; pct: number } {
  switch (tier) {
    case "weak":
      return { ar: "حتى ~25% توفير في البطارية بتطبيق التوصيات", fr: "jusqu'à ~25% de batterie économisée", pct: 25 };
    case "medium":
      return { ar: "حتى ~12% توفير في البطارية", fr: "jusqu'à ~12% de batterie économisée", pct: 12 };
    default:
      return { ar: "استهلاك بطارية متوازن", fr: "consommation de batterie équilibrée", pct: 5 };
  }
}

/**
 * مراقبة تغيّرات الجهاز ليتحسّن التصنيف تلقائياً:
 * - تغيّر نوع الشبكة (3g → 4g …) عبر navigator.connection
 * - اتصال/انقطاع الإنترنت (online / offline)
 * - عودة التركيز على التبويب
 * - إعادة فحص دورية كل 5 دقائق
 * ترجع دالة تنظيف.
 */
export function watchDeviceChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const conn = (navigator as any).connection;
  const onNet = () => callback();
  const onFocus = () => {
    if (document.visibilityState === "visible") callback();
  };
  if (conn?.addEventListener) {
    try {
      conn.addEventListener("change", onNet);
    } catch {
      /* ignore */
    }
  }
  window.addEventListener("online", onNet);
  window.addEventListener("offline", onNet);
  window.addEventListener("focus", onFocus);
  const interval = window.setInterval(onNet, 5 * 60 * 1000);
  return () => {
    if (conn?.removeEventListener) {
      try {
        conn.removeEventListener("change", onNet);
      } catch {
        /* ignore */
      }
    }
    window.removeEventListener("online", onNet);
    window.removeEventListener("offline", onNet);
    window.removeEventListener("focus", onFocus);
    window.clearInterval(interval);
  };
}
