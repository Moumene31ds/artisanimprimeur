// src/app/api/security/csp-report/route.ts
// ---------------------------------------------------------------------------
// مستقبل تقارير انتهاكات سياسة أمان المحتوى (CSP) — معيار المراقبة العالمي.
// ---------------------------------------------------------------------------
// المتصفحات ترسل هنا تقريراً عند أي محاولة مخالفة للسياسة (سكربت غير موثوق،
// إطار خارجي، اتصال لنطاق غير مسموح...) — وهي إنذار مبكر حقيقي لمحاولات XSS
// أو اختراق مكتبة خارجية. التقارير تُسجَّل في securityLogs عبر firebase-admin.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();

    // المتصفح يرسل Content-Type: application/csp-report أو application/reports+json.
    let report: any = null;
    try {
      const parsed = JSON.parse(raw);
      report = parsed["csp-report"] ?? parsed.body ?? parsed;
    } catch {
      // جسد غير قابل للتحليل — لا قيمة، نرد 204 بصمت.
    }

    if (report && typeof report === "object") {
      const directive = report["violated-directive"] || report.effectiveDirective || "unknown";
      const blockedUri = String(report["blocked-uri"] || report.blockedURL || "").slice(0, 300);
      const sourceFile = String(report["source-file"] || "").slice(0, 300);

      // تجاهل الضجيج المعروف: امتدادات المتصفح وبيانات data: الشائعة.
      const isExtensionNoise = blockedUri.startsWith("chrome-extension:") ||
        blockedUri.startsWith("moz-extension:") || sourceFile.startsWith("chrome-extension:");

      if (!isExtensionNoise) {
        await logSecurityEvent({
          type: "csp_violation",
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
          details: `${directive} blocked ${blockedUri}`,
          metadata: {
            documentUri: String(report["document-uri"] || "").slice(0, 300),
            sourceFile,
            lineNumber: report["line-number"] ?? null,
            sample: String(report["script-sample"] || "").slice(0, 120),
          },
        });
      }
    }
  } catch {
    // أي خطأ هنا يجب أن يكون صامتاً تماماً — التقارير تشخيصية فقط.
  }

  return new NextResponse(null, { status: 204 });
}
