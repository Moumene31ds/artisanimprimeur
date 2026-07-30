import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, enforceRateLimit, getClientIp, isSuspiciousRequest } from './src/lib/security';

export function middleware(request: NextRequest) {
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  const bypassKey = request.nextUrl.searchParams.get('bypass');
  const expectedBypassKey = process.env.NEXT_PUBLIC_BYPASS_KEY || 'artisan-secret-2024';
  const hasBypassCookie = request.cookies.get('maintenance_bypass_token')?.value === expectedBypassKey;

  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isApiPath = request.nextUrl.pathname.startsWith('/api');

  if (bypassKey === expectedBypassKey) {
    const response = NextResponse.next();
    response.cookies.set('maintenance_bypass_token', bypassKey, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
    });
    return applySecurityHeaders(response);
  }

  if (isSuspiciousRequest(request)) {
    const response = new NextResponse('Suspicious activity detected', { status: 403 });
    return applySecurityHeaders(response);
  }

  const rateLimit = enforceRateLimit(request, isApiPath ? 60 : 180);
  if (!rateLimit.allowed) {
    const response = new NextResponse('Too many requests', { status: 429 });
    response.headers.set('Retry-After', '60');
    return applySecurityHeaders(response);
  }

  if (isMaintenanceMode && !hasBypassCookie && !isAdminPath) {
    if (request.nextUrl.pathname !== '/maintenance') {
      request.nextUrl.pathname = '/maintenance';
      const response = NextResponse.rewrite(request.nextUrl);
      return applySecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-client-ip', getClientIp(request));
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images).*)'],
};
