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
  const [rawSpeed] = await Promise.all([measureRawSpeed(), Promise.resolve()]);

  // نعدّل نقاط CPU حسب السرعة المقاسة (إشارة دقيقة لضعف المعالجة)
  const speedAdjustedCores = base.cores * (0.5 + rawSpeed * 0.5);
  const scoreRaw = computeScore({ ...base, cores: speedAdjustedCores });
  const score = Math.max(0, Math.min(100, scoreRaw));
  const tier = tierForScore(score);

  return { ...base, score, tier };
}

/** حقائق سريعة (متزامنة) لعرضها في واجهة الإعدادات. */
export function getDeviceFacts(): Omit<DeviceSignals, "score" | "tier" | "reducedMotion"> {
  const { cores, memory, network, saveData, dpr, isMobile } = collectSignals();
  return { cores, memory, network, saveData, dpr, isMobile };
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
