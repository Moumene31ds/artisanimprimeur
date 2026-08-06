// ---------------------------------------------------------------------------
// loyalty.ts — نظام الولاء والنقاط المتكامل (Loyalty & Points Engine).
//
// هذا الملف هو المرجع الموحّد لكل قواعد نظام الولاء:
//   • معدل الربح الأساسي + مضاعفات المستويات
//   • مستويات العضوية (4 مستويات) وشروطها ومزاياها
//   • مكافآت الإجراءات (تسجيل، تسجيل يومي، عيد ميلاد، مراجعة، إحالة)
//   • كتالوج استبدال النقاط بكوپونات
//   • دوال الحساب المشتركة بين الواجهات والخادم ولوحة الأدمن
// ---------------------------------------------------------------------------

export interface LoyaltyTier {
  id: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  minSpending: number;          // حد الإنفاق مدى الحياة بالدينار للوصول لهذا المستوى
  multiplier: number;           // مضاعف النقاط
  label: { ar: string; fr: string };
  perks: { ar: string[]; fr: string[] };
  gradient: string;             // تدرج لوني للعرض
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    minSpending: 0,
    multiplier: 1,
    label: { ar: "برونز", fr: "Bronze" },
    perks: {
      ar: ["ربح 1 نقطة لكل 100 دج", "عجلة الحظ 50 نقطة للدوران"],
      fr: ["1 point pour chaque 100 DA", "Roue de la fortune : 50 pts"],
    },
    gradient: "from-amber-700 to-amber-900",
  },
  {
    id: "silver",
    minSpending: 20000,
    multiplier: 1.25,
    label: { ar: "فضي", fr: "Silver" },
    perks: {
      ar: ["مضاعف نقاط 1.25x", "أولوية في معالجة الطلبات", "خصم 3% على الخدمات"],
      fr: ["Multiplicateur 1.25x", "Priorité de traitement", "-3% sur les services"],
    },
    gradient: "from-slate-300 to-slate-500",
  },
  {
    id: "gold",
    minSpending: 50000,
    multiplier: 1.5,
    label: { ar: "ذهبي", fr: "Or" },
    perks: {
      ar: ["مضاعف نقاط 1.5x", "خصم 5% على الخدمات", "استلام سريع للتصاميم (BAT)"],
      fr: ["Multiplicateur 1.5x", "-5% sur les services", "Traitement BAT prioritaire"],
    },
    gradient: "from-yellow-300 to-amber-500",
  },
  {
    id: "platinum",
    minSpending: 120000,
    multiplier: 2,
    label: { ar: "بلاتيني", fr: "Platine" },
    perks: {
      ar: ["مضاعف نقاط 2x", "خصم 8% على الخدمات", "مدير حساب مخصص", "هدايا عيد ميلاد مزدوجة"],
      fr: ["Multiplicateur 2x", "-8% sur les services", "Conseiller dédié", "Bonus d'anniversaire doublé"],
    },
    gradient: "from-slate-200 to-slate-400",
  },
  {
    id: "diamond",
    minSpending: 300000,
    multiplier: 3,
    label: { ar: "ألماس", fr: "Diamant" },
    perks: {
      ar: ["مضاعف نقاط 3x", "خصم 12% على الخدمات", "أولوية قصوى في الإنتاج", "دعوات حصرية للمناسبات"],
      fr: ["Multiplicateur 3x", "-12% sur les services", "Priorité maximale", "Invitations exclusives"],
    },
    gradient: "from-cyan-300 to-blue-500",
  },
];

// قيم افتراضية تُستخدم في حال غياب وثيقة إعدادات الولاء (settings/loyalty)
export const DEFAULT_LOYALTY_CONFIG = {
  basePointsPer100: 1,          // 1 نقطة لكل 100 دج (بعد تطبيق المضاعف)
  signupBonus: 200,             // هدية التسجيل الأولى
  dailyCheckInBase: 10,         // نقاط كل تسجيل يومي
  dailyCheckInStreakBonus: 50,  // نقاط إضافية عند إكمال أسبوع (كل 7 أيام متتالية)
  birthdayBonus: 100,           // هدية عيد الميلاد
  reviewBonus: 50,              // مكافأة كتابة مراجعة موثقة
  referralBonus: 100,           // مكافأة الموَصي عند اكتمال طلب أول مدعو
  spinCost: 50,                 // تكلفة دوران عجلة الحظ
};

export interface LoyaltyConfig extends Record<string, number> {}

// كتالوج استبدال النقاط (يُقرأ من settings/loyalty إن وُجد وإلا هذا الافتراضي)
export interface LoyaltyReward {
  id: string;
  points: number;
  type: "percent" | "fixed";
  value: number;
  title: { ar: string; fr: string };
  icon: string; // اسم أيقونة lucide للعرض
}

export const DEFAULT_LOYALTY_REWARDS: LoyaltyReward[] = [
  { id: "r1", points: 200, type: "percent", value: 10, title: { ar: "خصم 10%", fr: "Remise 10%" }, icon: "Ticket" },
  { id: "r2", points: 500, type: "fixed", value: 600, title: { ar: "قسيمة 600 دج", fr: "Bon de 600 DA" }, icon: "Zap" },
  { id: "r3", points: 1000, type: "fixed", value: 1000, title: { ar: "قسيمة 1000 دج", fr: "Bon de 1000 DA" }, icon: "Trophy" },
  { id: "r4", points: 2000, type: "fixed", value: 2500, title: { ar: "قسيمة 2500 دج", fr: "Bon de 2500 DA" }, icon: "Gem" },
  { id: "r5", points: 5000, type: "percent", value: 20, title: { ar: "خصم 20%", fr: "Remise 20%" }, icon: "Crown" },
];

/** يحسب المستوى الحالي بناءً على مجموع الإنفاق مدى الحياة. */
export function getTierForSpending(spending: number): LoyaltyTier {
  let current = LOYALTY_TIERS[0];
  for (const tier of LOYALTY_TIERS) {
    if (spending >= tier.minSpending) current = tier;
  }
  return current;
}

/** يحسب المستوى التالي (أو null إذا بلغ الأعلى). */
export function getNextTier(spending: number): LoyaltyTier | null {
  const next = LOYALTY_TIERS.find((t) => spending < t.minSpending);
  return next ?? null;
}

/** يحسب عدد النقاط المكتسبة من مبلغ معين مع تطبيق مضاعف المستوى. */
export function getPointsForAmount(amount: number, multiplier = 1): number {
  const base = Math.floor(Number(amount || 0) / 100) * (DEFAULT_LOYALTY_CONFIG.basePointsPer100 || 1);
  return Math.floor(base * multiplier);
}

/** يقارن تاريخين باليوم (بدون وقت) ويعيد عدد الأيام الكاملة بينهما. */
export function diffInDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((dayB - dayA) / msPerDay);
}

/** إصدار يوم بتنسيق YYYY-MM-DD لضمان تفرد التسجيل اليومي. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** يستخرج شهر-يوم (MM-DD) من تاريخ الميلاد للاحتفال السنوي. */
export function birthdayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** هل عيد ميلاد المستخدم اليوم؟ */
export function isBirthdayToday(birthday: string | Date | null | undefined): boolean {
  if (!birthday) return false;
  return birthdayKey(birthday) === birthdayKey(new Date());
}

/** تسلسل محدد لوصف مصدر النقاط في السجل. */
export const LOYALTY_TX_TYPES = [
  "earned",
  "redeemed",
  "won",
  "spin_cost",
  "daily_checkin",
  "birthday",
  "review",
  "referral",
  "signup",
  "adjust",
] as const;
