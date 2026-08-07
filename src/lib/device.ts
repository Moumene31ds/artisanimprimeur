// src/lib/device.ts
// نظام الكشف الذكي المتقدم (v2): يجمع إشارات الأجهزة (CPU، RAM، الشبكة، الشاشة، البطارية)
// مع قياسات حقيقية (معيار JS، معدل إطارات العرض، زمن استجابة الشبكة)
// ثم يحسب نقاط أداء موثقة (0-100) عبر 6 عوامل مرجّحة + مؤشر ثقة (مدى تأكيد التحليل).

export type DeviceTier = "weak" | "medium" | "powerful";
export type FactorId = "cpu" | "memory" | "network" | "render" | "device" | "battery";

export interface DeviceFactor {
  id: FactorId;
  label: { ar: string; fr: string };
  score: number; // 0-100 (درجة العامل الفرعية)
  weight: number; // 0..1 (وزن العامل في المجموع)
  measured: boolean; // قِيس مباشرة أم قُدِّر
  detail: { ar: string; fr: string };
}

export interface DeviceSignals {
  cores: number;
  memory: number | null;
  network: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  dpr: number;
  screenWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  reducedMotion: boolean;
  batteryLevel: number | null;
  charging: boolean | null;
  jsMs: number | null; // نتيجة معيار المعالجة (معيَّرة لكل مليون عملية)
  fps: number | null; // متوسط إطارات العرض المقاس
  latencyMs: number | null; // زمن استجابة الشبكة المقاس
  factors: DeviceFactor[]; // تفصيل كل عامل
  score: number; // النقاط النهائية 0-100
  tier: DeviceTier;
  confidence: number; // 0-100 نسبة القياسات المباشرة من مجموع الوزن
  testedAt: number;
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
}

export interface DeviceFacts {
  cores: number;
  memory: number | null;
  network: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  dpr: number;
  isMobile: boolean;
  isTablet: boolean;
}

const LABELS: Record<FactorId, { ar: string; fr: string }> = {
  cpu: { ar: "المعالج", fr: "Processeur" },
  memory: { ar: "الذاكرة", fr: "Mémoire" },
  network: { ar: "الشبكة", fr: "Réseau" },
  render: { ar: "سلاسة العرض", fr: "Affichage" },
  device: { ar: "فئة الجهاز", fr: "Classe de l'appareil" },
  battery: { ar: "البطارية", fr: "Batterie" },
};

// جداول التحويل (مدخل ← نقاط 0-100) بفواصل متوسّطة
const CORE_POINTS: [number, number][] = [[1, 15], [2, 35], [3, 50], [4, 60], [6, 75], [8, 85], [12, 92], [16, 98]];
const MEM_POINTS: [number, number][] = [[0.5, 10], [1, 25], [2, 42], [4, 60], [6, 75], [8, 85], [12, 95]];
const DL_POINTS: [number, number][] = [[0.2, 5], [0.5, 15], [1, 35], [2, 55], [3, 68], [5, 82], [10, 92], [25, 97]];
const RTT_POINTS: [number, number][] = [[1500, 5], [1000, 20], [500, 45], [250, 65], [150, 80], [80, 90], [40, 97]];
const LAT_POINTS: [number, number][] = [[3000, 5], [2000, 20], [1000, 45], [500, 65], [200, 82], [80, 92], [30, 97]];
const BAT_POINTS: [number, number][] = [[0, 20], [10, 35], [25, 50], [50, 70], [75, 85], [100, 95]];
const FPS_RATIO_POINTS: [number, number][] = [[0.1, 10], [0.25, 25], [0.4, 40], [0.55, 55], [0.7, 70], [0.85, 85], [1.0, 100]];
// زمن معيار المعالجة (بالمللي ثانية لكل مليون وحدة عمل) ← نقاط
const JS_POINTS: [number, number][] = [
  [20, 100], [35, 94], [50, 86], [70, 78], [100, 68], [150, 58],
  [220, 48], [320, 38], [460, 30], [650, 23], [900, 17], [1300, 12],
  [1800, 8], [2600, 5],
];

const EFF_POINTS: Record<string, number> = {
  "slow-2g": 10, "2g": 25, "3g": 55, "4g": 82, "5g": 95,
};

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

/** استيفاء خطي بين نقاط (قد تكون تصاعدية أو تنازلية). */
function lerpScore(value: number, points: [number, number][]): number {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    if (value >= lo && value <= hi) {
      const t = x2 === x1 ? 0 : (value - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }
  const [loPt, hiPt] = points.reduce<[[number, number], [number, number]]>(
    (acc, p) => {
      if (p[0] < acc[0][0]) acc[0] = p;
      if (p[0] > acc[1][0]) acc[1] = p;
      return acc;
    },
    [points[0], points[0]]
  );
  return value < loPt[0] ? loPt[1] : hiPt[1];
}

interface CollectedSignals {
  cores: number;
  memory: number | null;
  network: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  dpr: number;
  screenWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  reducedMotion: boolean;
  batteryLevel: number | null;
  charging: boolean | null;
}

/** جمع إشارات الأجهزة المتاحة من المتصفح بأمان (متزامن). */
function collectSignals(): CollectedSignals {
  let memory: number | null = null;
  let cores = 4;
  let network = "";
  let downlink: number | null = null;
  let rtt: number | null = null;
  let saveData = false;
  let dpr = 1;
  let screenWidth = 0;
  let reducedMotion = false;

  try {
    if (typeof window !== "undefined") {
      dpr = window.devicePixelRatio || 1;
      screenWidth = window.screen?.width || window.innerWidth || 0;
    }
  } catch {
    /* ignore */
  }

  try {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
        saveData?: boolean;
      };
    };
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0) {
      cores = nav.hardwareConcurrency;
    }
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0) {
      memory = nav.deviceMemory;
    }
    network = nav.connection?.effectiveType ?? "";
    downlink = typeof nav.connection?.downlink === "number" ? nav.connection.downlink : null;
    rtt = typeof nav.connection?.rtt === "number" ? nav.connection.rtt : null;
    saveData = nav.connection?.saveData ?? false;
  } catch {
    /* ignore */
  }

  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reducedMotion = true;
    }
  } catch {
    /* ignore */
  }

  return {
    cores,
    memory,
    network,
    downlink,
    rtt,
    saveData,
    dpr,
    screenWidth,
    isMobile: isMobileUA(false),
    isTablet: isMobileUA(true),
    reducedMotion,
    batteryLevel: null,
    charging: null,
  };
}

/** كشف نوع الجهاز من وكيل المتصفح (tablet=true للوحيات). */
function isMobileUA(tabletOnly: boolean): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (tabletOnly) return /iPad|Tablet|PlayBook|Silk/i.test(ua);
  return /Mobi|Android|iPhone|iPod/i.test(ua);
}

/** عبء عمل المعالج (متزامن): عدد صحيح + فاصلة عائمة + مصفوفات. */
function runJsWorkload(units: number): void {
  let acc = 0;
  for (let i = 0; i < units; i++) {
    acc += i * 2654435761;
    acc = (acc ^ (acc >>> 15)) >>> 0;
  }
  let f = 1.0001;
  for (let i = 0; i < units; i++) f = Math.sqrt(f + i * 1e-9) * 1.0000001 + 0.01;
  const n = Math.min(50000, units * 4);
  const arr = new Float64Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.sin(i * 0.005);
  let s = 0;
  for (let i = 0; i < n; i++) s += arr[i];
  void (acc + f + s);
}

/**
 * معيار معالجة: عينة إحماء ثم عدة عينات، وسيط النتائج.
 * يرجع زمن معيَّراً لكل مليون وحدة عمل (مقارن بغض النظر عن وضع خفيف/كامل).
 */
async function runJsBenchmark(light: boolean): Promise<{ ms: number | null }> {
  if (typeof performance === "undefined") return { ms: null };
  const units = light ? 250000 : 1000000;
  const target = light ? 3 : 5;
  const deadline = Date.now() + (light ? 800 : 1600);
  const samples: number[] = [];
  try {
    runJsWorkload(units); // إحماء المحوّل
    while (samples.length < target && Date.now() < deadline) {
      const t = performance.now();
      runJsWorkload(units);
      samples.push(performance.now() - t);
    }
    if (!samples.length) return { ms: null };
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    return { ms: median * (1000000 / units) };
  } catch {
    return { ms: null };
  }
}

/** قياس متوسط إطارات العرض عبر requestAnimationFrame (يرجع null عند الإخفاق). */
async function measureRender(maxMs = 700): Promise<{ fps: number } | null> {
  if (typeof document === "undefined" || typeof window === "undefined") return null;
  try {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "fixed",
      top: "-10000px",
      left: "-10000px",
      width: "2px",
      height: "2px",
      opacity: "0",
      pointerEvents: "none",
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    const start = performance.now();
    let frames = 0;
    let rafId = 0;
    let stopped = false;
    const step = () => {
      if (stopped) return;
      frames++;
      el.style.transform = `translateX(${(frames % 40) * 0.5}px)`;
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    await new Promise((resolve) => setTimeout(resolve, maxMs));
    stopped = true;
    cancelAnimationFrame(rafId);
    el.remove();
    const elapsed = (performance.now() - start) / 1000;
    if (elapsed <= 0 || frames < 5) return null;
    return { fps: frames / elapsed };
  } catch {
    return null;
  }
}

/** قياس زمن استجابة الشبكة (وسيط عدة محاولات مع مهلة). */
async function measureLatency(repeats = 3): Promise<number | null> {
  if (typeof window === "undefined" || typeof fetch === "undefined") return null;
  const samples: number[] = [];
  for (let i = 0; i < repeats; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const t0 = performance.now();
    try {
      await fetch(`/manifest.json?_lat=${Date.now()}-${i}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      samples.push(performance.now() - t0);
    } catch {
      /* ignore */
    } finally {
      clearTimeout(timer);
    }
  }
  if (!samples.length) return null;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

/** حساب درجات العوامل الستة المرجّحة. */
function computeFactors(
  base: CollectedSignals,
  js: { ms: number | null },
  render: { fps: number | null } | null,
  latency: number | null
): DeviceFactor[] {
  // --- المعالج (وزن 30%) ---
  const specCpu = lerpScore(base.cores, CORE_POINTS);
  const jsScore = js.ms != null ? lerpScore(js.ms, JS_POINTS) : null;
  const cpuMeasured = js.ms != null;
  const cpuScore = cpuMeasured && jsScore != null ? clamp(0.7 * jsScore + 0.3 * specCpu) : specCpu;
  const cpuDetail: { ar: string; fr: string } = cpuMeasured
    ? { ar: `معالجة ${js.ms!.toFixed(0)}ms · ${base.cores} نواة`, fr: `${js.ms!.toFixed(0)}ms de calcul · ${base.cores} cœurs` }
    : { ar: `${base.cores} نواة (تقديري)`, fr: `${base.cores} cœurs (estimation)` };

  // --- الذاكرة (وزن 15%) ---
  let memScore: number;
  let memMeasured: boolean;
  let memDetail: { ar: string; fr: string };
  if (base.memory != null) {
    memScore = lerpScore(base.memory, MEM_POINTS);
    memMeasured = true;
    memDetail = { ar: `${base.memory} GB حقيقية`, fr: `${base.memory} Go réels` };
  } else {
    memScore = base.isMobile ? 55 : 82;
    memMeasured = false;
    memDetail = { ar: base.isMobile ? "≈4 GB مُقدَّرة" : "≈8 GB مُقدَّرة", fr: base.isMobile ? "≈4 Go estimés" : "≈8 Go estimés" };
  }

  // --- الشبكة (وزن 20%) ---
  const effScore = base.network ? EFF_POINTS[base.network] ?? null : null;
  const dlScore = base.downlink != null ? lerpScore(base.downlink, DL_POINTS) : null;
  const rttScore = base.rtt != null ? lerpScore(base.rtt, RTT_POINTS) : latency != null ? lerpScore(latency, LAT_POINTS) : null;
  let netScore: number;
  let netMeasured: boolean;
  if (effScore != null && (dlScore != null || rttScore != null)) {
    netScore = clamp(0.5 * effScore + 0.3 * (dlScore ?? 60) + 0.2 * (rttScore ?? 60));
    netMeasured = true;
  } else if (latency != null) {
    netScore = lerpScore(latency, LAT_POINTS);
    netMeasured = true;
  } else if (effScore != null) {
    netScore = effScore;
    netMeasured = true;
  } else {
    netScore = base.isMobile ? 50 : 68;
    netMeasured = false;
  }
  if (base.saveData) netScore = clamp(netScore - 15);
  const netMs = base.rtt ?? latency;
  const netBits = [
    base.network && base.network.toUpperCase(),
    base.downlink != null ? `${base.downlink} Mb/s` : null,
    netMs != null ? `${Math.round(netMs)}ms` : null,
  ].filter(Boolean).join(" · ");
  const netDetail: { ar: string; fr: string } = {
    ar: netBits || (netMeasured ? "مقاس" : "تقديري"),
    fr: netBits || (netMeasured ? "mesuré" : "estimé"),
  };

  // --- سلاسة العرض (وزن 15%) ---
  let renScore: number;
  let renMeasured: boolean;
  let renDetail: { ar: string; fr: string };
  if (render && render.fps != null) {
    const ratio = clamp(render.fps / 60, 0, 1.25);
    renScore = clamp(lerpScore(ratio, FPS_RATIO_POINTS));
    renMeasured = true;
    renDetail = { ar: `${render.fps.toFixed(0)} إطار/ث (مقاس)`, fr: `${render.fps.toFixed(0)} ips (mesuré)` };
  } else {
    renScore = base.dpr <= 1 ? 72 : base.dpr <= 2 ? 62 : 52;
    renMeasured = false;
    renDetail = { ar: "مُقدَّر من الشاشة", fr: "estimé d'après l'écran" };
  }

  // --- فئة الجهاز (وزن 10%) ---
  const devScore = base.isTablet ? 75 : !base.isMobile ? (base.dpr <= 1 ? 90 : 82) : base.dpr > 2 ? 58 : 66;
  const devDetail: { ar: string; fr: string } = {
    ar: base.isTablet ? "جهاز لوحي" : base.isMobile ? "هاتف" : "حاسوب",
    fr: base.isTablet ? "Tablette" : base.isMobile ? "Téléphone" : "Ordinateur",
  };

  // --- البطارية (وزن 10%) ---
  let batScore: number;
  let batMeasured: boolean;
  let batDetail: { ar: string; fr: string };
  if (base.batteryLevel != null) {
    const levelPct = base.batteryLevel * 100;
    batScore = clamp(lerpScore(levelPct, BAT_POINTS) + (base.charging ? 8 : 0));
    batMeasured = true;
    batDetail = {
      ar: `${Math.round(levelPct)}%${base.charging ? " · يشحن" : ""}`,
      fr: `${Math.round(levelPct)}%${base.charging ? " · en charge" : ""}`,
    };
  } else {
    batScore = 72;
    batMeasured = false;
    batDetail = { ar: "غير متاح في المتصفح", fr: "non disponible" };
  }

  return [
    { id: "cpu", label: LABELS.cpu, score: Math.round(cpuScore), weight: 0.3, measured: cpuMeasured, detail: cpuDetail },
    { id: "memory", label: LABELS.memory, score: Math.round(memScore), weight: 0.15, measured: memMeasured, detail: memDetail },
    { id: "network", label: LABELS.network, score: Math.round(netScore), weight: 0.2, measured: netMeasured, detail: netDetail },
    { id: "render", label: LABELS.render, score: Math.round(renScore), weight: 0.15, measured: renMeasured, detail: renDetail },
    { id: "device", label: LABELS.device, score: devScore, weight: 0.1, measured: true, detail: devDetail },
    { id: "battery", label: LABELS.battery, score: Math.round(batScore), weight: 0.1, measured: batMeasured, detail: batDetail },
  ];
}

/** تصنيف الجهاز حسب النقاط النهائية. */
export function tierForScore(score: number): DeviceTier {
  if (score < 45) return "weak";
  if (score <= 70) return "medium";
  return "powerful";
}

export interface DetectOptions {
  full?: boolean; // true = قياسات كاملة (عرض + شبكة)؛ false = فحص سريع
  prev?: DeviceSignals | null; // نتائج سابقة للاحتفاظ بقياسات العرض/الشبكة في الفحص السريع
}

/**
 * الفحص الشامل: إشارات + معيار معالجة + (عرض وشبكة في الوضع الكامل)
 * → عوامل مرجّحة + نقاط 0-100 + تصنيف + مؤشر ثقة.
 */
export async function detectDevice(opts: DetectOptions = {}): Promise<DeviceSignals> {
  const full = !!opts.full;
  const base = collectSignals();
  const [js, battery, render, latency] = await Promise.all([
    runJsBenchmark(!full),
    getBatteryInfo(),
    full ? measureRender(700) : opts.prev?.fps ? Promise.resolve({ fps: opts.prev.fps }) : Promise.resolve(null),
    full ? measureLatency(3) : Promise.resolve(opts.prev?.latencyMs ?? null),
  ]);

  const merged: CollectedSignals = {
    ...base,
    batteryLevel: battery?.level ?? null,
    charging: battery?.charging ?? null,
  };

  const factors = computeFactors(merged, js, render, latency);
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
  const tier = tierForScore(score);
  const confidence = Math.round((factors.reduce((s, f) => s + (f.measured ? f.weight : 0), 0) / totalWeight) * 100);

  return {
    ...merged,
    jsMs: js.ms,
    fps: render?.fps ?? null,
    latencyMs: latency,
    factors,
    score,
    tier,
    confidence,
    testedAt: Date.now(),
  };
}

/** حقائق سريعة (متزامنة) لعرضها في واجهة الإعدادات. */
export function getDeviceFacts(): DeviceFacts {
  const { cores, memory, network, downlink, rtt, saveData, dpr, isMobile, isTablet } = collectSignals();
  return { cores, memory, network, downlink, rtt, saveData, dpr, isMobile, isTablet };
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

export interface ConfidenceInfo {
  level: "high" | "medium" | "low";
  ar: string;
  fr: string;
}

/** وصف مستوى الثقة في النقاط حسب نسبة القياسات المباشرة. */
export function getConfidenceInfo(confidence: number): ConfidenceInfo {
  if (confidence >= 75) {
    return { level: "high", ar: "تحليل موثوق — قياسات مباشرة", fr: "Analyse fiable — mesures directes" };
  }
  if (confidence >= 45) {
    return { level: "medium", ar: "موثوقية متوسطة — بعض القيم مُقدَّرة", fr: "Fiabilité moyenne — plusieurs valeurs estimées" };
  }
  return { level: "low", ar: "موثوقية منخفضة — معظم القيم مُقدَّرة (متصفح محدود)", fr: "Fiabilité faible — la plupart des valeurs estimées (navigateur limité)" };
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
