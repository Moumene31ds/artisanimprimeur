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

export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const bypassKey = request.nextUrl.searchParams.get('bypass');
  const expectedBypassKey = process.env.NEXT_PUBLIC_BYPASS_KEY || 'artisan-secret-2024';
  const hasBypassCookie = request.cookies.get('maintenance_bypass_token')?.value === expectedBypassKey;

  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith('/admin');
  const isApiPath = pathname.startsWith('/api');

  // 1) مفتاح تجاوز نمط الصيانة → يضع كعكة آمنة ويمرّر.
  if (bypassKey === expectedBypassKey) {
    const response = NextResponse.next();
    response.cookies.set('maintenance_bypass_token', bypassKey, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });
    return applySecurityHeaders(response);
  }

  // 2) حجب الطلبات المشبوهة (حقن / ماسحات / روبوتات خبيثة).
  if (isSuspiciousRequest(request)) {
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

  // 4) تقييد المعدل — حدود مخصصة لكل مسار حساس، وإلا حد عام.
  const routeRule = isApiPath ? getRouteRateLimit(pathname) : null;
  const limit = routeRule?.limit ?? (isApiPath ? 60 : 180);
  const windowMs = routeRule?.windowMs ?? 60_000;

  const rateLimit = enforceRateLimit(request, limit, windowMs);
  if (!rateLimit.allowed) {
    const response = new NextResponse('Too many requests', { status: 429 });
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return applySecurityHeaders(applyNoStoreHeaders(addRateLimitHeaders(response, rateLimit)));
  }

  // 5) نمط الصيانة.
  if (isMaintenanceMode && !hasBypassCookie && !isAdminPath) {
    if (pathname !== '/maintenance') {
      request.nextUrl.pathname = '/maintenance';
      const response = NextResponse.rewrite(request.nextUrl);
      return applySecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-client-ip', getClientIp(request));
  // لا تخزين مؤقت للوحة الإدارة وواجهات API الحساسة.
  if (isAdminPath || isApiPath) applyNoStoreHeaders(response);
  return applySecurityHeaders(addRateLimitHeaders(response, rateLimit));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'],
};
