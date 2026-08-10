// ---------------------------------------------------------------------------
// src/lib/security/api-error.ts — إخفاء أنماط الأخطاء + سجل تدقيق آمن (Edge-safe)
// ---------------------------------------------------------------------------
// المبادئ:
//  - لا يُرسَل أبداً رسالة الخطأ التقنية أو Stack أو اسم الملف إلى العميل.
//  - كل خطأ غير متوقع يُسجَّل بشكل كامل (console + Audit Log اختياري)
//    بينما يتلقى العميل رسالة عامة موحّدة.
//  - ApiError هي الطريقة الوحيدة لحمل رسالة آمنة مقصودة (أخطاء تحقق مقروءة).
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** تحويل خطأ Zod إلى استجابة 400 برسائل مقروءة لكل حقل (بلا تسريب تفاصيل داخلية). */
export function zodErrors(zodError: ZodError): NextResponse {
  const messages = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
  return NextResponse.json({ error: 'Validation failed', fields: messages }, { status: 400 });
}

export interface FailOptions {
  /** تسجيل الحدث في سجل التدقيق الأمني (يبتلع الأخطاء داخلياً). */
  audit?: boolean;
  logSecurity?: (opts: { type: string; details: string; metadata?: Record<string, unknown> }) => Promise<void> | void;
  /** بيانات إضافية لسجل الخادم فقط (لا تُرسل للعميل). */
  metadata?: Record<string, unknown>;
}

/**
 * وحدة المعالجة الموحّدة للأخطاء:
 * - ApiError → رمز حالته ورسالته الآمنة (بدون detail إن لم يُراد).
 * - ZodError → 400 مع تفاصيل الحقول.
 * - أي خطأ آخر → 500 عام + تسجيل كامل على الخادم + سجل تدقيق.
 */
export function fail(
  err: unknown,
  opts: FailOptions = {}
): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status }
    );
  }

  if ((err as ZodError)?.name === 'ZodError') {
    return zodErrors(err as ZodError);
  }

  const message = (err as Error)?.message ?? String(err);
  // تسجيل تفصيلي على الخادم — لا يصل أي جزء منه للعميل.
  console.error('[api] Unhandled error:', err);

  if (opts.audit) {
    const log = opts.logSecurity ?? (async () => {});
    Promise.resolve(log({ type: 'api:internal-error', details: message, metadata: opts.metadata })).catch(() => {});
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** استجابة نجاح موحّدة (تغليف بسيط). */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}
