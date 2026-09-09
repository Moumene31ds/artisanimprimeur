// src/lib/export-utils.ts
// أدوات تصدير البيانات (CSV) مشتركة بين لوحات الإدارة.
// CSV يُنشأ محلياً في المتصفح دون أي مكتبة خارجية — خفيف وسريع.

/**
 * يبني ملف CSV من مصفوفة كائنات وينزّله في المتصفح.
 * - يضيف BOM لدعم العربية في Excel.
 * - يهرب القيم التي تحتوي فواصل/اقتباسات/أسطراً جديدة.
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (typeof window === "undefined" || rows.length === 0) return;

  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );

  const escapeCell = (value: unknown): string => {
    const str =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    // اقتباس دائم + مضاعفة الاقتباسات الداخلية (آمن مع الفواصل والأسطر).
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ].join("\r\n");

  // BOM يجعل Excel يفهم UTF-8 (العربية تظهر صحيحة).
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** اسم ملف مؤرخ بالشكل: prefix_2026-08-22.csv */
export function datedFilename(prefix: string, extension = "csv"): string {
  return `${prefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;
}
