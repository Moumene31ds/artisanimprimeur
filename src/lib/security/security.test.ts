// ---------------------------------------------------------------------------
// src/lib/security/security.test.ts — اختبارات أتمتة الطبقة الدفاعية
// تُشغَّل عبر:  npm test
// تغطي: كشف الطلبات المشبوهة، التعقيم، تقييد المعدل، CSRF، CORS، رؤوس الأمان،
//       تجزئة كلمات المرور، ومخططات التحقق (Zod).
// ---------------------------------------------------------------------------

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  isSuspiciousRequest,
  sanitizeTextInput,
  sanitizePhone,
  sanitizeEmail,
  sanitizeObject,
  sanitizeQuantity,
  enforceRateLimit,
  applySecurityHeaders,
  defaultCsp,
  buildCsp,
  ROUTE_RATE_LIMITS,
  getRouteRateLimit,
} from './index';

import {
  generateCsrfToken,
  safeEqual,
  isOriginAllowed,
  verifyCsrfToken,
  verifyRequestOrigin,
  STATE_CHANGING_METHODS,
  CSRF_COOKIE,
  CSRF_HEADER,
} from './csrf';

import { buildCorsHeaders, handlePreflight, getAllowedOrigins } from './cors';

import { enforceRateLimitEdge, buildRateLimitKey } from './redis-rate-limit';

import { hashPassword, verifyPassword, needsRehash } from './passwords';

import {
  emailSchema,
  phoneSchema,
  receiptSchema,
  nameSchema,
  parseBody,
  quantitySchema,
} from './schemas';

import { ok, fail, ApiError } from './api-error';

// ---------------------------------------------------------------
// أدوات مساعدة لمحاكاة NextRequest (متوافق مع الوظائف قيد الاختبار)
// ---------------------------------------------------------------

function mockRequest({
  method = 'GET',
  path = '/api/test',
  cookie,
  headers = {},
}: {
  method?: string;
  path?: string;
  cookie?: string;
  headers?: Record<string, string>;
} = {}) {
  const h = new Headers(headers);
  if (!h.has('user-agent')) h.set('user-agent', 'Mozilla/5.0 test');
  return {
    method,
    headers: h,
    nextUrl: new URL(`https://site.example${path}`),
    cookies: {
      get: (name: string) => (name === CSRF_COOKIE && cookie ? { value: cookie } : undefined),
      has: (name: string) => name === CSRF_COOKIE && Boolean(cookie),
    },
  } as any;
}

// ---------------------------------------------------------------
// 1) كشف الطلبات المشبوهة (XSS / SQLi / Path Traversal / روبوتات)
// ---------------------------------------------------------------

describe('isSuspiciousRequest (WAF-layer pattern blocking)', () => {
  test('blocks SQL injection in query string', () => {
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/api/orders?id=1%20OR%201=1' })), true);
    assert.equal(isSuspiciousRequest(mockRequest({ path: "/api/orders?id=' OR '1'='1" })), true);
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/api/orders?q=union select * from users' })), true);
  });

  test('blocks XSS payloads in path', () => {
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/<script>alert(1)</script>' })), true);
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/?img=javascript:alert(1)' })), true);
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/?x=onerror=alert(1)' })), true);
  });

  test('blocks path traversal', () => {
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/../../etc/passwd' })), true);
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/%2e%2e/%2e%2e/etc/shadow' })), true);
  });

  test('blocks known scanner user agents', () => {
    assert.equal(
      isSuspiciousRequest(mockRequest({ headers: { 'user-agent': 'sqlmap/1.7' } })),
      true
    );
    assert.equal(
      isSuspiciousRequest(mockRequest({ headers: { 'user-agent': 'Nuclei/3.1' } })),
      true
    );
  });

  test('allows legitimate requests', () => {
    assert.equal(isSuspiciousRequest(mockRequest({ path: '/', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })), false);
  });
});

// ---------------------------------------------------------------
// 2) التعقيم والتنقية (Sanitization)
// ---------------------------------------------------------------

describe('input sanitizers', () => {
  test('sanitizeTextInput strips HTML tags and control chars', () => {
    assert.equal(sanitizeTextInput('<script>alert(1)</script>', 500), 'alert(1)');
    assert.equal(sanitizeTextInput('a\u0000b\u001fc', 500), 'a b c');
    assert.equal(sanitizeTextInput('  много   spaces  ', 500), 'много spaces');
    assert.equal(sanitizeTextInput('x'.repeat(600), 10), 'x'.repeat(10));
  });

  test('sanitizePhone keeps digits and leading + only', () => {
    assert.equal(sanitizePhone('+213 555 12 34 56'), '+213555123456');
    assert.equal(sanitizePhone('abc123++456'), '123456');
    assert.equal(sanitizePhone('<script>07</script>'), '07');
  });

  test('sanitizeEmail normalizes case and strips dangerous chars', () => {
    assert.equal(sanitizeEmail('  User@Example.COM '), 'user@example.com');
    assert.equal(sanitizeEmail('<u>ser@e<x.com'), 'user@ex.com');
  });

  test('sanitizeObject removes NoSQL injection keys and limits depth', () => {
    // بناء كائن بعمق 12 برمجياً (يتجاوز maxDepth=10).
    let deep: any = { end: 'x' };
    for (let i = 0; i < 12; i++) deep = { deep };
    const malicious: any = {
      name: '<b>Ali</b>',
      price: 12.5,
      items: ['a', 'b'],
    };
    malicious['$where'] = '1=1';
    malicious['nested.key'] = 'x';
    // مفتاح __proto__ حقيقي مملوك ذاتياً (أخطر شكل من حقن النموذج).
    Object.defineProperty(malicious, '__proto__', { value: { admin: true }, enumerable: true });
    malicious.deep = deep;

    const out = sanitizeObject(malicious) as any;
    assert.equal(out.name, 'Ali');
    assert.equal(out.price, 12.5);
    assert.equal('$where' in out, false);
    assert.equal('nested.key' in out, false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, '__proto__'), false);
    // لم تتلوّث سلسلة النموذج بالمدخل الخبيث.
    assert.equal('admin' in out, false);
    // العمق يحفظ أول 10 مستويات ثم يقفل — لا ينهار التطبيق على الحمولة العميقة.
    let node = out.deep;
    for (let i = 0; i < 10; i++) node = node.deep;
    assert.equal(node, null);
  });

  test('sanitizeQuantity bounds and coerces', () => {
    assert.equal(sanitizeQuantity('12'), 12);
    assert.equal(sanitizeQuantity(-3), 0);
    assert.equal(sanitizeQuantity(Number.POSITIVE_INFINITY), 0);
    assert.equal(sanitizeQuantity(999999), 100000);
  });
});

// ---------------------------------------------------------------
// 3) تقييد المعدل (Rate Limiting)
// ---------------------------------------------------------------

describe('enforceRateLimit (in-memory bucket)', () => {
  test('allows up to limit then blocks', () => {
    const req = mockRequest();
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const r = enforceRateLimit(req, 3, 60_000, key);
      assert.equal(r.allowed, true);
    }
    const blocked = enforceRateLimit(req, 3, 60_000, key);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);
    assert.equal(blocked.remaining, 0);
  });

  test('window resets after windowMs', () => {
    const req = mockRequest();
    const key = `reset:${Math.random()}`;
    enforceRateLimit(req, 1, -1, key); // نافذة منتهية فوراً
    const r = enforceRateLimit(req, 1, -1, key);
    assert.equal(r.allowed, true);
  });

  test('route-specific limits are applied per path', () => {
    assert.equal(getRouteRateLimit('/api/auth/login')?.limit, 10);
    assert.equal(getRouteRateLimit('/api/payments/verify-receipt')?.limit, 5);
    assert.equal(getRouteRateLimit('/api/products'), null);
  });
});

describe('enforceRateLimitEdge (Redis fallback path)', () => {
  test('falls back to memory when Redis not configured', async () => {
    const req = mockRequest();
    const key = `edge:${Math.random()}`;
    const r = await enforceRateLimitEdge(req, 5, 60_000, key);
    assert.equal(r.source, 'memory');
    assert.equal(r.allowed, true);
  });

  test('buildRateLimitKey composes ip + path', () => {
    const req = mockRequest({ path: '/api/chat' });
    const key = buildRateLimitKey(req, 'chat');
    assert.match(key, /chat/);
  });
});

// ---------------------------------------------------------------
// 4) CSRF (Sec-Fetch-Site / Origin / Double-Submit)
// ---------------------------------------------------------------

describe('csrf protection', () => {
  test('generates unique strong tokens', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    assert.notEqual(a, b);
    assert.ok(a.length >= 32);
  });

  test('safeEqual is true only for identical strings', () => {
    assert.equal(safeEqual('abc123', 'abc123'), true);
    assert.equal(safeEqual('abc123', 'abc124'), false);
    assert.equal(safeEqual('a', 'ab'), false);
  });

  test('isOriginAllowed only permits exact allowlist + native origins', () => {
    const allowed = ['https://shop.example.com'];
    assert.equal(isOriginAllowed('https://shop.example.com', allowed), true);
    assert.equal(isOriginAllowed('https://evil.example.com', allowed), false);
    assert.equal(isOriginAllowed('https://sub.shop.example.com', allowed), false);
    assert.equal(isOriginAllowed('capacitor://localhost', allowed), true);
    assert.equal(isOriginAllowed(null, allowed), true);
  });

  test('verifyRequestOrigin blocks cross-site state-changing requests', () => {
    const allowed = ['https://shop.example.com'];
    const evil = mockRequest({
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example.com' },
    });
    assert.deepEqual(verifyRequestOrigin(evil, allowed), { allowed: false, reason: 'sec-fetch-site:cross-site' });

    const badOrigin = mockRequest({
      method: 'POST',
      headers: { origin: 'https://evil.example.com' },
    });
    assert.equal(verifyRequestOrigin(badOrigin, allowed).allowed, false);

    const good = mockRequest({
      method: 'POST',
      headers: { origin: 'https://shop.example.com' },
    });
    assert.equal(verifyRequestOrigin(good, allowed).allowed, true);
  });

  test('verifyRequestOrigin ignores safe methods (GET)', () => {
    const allowed = ['https://shop.example.com'];
    const r = verifyRequestOrigin(mockRequest({ method: 'GET', headers: { origin: 'https://evil.example.com' } }), allowed);
    assert.equal(r.allowed, true);
  });

  test('double-submit: matching cookie+header passes, mismatch rejected', () => {
    const token = generateCsrfToken();
    const ok = verifyCsrfToken(
      mockRequest({ method: 'POST', cookie: token, headers: { [CSRF_HEADER.toLowerCase()]: token } })
    );
    assert.equal(ok.valid, true);
    assert.equal(ok.enforced, true);

    const bad = verifyCsrfToken(
      mockRequest({ method: 'POST', cookie: token, headers: { [CSRF_HEADER.toLowerCase()]: 'wrong-token' } })
    );
    assert.equal(bad.valid, false);
  });
});

// ---------------------------------------------------------------
// 5) CORS صارم
// ---------------------------------------------------------------

describe('strict CORS', () => {
  test('reflects origin only when allowed, never wildcard', () => {
    const origins = ['https://shop.example.com'];
    const allowed = mockRequest({ headers: { origin: 'https://shop.example.com' } });
    const headers = buildCorsHeaders(allowed, origins);
    const allow = headers.find((h) => h.key === 'Access-Control-Allow-Origin');
    assert.equal(allow?.value, 'https://shop.example.com');
    assert.notEqual(allow?.value, '*');

    const denied = mockRequest({ headers: { origin: 'https://evil.example.com' } });
    const deniedHeaders = buildCorsHeaders(denied, origins);
    assert.equal(deniedHeaders.find((h) => h.key === 'Access-Control-Allow-Origin'), undefined);
  });

  test('preflight rejected for unknown origin', () => {
    const res = handlePreflight(
      mockRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://evil.example.com', 'access-control-request-method': 'POST' },
      }),
      ['https://shop.example.com']
    );
    assert.equal(res?.status, 403);
  });

  test('preflight accepted for known origin', () => {
    const res = handlePreflight(
      mockRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://shop.example.com', 'access-control-request-method': 'POST' },
      }),
      ['https://shop.example.com']
    );
    assert.equal(res?.status, 204);
    assert.equal(res?.headers.get('Access-Control-Allow-Credentials'), 'true');
  });

  test('getAllowedOrigins reads env allowlist', () => {
    process.env.CORS_ALLOWED_ORIGINS = ' https://a.com ,https://b.com ';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    const origins = getAllowedOrigins();
    assert.ok(origins.includes('https://a.com'));
    assert.ok(origins.includes('https://b.com'));
    assert.ok(origins.includes('https://app.example.com'));
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  test('getAllowedOrigins always includes the official production domain as fallback', () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const origins = getAllowedOrigins();
    assert.ok(origins.includes('https://artisanimprimeur.vercel.app'));
    assert.ok(origins.includes('http://localhost:3000'));
  });
});

// ---------------------------------------------------------------
// 6) رؤوس الأمان + CSP
// ---------------------------------------------------------------

describe('security headers', () => {
  test('applySecurityHeaders sets the full hardening stack', () => {
    const res = applySecurityHeaders(new Response(null, { status: 200 }) as any) as Response;
    const h = res.headers;
    assert.equal(h.get('X-Frame-Options'), 'DENY');
    assert.equal(h.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(h.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.equal(h.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains; preload');
    assert.equal(h.get('X-Permitted-Cross-Domain-Policies'), 'none');
    assert.ok((h.get('Content-Security-Policy') || '').includes("default-src 'self'"));
    assert.ok((h.get('Content-Security-Policy') || '').includes('frame-ancestors'));
    assert.ok((h.get('Content-Security-Policy') || '').includes('upgrade-insecure-requests'));
  });

  test('defaultCsp is overridable via CSP_POLICY env', () => {
    process.env.CSP_POLICY = "default-src 'none'";
    assert.equal(defaultCsp(), "default-src 'none'");
    delete process.env.CSP_POLICY;
  });

  test('buildCsp assembles directives', () => {
    const csp = buildCsp({ "object-src": ["'none'"], "base-uri": ["'self'"] });
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'self'/);
  });
});

// ---------------------------------------------------------------
// 7) تجزئة كلمات المرور (scrypt)
// ---------------------------------------------------------------

describe('password hashing', () => {
  test('hash and verify round-trips', () => {
    const hash = hashPassword('SuperSecret123!');
    assert.equal(verifyPassword('SuperSecret123!', hash), true);
    assert.equal(verifyPassword('WrongPass123!', hash), false);
  });

  test('salts are unique per hash', () => {
    assert.notEqual(hashPassword('same-password'), hashPassword('same-password'));
  });

  test('rejects malformed stored hashes', () => {
    assert.equal(verifyPassword('x', 'not-a-hash'), false);
    assert.equal(verifyPassword('x', 'scrypt$abc'), false);
  });

  test('needsRehash detects weak cost', () => {
    assert.equal(needsRehash('scrypt$1$1$1$c2FsdA==$aGFzaA=='), true);
    assert.equal(needsRehash(hashPassword('StrongPass123!')), false);
  });
});

// ---------------------------------------------------------------
// 8) مخططات التحقق (Zod)
// ---------------------------------------------------------------

describe('validation schemas', () => {
  test('emailSchema accepts valid and rejects invalid', () => {
    assert.equal(emailSchema.safeParse('user@example.com').success, true);
    assert.equal(emailSchema.safeParse('not-an-email').success, false);
  });

  test('phoneSchema enforces + digits length', () => {
    assert.equal(phoneSchema.safeParse('+213555123456').success, true);
    assert.equal(phoneSchema.safeParse('abc').success, false);
    assert.equal(phoneSchema.safeParse('+1').success, false);
  });

  test('receiptSchema rejects traversal / injection in txId', () => {
    assert.equal(receiptSchema.safeParse({ orderId: 'abc123', txId: '12345678901234567890' }).success, true);
    assert.equal(receiptSchema.safeParse({ orderId: 'abc123', txId: 'abc<script>' }).success, false);
    assert.equal(receiptSchema.safeParse({ orderId: '../etc', txId: '123456' }).success, false);
  });

  test('nameSchema allows unicode names, rejects markup', () => {
    assert.equal(nameSchema.safeParse('عبد الكريم').success, true);
    assert.equal(nameSchema.safeParse('Jean-Pierre').success, true);
    assert.equal(nameSchema.safeParse('<img onerror=x>').success, false);
  });

  test('quantitySchema requires positive integers', () => {
    assert.equal(quantitySchema.safeParse(3).success, true);
    assert.equal(quantitySchema.safeParse(-1).success, false);
    assert.equal(quantitySchema.safeParse(2.5).success, false);
    assert.equal(quantitySchema.safeParse(1e9).success, false);
  });

  test('parseBody returns structured failure instead of throwing', () => {
    const bad = parseBody({ txId: 'hack' }, receiptSchema);
    assert.equal(bad.ok, false);
    const good = parseBody({ orderId: 'o1', txId: '1234567890' }, receiptSchema);
    assert.equal(good.ok, true);
  });
});

// ---------------------------------------------------------------
// 9) إخفاء الأخطاء (Error Masking)
// ---------------------------------------------------------------

describe('API error handling', () => {
  test('ApiError keeps its safe message and status', async () => {
    const res = fail(new ApiError(403, 'Forbidden', 'forbidden'));
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'Forbidden', code: 'forbidden' });
  });

  test('unknown errors are masked to generic 500 (no stack leak)', async () => {
    const res = fail(new Error('DB_CONNECTION_REFUSED at /secret/path: super secret'));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'Internal server error');
    assert.ok(!JSON.stringify(body).includes('secret'));
  });

  test('ok wraps success payload', async () => {
    const res = ok({ done: true });
    assert.deepEqual(await res.json(), { done: true });
  });
});
