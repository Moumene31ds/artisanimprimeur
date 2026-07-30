import { NextResponse } from 'next/server';
import { applySecurityHeaders, enforceRateLimit, getClientIp, isSuspiciousRequest } from '@/lib/security';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const suspicious = isSuspiciousRequest(request);
  const rateLimit = enforceRateLimit(request, 30);
  const response = NextResponse.json({
    ok: true,
    ip: getClientIp(request),
    suspicious,
    rateLimit: rateLimit.allowed ? 'allowed' : 'blocked',
    remaining: rateLimit.remaining,
  });

  return applySecurityHeaders(response);
}
