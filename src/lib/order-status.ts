// src/lib/order-status.ts
// مرجع موحّد لمراحل الطلب وحالته، يُستخدم في صفحة الطلبات ولوحة الإدارة
// وسجل التتبع الزمني (statusHistory) ودوال التحقق — لتجنب تكرار المنطق.

export const ORDER_STATUSES = [
  "En attente",
  "Conception",
  "Impression",
  "Découpage",
  "Façonnage",
  "Contrôle qualité",
  "Prêt",
  "Terminé",
  "Annulé",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PRODUCTION_STAGES = [...ORDER_STATUSES];

/** الحالات النهائية المكتملة */
export const COMPLETED_STATUSES = ["Terminé", "Livré"] as const;

export const CANCELLED_STATUS = "Annulé";

// ترجمة الحالة إلى نص عربي/فرنسي للعرض في السجل الزمني
export const STATUS_LABELS: Record<string, { ar: string; fr: string }> = {
  "En attente": { ar: "في الانتظار", fr: "En attente" },
  Conception: { ar: "التصميم", fr: "Conception" },
  Impression: { ar: "الطباعة", fr: "Impression" },
  Découpage: { ar: "التقطيع", fr: "Découpage" },
  Façonnage: { ar: "التشكيل", fr: "Façonnage" },
  "Contrôle qualité": { ar: "مراقبة الجودة", fr: "Contrôle qualité" },
  Prêt: { ar: "جاهز", fr: "Prêt" },
  Terminé: { ar: "منجز", fr: "Terminé" },
  Annulé: { ar: "ملغي", fr: "Annulé" },
  Livré: { ar: "تم التسليم", fr: "Livré" },
  Expédié: { ar: "تم الشحن", fr: "Expédié" },
  "En livraison": { ar: "في التوصيل", fr: "En livraison" },
};

export function getStepIndex(status: string): number {
  if (status === CANCELLED_STATUS) return -1;
  if (COMPLETED_STATUSES.includes(status as any)) return ORDER_STATUSES.indexOf("Terminé");
  const idx = ORDER_STATUSES.indexOf(status as OrderStatus);
  return idx >= 0 ? idx : 0;
}

export function isCompleted(status: string): boolean {
  return COMPLETED_STATUSES.includes(status as any);
}

export function isCancelled(status: string): boolean {
  return status === CANCELLED_STATUS;
}

export function isActive(status: string): boolean {
  return !isCompleted(status) && !isCancelled(status);
}

export function statusLabel(status: string, lang: "ar" | "fr" = "fr"): string {
  return STATUS_LABELS[status]?.[lang] || status;
}

/** تحويل أي قيمة زمنية (Timestamp/Date/ISO/رقم) إلى كائن Date آمن */
export function toSafeDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(ts: any, locale = "fr-DZ"): string {
  const d = toSafeDate(ts);
  if (!d) return "";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(ts: any, locale = "fr-DZ"): string {
  const d = toSafeDate(ts);
  if (!d) return "";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) +
    " — " +
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export interface StatusHistoryEntry {
  status: string;
  at: any;
  note?: string;
}

/**
 * إضافة مرحلة جديدة إلى سجل التتبع (statusHistory) مع الحفاظ على التسلسل.
 * يحذف أي مرحلة لاحقة عند التراجع للخلف للحفاظ على صحة الخط الزمني.
 */
export function buildStatusHistory(
  current: StatusHistoryEntry[] | undefined | null,
  newStatus: string,
  note?: string
): StatusHistoryEntry[] {
  const history: StatusHistoryEntry[] = Array.isArray(current) ? [...current] : [];
  const newIndex = getStepIndex(newStatus);

  // عند الإلغاء نحتفظ بالتسلسل ونضيف حالة الإلغاء في النهاية.
  // عند التراجع للخلف نزيل المراحل الأحدث من المرحلة الجديدة لضمان صحة الخط الزمني.
  const filtered = history.filter((entry) => {
    const idx = getStepIndex(entry.status);
    if (newIndex < 0) return entry.status !== CANCELLED_STATUS;
    return idx >= 0 && idx < newIndex;
  });

  const entry: StatusHistoryEntry = { status: newStatus, at: Date.now(), note };
  filtered.push(entry);
  return filtered;
}

export function getLastStatus(history: StatusHistoryEntry[] | undefined | null): string | null {
  if (!Array.isArray(history) || history.length === 0) return null;
  return history[history.length - 1].status;
}
