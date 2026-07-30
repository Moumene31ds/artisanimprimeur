import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const suspiciousPatterns = [
  /\.\./,
  /<script/i,
  /<iframe/i,
  /union\s+select/i,
  /select\s+.+\s+from/i,
  /drop\s+table/i,
  /or\s+1\s*=\s*1/i,
  /(?:\b(?:cmd|curl|wget|bash)\b)/i,
  /(?:\/etc\/passwd|\/proc\/self)/i,
];

const blockedUserAgents = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /bot/i,
];

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function isSuspiciousRequest(request: NextRequest) {
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const userAgent = request.headers.get('user-agent') || '';
  const combined = `${path}\n${userAgent}`;

  return suspiciousPatterns.some((pattern) => pattern.test(combined)) || blockedUserAgents.some((pattern) => pattern.test(userAgent));
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseapp.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: https://res.cloudinary.com https://lh3.googleusercontent.com https://images.unsplash.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https: wss: https://*.googleapis.com https://*.firebaseapp.com https://*.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      "frame-src 'self' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.google.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
  );

  return response;
}

export function enforceRateLimit(request: NextRequest, limit = 120, windowMs = 60_000) {
  const ip = getClientIp(request);
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return { allowed: true, remaining: limit - entry.count };
}
