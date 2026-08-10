// ---------------------------------------------------------------------------
// src/lib/security/cors.ts — سياسة CORS صارمة لطبقة API (Edge-safe)
// ---------------------------------------------------------------------------
// القواعد:
//  - لا نردّ بأي رأس CORS على نطاق غير مصرّح به إطلاقاً.
//  - لا نستخدم `*` أبداً مع الاعتمادات؛ نعكس Origin المصرّح به فقط.
//  - نعلن Vary: Origin لمنع تسميم خوادم التخزين المؤقت (Cache Poisoning).
//  - نمنع طرق/رؤوس غير قياسية (OPTIONS للتحقق المسبق فقط).
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server';
import { isOriginAllowed } from './csrf';

const DEFAULT_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const DEFAULT_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'x-csrf-token',
  'x-client-id',
  'x-request-id',
].join(', ');
const MAX_AGE = 600; // 10 دقائق

/** قائمة النطاقات المصرّح بها: من env أولاً ثم نطاق التطبيق. */
export function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const primary = appUrl.replace(/\/+$/, '');
  return [...new Set([...fromEnv, primary])];
}

/**
 * توليد رؤوس CORS لاستجابة ما بعد التحقق — لا يعكس إلا النطاق المصرّح.
 * يُرجع مصفوفة رؤوس (لا نكتب في NextResponse مباشرة كي تبقى الدالة قابلة للاختبار).
 */
export function buildCorsHeaders(
  request: NextRequest,
  allowedOrigins?: readonly string[]
): { key: string; value: string }[] {
  const origins = allowedOrigins ?? getAllowedOrigins();
  const origin = request.headers.get('origin');

  const headers: { key: string; value: string }[] = [
    { key: 'Vary', value: 'Origin' },
  ];

  if (origin && isOriginAllowed(origin, origins)) {
    headers.push({ key: 'Access-Control-Allow-Origin', value: origin });
    headers.push({ key: 'Access-Control-Allow-Credentials', value: 'true' });
  }

  return headers;
}

/**
 * معالجة طلبات OPTIONS (التحقق المسبق CORS).
 * يُرجع null إذا لم يكن الطلب تحققاً مسبقاً، أو استجابة 204 إذا كان صحيحاً،
 * أو 403 إذا كان نطاقاً غير مصرّح به.
 */
export function handlePreflight(
  request: NextRequest,
  allowedOrigins?: readonly string[]
): NextResponse | null {
  if (request.method.toUpperCase() !== 'OPTIONS') return null;

  const origins = allowedOrigins ?? getAllowedOrigins();
  const origin = request.headers.get('origin');
  const requestedMethod = request.headers.get('access-control-request-method') || '';
  const requestedHeaders = request.headers.get('access-control-request-headers') || '';

  // التحقق المسبق دون Origin أو بأساليب تخصيصية خارج المسموح → رفض.
  const methodOk = DEFAULT_ALLOWED_METHODS.split(', ').includes(requestedMethod.toUpperCase());
  if (!origin || !isOriginAllowed(origin, origins) || !methodOk) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
      'Access-Control-Allow-Headers': requestedHeaders || DEFAULT_ALLOWED_HEADERS,
      'Access-Control-Max-Age': String(MAX_AGE),
      Vary: 'Origin',
    },
  });
  return response;
}
