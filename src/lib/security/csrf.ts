// ---------------------------------------------------------------------------
// src/lib/security/csrf.ts — حماية Cross-Site Request Forgery (Edge-safe)
// ---------------------------------------------------------------------------
// استراتيجية ثلاثية الطبقات تعمل في Middleware دون أي واجهات Node:
//
//  1) Sec-Fetch-Site: المتصفحات الحديثة تعلن نيّة الطلب؛ نرفض أي طلب "cross-site"
//     على مسارات تغيّر الحالة (POST/PUT/PATCH/DELETE).
//  2) Origin Allowlist: عند وجود Origin نتحقق منه حرفياً مقابل قائمة النطاقات
//     المصرّح بها + أصول التطبيقات الأصلية (Capacitor).
//  3) Double-Submit Token: كعكة csrf_token (HttpOnly) + رأس x-csrf-token يجب أن
//     يتطابقا بمقارنة ثابتة الزمن. يُفعَّل تلقائياً عندما يحمل الطلب الكعكة
//     (أي عندما يكون هناك جلسة كعكات) ويبقى شفافاً للعملاء عديمي الكعكات.
//
// ملاحظة أمنية: مصادقة هذا التطبيق تعتمد Bearer Tokens في رأس Authorization
// (لا يُرسَل تلقائياً عبر المتصفح)، لذا الطبقة الفعلية للدفاع هي 1 و2،
// والطبقة 3 احتياط لأي جلسات تعتمد كعكات مستقبلاً.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server';

export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

/** طرق HTTP التي تغيّر الحالة وتهدف منها هجمات CSRF. */
export const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** توليد رمز عشوائي آمن (32 بايت عبر Web Crypto). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToBase64Url(bytes);
}

function bufferToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** مقارنة نصّية ثابتة الزمن لمنع هجمات Timing Side-Channel. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

/** أصول التطبيقات الأصلية (Capacitor Android/iOS) التي تفتقر إلى Origin ويب قياسي. */
const NATIVE_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'file://',
]);

/**
 * هل النطاق (Origin) مسموح؟ يجب أن يطابق نطاق التطبيق أو أصل كاباساتور.
 * لا نستخدم أبداً wildcard — القائمة صريحة.
 */
export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: readonly string[]
): boolean {
  if (!origin) return true; // لا Origin (طلبات curl / خوادم) — لا يمكن مهاجمتها CSRF
  const normalized = origin.replace(/\/+$/, '').toLowerCase();
  if (NATIVE_ORIGINS.has(normalized)) return true;
  return allowedOrigins.some(
    (o) => o.toLowerCase().replace(/\/+$/, '') === normalized
  );
}

export interface OriginCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * التحقق من أصل الطلب عبر Sec-Fetch-Site ثم Origin.
 * يُنفَّذ فقط على طرق تغيير الحالة.
 */
export function verifyRequestOrigin(
  request: NextRequest,
  allowedOrigins: readonly string[]
): OriginCheckResult {
  const method = request.method.toUpperCase();
  if (!STATE_CHANGING_METHODS.has(method)) return { allowed: true };

  // 1) Sec-Fetch-Site — إذا أعلن المتصفح عن cross-site نرفض فوراً.
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite === 'cross-site') {
    return { allowed: false, reason: 'sec-fetch-site:cross-site' };
  }

  // 2) Origin — إذا وُجد نتحقق منه من القائمة.
  const origin = request.headers.get('origin');
  if (origin && !isOriginAllowed(origin, allowedOrigins)) {
    return { allowed: false, reason: `origin:${origin}` };
  }

  return { allowed: true };
}

/**
 * التحقق من تطابق رمز CSRF (Double-Submit):
 * كعكة csrf_token == رأس x-csrf-token بمقارنة ثابتة الزمن.
 * - لا كعكة (عميل بلا جلسة كعكات) → لا يُطبَّق (يعتمد على فحص Origin).
 * - كعكة بلا رأس → valid=false, enforced=false: لا ننكره في الوضع الافتراضي
 *   (كسر العملاء)، لكن الوضع الصارم ENFORCE_CSRF_TOKEN=true يفرض وجود الرأس.
 * - كعكة مع رأس خاطئ → valid=false, enforced=true: رفض دائم.
 */
export function verifyCsrfToken(request: NextRequest): { valid: boolean; enforced: boolean } {
  const method = request.method.toUpperCase();
  if (!STATE_CHANGING_METHODS.has(method)) return { valid: true, enforced: false };

  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!cookie) return { valid: true, enforced: false };

  const header = request.headers.get(CSRF_HEADER);
  if (!header) return { valid: false, enforced: false };

  return { valid: safeEqual(header, cookie), enforced: true };
}

/** وضع كعكة CSRF آمنة على الاستجابة (تُنشأ مرة واحدة لكل عميل). */
export function ensureCsrfCookie(
  response: NextResponse,
  request: NextRequest,
  token = generateCsrfToken()
): NextResponse {
  if (request.cookies.has(CSRF_COOKIE)) return response;
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 ساعة — قصير الأمد
  });
  return response;
}
