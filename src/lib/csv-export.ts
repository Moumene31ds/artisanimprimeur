// src/lib/csv-export.ts
// ---------------------------------------------------------------------------
// تصدير CSV آمن ومستقل — بديل خفيف عن مكتبة SheetJS (xlsx) التي تحمل ثغرات
// معروفة بلا إصلاح (Prototype Pollution GHSA-4r6h-8v6p-xvw6 + ReDoS).
// ---------------------------------------------------------------------------
// المزايا الأمنية:
//  - لا تعتمد أي مكتبة خارجية (صفري الاعتماديات).
//  - تهريب صحيح للحقول (اقتباس مزدوج) يمنع حقن الصيغة.
//  - حماية من "CSV Injection" (Excel Formula Injection): الحقول التي تبدأ
//    بـ = + - @ تُسبق بعلامة اقتباس مفردة — توصية OWASP لتصدير جداول البيانات.
//  - BOM صريح لدعم العربية في Excel مباشرة.
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  // حماية حقن الصيغ (=SUM(...)، +cmd|...، -2+3، @MACRO) وفق OWASP.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // تهريب الاقتباسات الداخلية وتغليف الحقول التي تحتوي فواصل/أسطر/اقتباسات.
  if (/[";\n\r,]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * توليد ملف CSV وتنزيله في المتصفح.
 * الفاصل ";" لأن Excel الفرنسي/الأوروبي يفتحه أعمدةً تلقائياً.
 */
export function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(";"),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(";")),
  ];
  const csv = "\uFEFF" + lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
