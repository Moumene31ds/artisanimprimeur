// src/lib/app-check.ts
// ---------------------------------------------------------------------------
// التحقق الخادمي من رموز Firebase App Check — يكمل تهيئة العميل في firebase.ts.
// ---------------------------------------------------------------------------
// يستخدم firebase-admin (App Check API) للتحقق من الرأس x-firebase-appcheck.
// الضمانات:
//  - بدون FIREBASE_SERVICE_ACCOUNT أو بدون App Check مفعّل في المشروع →
//    مرور صامت (valid=true) فلا ينكسر أي مسار قائم أبداً.
//  - عند التفعيل الكامل (مفتاح reCAPTCHA + حساب خدمة) يمكن تشديد الوضع عبر
//    متغير البيئة REQUIRE_APP_CHECK=true لرفض الطلبات بلا رمز صالح.
// ---------------------------------------------------------------------------

import type { NextRequest } from "next/server";
import { getAdminInstance } from "@/lib/audit";

export interface AppCheckResult {
  valid: boolean;
  enforced: boolean;
}

export async function verifyAppCheck(request: NextRequest): Promise<AppCheckResult> {
  const token = request.headers.get("x-firebase-appcheck");
  const required = process.env.REQUIRE_APP_CHECK === "true";

  // وضع غير مفروض وغير مهيأ: مرور شفاف (توافق رجعي كامل).
  if (!required && !token) return { valid: true, enforced: false };

  const admin = getAdminInstance();
  if (!admin?.appCheck) {
    // لا يمكن التحقق بنية تحتياً — نرفض فقط إذا كان الوضع صارماً صراحةً.
    return { valid: !required, enforced: false };
  }

  if (!token) return { valid: !required, enforced: true };

  try {
    await admin.appCheck().verifyToken(token);
    return { valid: true, enforced: true };
  } catch (err) {
    console.warn(
      "[app-check] token verification failed:",
      (err as Error)?.message ?? err
    );
    return { valid: false, enforced: true };
  }
}
