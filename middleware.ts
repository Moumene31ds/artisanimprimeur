import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  applySecurityHeaders,
  applyNoStoreHeaders,
  enforceRateLimit,
  getClientIp,
  getRouteRateLimit,
  hasMissingUserAgent,
  isInternalServerPath,
  isSuspiciousRequest,
  addRateLimitHeaders,
  verifyRequestOrigin,
  verifyCsrfToken,
  ensureCsrfCookie,
  getAllowedOrigins,
} from './src/lib/security';

// المسارات التي يجب حمايتها من الطلبات عديمة وكيل المستخدم (أتمتة).
const SENSITIVE_API_PREFIXES = [
  '/api/auth',
  '/api/chat',
  '/api/upload',
  '/api/generate-image',
  '/api/payments/',
  '/api/loyalty/',
  '/api/marketing/',
];

// تفعيل فرض رمز CSRF (Double-Submit) الصارم — يتطلب أن يرسل العميل رأس
// x-csrf-token مع كل طلب يغيّر الحالة. الافتراضي: التحقق من المصدر فقط
// (Origin/Sec-Fetch-Site) لأنه شفاف ولا يكسر التطبيق. شغّل هذه القيمة بعد
// إضافة الرأس في عميل التطبيق (انظر SECURITY.md).
const ENFORCE_CSRF_TOKEN = process.env.ENFORCE_CSRF_TOKEN === 'true';

export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  // لا يوجد مفتاح تجاوز افتراضي/مشفّر داخل الكود إطلاقاً — إذا لم يُضبط
  // NEXT_PUBLIC_BYPASS_KEY لا يعمل أي تجاوز.
  const expectedBypassKey = process.env.NEXT_PUBLIC_BYPASS_KEY || '';
  const hasBypassCookie = Boolean(
    expectedBypassKey &&
      request.cookies.get('maintenance_bypass_token')?.value === expectedBypassKey
  );

  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith('/admin');
  const isApiPath = pathname.startsWith('/api');

  // 1) مفتاح تجاوز نمط الصيانة → كعكة آمنة (HttpOnly + Secure + SameSite=Lax) ويمرّر.
  if (expectedBypassKey && request.nextUrl.searchParams.get('bypass') === expectedBypassKey) {
    const response = NextResponse.next();
    response.cookies.set('maintenance_bypass_token', expectedBypassKey, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });
    return applySecurityHeaders(ensureCsrfCookie(response, request));
  }

  // 2) حجب الطلبات المشبوهة (حقن / ماسحات / روبوتات خبيثة).
  // استثناء: security.txt يجب أن يصل لباحثات الثغرات وأدوات الفحص (curl وغيرها)
  if (isSuspiciousRequest(request) && pathname !== '/.well-known/security.txt') {
    const response = new NextResponse('Suspicious activity detected', { status: 403 });
    return applySecurityHeaders(applyNoStoreHeaders(response));
  }

  // 3) حجب الطلبات عديمة وكيل المستخدم على المسارات الحساسة (أتمتة خام).
  if (
    isApiPath &&
    SENSITIVE_API_PREFIXES.some((p) => pathname.startsWith(p)) &&
    hasMissingUserAgent(request) &&
    !isInternalServerPath(pathname)
  ) {
    const response = new NextResponse('Missing User-Agent', { status: 403 });
    return applySecurityHeaders(applyNoStoreHeaders(response));
  }

  // 4) حماية CSRF: رفض الطلبات المتغيّرة للحالة القادمة من نطاق خارجي
  //    (Sec-Fetch-Site / Origin) — الدفاع الأساسي ضد CSRF الشفاف للعميل.
  const originCheck = verifyRequestOrigin(request, getAllowedOrigins());
  if (!originCheck.allowed) {
    const response = new NextResponse('Cross-origin request rejected', { status: 403 });
    return applySecurityHeaders(applyNoStoreHeaders(response));
  }

  // 4ب) رمز CSRF المزدوج (Double-Submit): يُفرض كلياً عند التفعيل الصارم،
  //     وأي رمز خاطئ يُرفض دائماً حتى في الوضع الافتراضي.
  const csrf = verifyCsrfToken(request);
  const csrfBlocked = ENFORCE_CSRF_TOKEN ? !csrf.valid : csrf.enforced && !csrf.valid;
  if (csrfBlocked) {
    const response = new NextResponse('Invalid CSRF token', { status: 403 });
    return applySecurityHeaders(applyNoStoreHeaders(response));
  }

  // 5) تقييد المعدل — حدود مخصصة لكل مسار حساس، وإلا حد عام.
  const routeRule = isApiPath ? getRouteRateLimit(pathname) : null;
  const limit = routeRule?.limit ?? (isApiPath ? 60 : 180);
  const windowMs = routeRule?.windowMs ?? 60_000;

  const rateLimit = enforceRateLimit(request, limit, windowMs);
  if (!rateLimit.allowed) {
    const response = new NextResponse('Too many requests', { status: 429 });
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return applySecurityHeaders(applyNoStoreHeaders(addRateLimitHeaders(response, rateLimit)));
  }

  // 6) نمط الصيانة.
  if (isMaintenanceMode && !hasBypassCookie && !isAdminPath) {
    if (pathname !== '/maintenance') {
      request.nextUrl.pathname = '/maintenance';
      const response = NextResponse.rewrite(request.nextUrl);
      return applySecurityHeaders(ensureCsrfCookie(response, request));
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-client-ip', getClientIp(request));
  // لا تخزين مؤقت للوحة الإدارة وواجهات API الحساسة.
  if (isAdminPath || isApiPath) applyNoStoreHeaders(response);
  return applySecurityHeaders(addRateLimitHeaders(ensureCsrfCookie(response, request), rateLimit));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'],
};
