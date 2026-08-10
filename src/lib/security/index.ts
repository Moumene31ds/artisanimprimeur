import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// إعادة تصدير وحدات الأمان المتخصصة (تُستورد أيضاً مباشرة عند الحاجة).
export * from './csrf';
export * from './cors';
export * from './api-error';
export * from './redis-rate-limit';
export * from './schemas';
// ملاحظة: ./passwords يعتمد على node:crypto — لا يُصدَّر هنا كي يبقى هذا الملف
// edge-safe (middleware). يُستورد مباشرة من "@/lib/security/passwords" في API Routes فقط.

// ---------------------------------------------------------------------------
// security/index.ts — الطبقة الدفاعية المتقدمة للتطبيق (edge-safe middleware)
// ---------------------------------------------------------------------------
// 1) كشف الطلبات المشبوهة: ثغرات SQLi / XSS / مسار / حقن / روبوتات فحص.
// 2) تقييد معدل الطلبات لكل مسار (rate limiting) مع تنظيف الذاكرة ومنع تسربها.
// 3) رؤوس أمان صارمة (CSP و HSTS و COOP ... إلخ).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// تخزين تقييد المعدل مع منع تسرب الذاكرة (prune دوري + سقف للحجم)
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, Bucket>();
const MAX_BUCKETS = 6000; // حد أعلى للحجم لحماية الذاكرة من التوسع اللانهائي
let lastPrunedAt = 0;

/** تنظيف دوري للدلاء المنتهية، وإزالة الزائد عند تجاوز السقف. */
function pruneRateLimitStore(now: number) {
  if (now - lastPrunedAt < 60_000) return;
  lastPrunedAt = now;
  for (const [key, bucket] of rateLimitStore) {
    if (now > bucket.resetAt) rateLimitStore.delete(key);
  }
  if (rateLimitStore.size > MAX_BUCKETS) {
    const entries = [...rateLimitStore.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const overflow = rateLimitStore.size - MAX_BUCKETS;
    for (let i = 0; i < overflow; i++) rateLimitStore.delete(entries[i][0]);
  }
}

// ---------------------------------------------------------------------------
// حدود معدل خاصة بكل مسار حساس (تطبَّق تلقائياً في middleware)
// ---------------------------------------------------------------------------

export interface RouteRateLimit {
  match: RegExp;
  limit: number;
  windowMs: number;
}

export const ROUTE_RATE_LIMITS: RouteRateLimit[] = [
  // مصادقة (تسجيل/دخول): صارم لمنع تخمين كلمات المرور.
  { match: /^\/api\/auth\//, limit: 10, windowMs: 60_000 },
  // محادثة الذكاء الاصطناعي: يحمي حصة المزود المجاني من الاستغلال.
  { match: /^\/api\/chat/, limit: 40, windowMs: 60_000 },
  // توليد الصور بالذكاء الاصطناعي: مكلف → حد ساعي.
  { match: /^\/api\/generate-image/, limit: 25, windowMs: 60 * 60_000 },
  // رفع الملفات: يحمي حصة سحابة Cloudinary.
  { match: /^\/api\/upload/, limit: 30, windowMs: 15 * 60_000 },
  // التحقق من وصولات الدفع: منع إساءة استغلال معالجة الذكاء الاصطناعي.
  { match: /^\/api\/payments\/verify-receipt/, limit: 5, windowMs: 10 * 60_000 },
  // عجلة الحظ: منع التكرار الآلي للربح.
  { match: /^\/api\/loyalty\/spin-win/, limit: 6, windowMs: 60_000 },
  // إرسال الحملات التسويقية.
  { match: /^\/api\/marketing\/send/, limit: 10, windowMs: 60_000 },
  // إنشاء الطلبات عبر الشات.
  { match: /^\/api\/chat\/order-flow/, limit: 12, windowMs: 60_000 },
];

export function getRouteRateLimit(pathname: string): RouteRateLimit | null {
  for (const rule of ROUTE_RATE_LIMITS) {
    if (rule.match.test(pathname)) return rule;
  }
  return null;
}

// ---------------------------------------------------------------------------
// كشف الطلبات المشبوهة
// ---------------------------------------------------------------------------

const suspiciousPatterns = [
  // ثغرات الحقن عبر المسار (Path Traversal) بما فيها المشفَّرة.
  /(?:\.\.|%2e%2e|%2e%2f|\.\.\/|\.\.\\)/i,
  // حقن أسطر جديدة / CRLF.
  /(?:%0[09aA]|\\r\\n|\\r|\\n|%0d%0a)/i,
  // هجمات XSS (وسوم وسيدات أحداث).
  /<script|javascript:\s*[^"']|<iframe|<svg\s|onerror\s*=|onload\s*=|onclick\s*=|onmouseover\s*=/i,
  // حقن SQL.
  /union\s+select|select\s+.+\s+from|insert\s+into|drop\s+table|update\s+set|delete\s+from|alter\s+table|create\s+table/i,
  /or\s+1\s*=\s*1|'\s*or\s*'|" or "|--\s*$|;#/i,
  // حقن أوامر نظام التشغيل.
  /\b(?:cmd|curl|wget|bash|nc)\b|shell_exec|system\(|passthru|exec\(|eval\(|popen\(/i,
  // ملفات النظام الحساسة.
  /(?:\/etc\/passwd|\/etc\/shadow|\/proc\/self|\/\.ssh\/|C:\\Windows)/i,
  // حمولات مشفّرة (URL) للالتفاف على الفلاتر.
  /(?:%3c(?:script|iframe)|%3c%2f(?:script|iframe)|%24%7b|%22%20onerror)/i,
  // حقن قوالب JavaScript.
  /\$\{[^}]*\}/,
  // جلب بيانات المتصفح الحساسة.
  /document\.cookie|document\.domain|XMLHttpRequest|fetch\s*\(\s*['"]http/i,
] as RegExp[];

const blockedUserAgents = [
  // أدوات فحص الثغرات والروبوتات الخبيثة (لا نمنع Googlebot/Bing).
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /hydra/i,
  /nuclei/i,
  /nessus/i,
  /acunetix/i,
  /wpscan/i,
  /gobuster/i,
  /dirbuster/i,
  /openvas/i,
  /metasploit/i,
  /burpsuite/i,
  /libwww-perl/i,
  /zgrab/i,
  /headers\.js/i,
  /scrapy/i,
  /python-requests/i,
  /go-http-client/i,
  /dotbot/i,
  /maugetbot/i,
  /masscan/i,
] as RegExp[];

/** هل الطلب يحمل وكيل مستخدم غائب أو فارغ (مؤشر أتمتة)؟ */
export function hasMissingUserAgent(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') || '';
  return ua.trim().length === 0;
}

/** المسارات الداخلية التي يجوز لها العمل دون وكيل مستخدم (اتصال خادم-خادم). */
const UA_ALLOWED_PREFIXES = [
  '/api/build-info',
  '/api/cron/',
  '/api/orders/notify',
  '/api/whatsapp/webhook',
];

export function isInternalServerPath(pathname: string): boolean {
  return UA_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isSuspiciousRequest(request: NextRequest) {
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const userAgent = request.headers.get('user-agent') || '';

  // نسخة مفكوكة الترميز للالتفاف على فلاتر الترميز المزدوج
  // (URL-encoded payloads: %20OR%201=1 → OR 1=1، %3cscript%3e → <script>).
  let decoded = '';
  try {
    decoded = decodeURIComponent(path);
  } catch {
    decoded = path.replace(/%[0-9a-fA-F]{2}/g, '');
  }

  const combined = `${path}\n${decoded}\n${userAgent}`;

  return (
    suspiciousPatterns.some((pattern) => pattern.test(combined)) ||
    blockedUserAgents.some((pattern) => pattern.test(userAgent))
  );
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}

// ---------------------------------------------------------------------------
// تقييد معدل الطلبات
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  limit: number;
}

/**
 * فرض حد معدل لكل IP مع تنظيف ذاكرة دوري.
 * يمكن تمرير حد/نافذة مخصصين (يستعمله middleware تلقائياً لكل مسار).
 */
export function enforceRateLimit(
  request: NextRequest,
  limit = 120,
  windowMs = 60_000,
  key?: string
): RateLimitResult {
  const now = Date.now();
  pruneRateLimitStore(now);

  const ip = key || getClientIp(request);
  const bucketKey = `ip:${ip}`;
  const entry = rateLimitStore.get(bucketKey);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs, retryAfterSeconds: 0, limit };
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfterSeconds, limit };
  }

  entry.count += 1;
  rateLimitStore.set(bucketKey, entry);
  return { allowed: true, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt, retryAfterSeconds: 0, limit };
}

/** إضافة رؤوس حالة التقييد إلى الاستجابة. */
export function addRateLimitHeaders(response: NextResponse, info: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(info.limit));
  response.headers.set('X-RateLimit-Remaining', String(info.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)));
  if (!info.allowed) response.headers.set('Retry-After', String(info.retryAfterSeconds));
  return response;
}

// ---------------------------------------------------------------------------
// تنظيف مدخلات النصوص (Server-side) — يمنع تخزين محتوى خبيث
// ---------------------------------------------------------------------------

/** تطهير نص من رموز التحكم والوسوم — يُستعمل قبل الكتابة في قاعدة البيانات. */
export function sanitizeTextInput(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  let out = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ') // رموز تحكم + أحرف غير مرئية
    .replace(/<[^>]*>/g, '') // وسوم HTML
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > maxLength) out = out.slice(0, maxLength);
  return out;
}

/** تطبيع رقم هاتف (أرقام فقط مع + اختيارية) — يمنع حقن أرقام غير صالحة. */
export function sanitizePhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  const digits = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return digits.slice(0, 16);
}

/** تطبيع بريد إلكتروني: يزيل الفراغات/المحارف الخبيثة ويحوّل إلى حروف صغيرة. */
export function sanitizeEmail(value: unknown, maxLength = 254): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, maxLength);
}

/**
 * تعقيم عميق لكائن كامل (قبل تخزينه في قاعدة البيانات):
 *  - يعبُر كل الحقول نصوصاً وأرقاماً ومصفوفات وكائنات.
 *  - ينظّف النصوص بحد أقصى معيّن ويحذف المفاتيح التي تبدأ بـ "$" أو تحتوي "." (حماية NoSQLi).
 *  - يرفض الكائنات غير المحدودة الأعماق (حماية العمق العميق).
 */
export function sanitizeObject(
  value: unknown,
  opts: { maxDepth?: number; maxStringLength?: number } = {}
): unknown {
  const { maxDepth = 10, maxStringLength = 2000 } = opts;
  return deepSanitize(value, 0, maxDepth, maxStringLength);
}

function deepSanitize(value: unknown, depth: number, maxDepth: number, maxStringLength: number): unknown {
  if (depth > maxDepth) return null;

  if (typeof value === 'string') {
    return sanitizeTextInput(value, maxStringLength);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'boolean' || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item, depth + 1, maxDepth, maxStringLength));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // مفاتيح Firestore المحجوزة أو المتلاعب بها (حقن NoSQL) — رفض فوري.
      if (key.startsWith('$') || key.includes('.') || key.startsWith('__')) continue;
      out[key] = deepSanitize(val, depth + 1, maxDepth, maxStringLength);
    }
    return out;
  }
  return null;
}

/** تنظيم عدد صحيح موجب ضمن مدى معين. */
export function sanitizeQuantity(value: unknown, max = 100000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), max);
}

// ---------------------------------------------------------------------------
// رؤوس الأمان
// ---------------------------------------------------------------------------

export type CspDirectives = Record<string, string[]>;

/**
 * بناء سياسة CSP من كائن توجيهات — يسمح بتخصيص صارم لكل بيئة (أو عند نشر
 * الموقع على نطاق نهائي) دون المساس بالافتراضي القابل للتشغيل.
 */
export function buildCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

/**
 * CSP قياسي للبيئة الحالية. يُبنى من التوجيهات الافتراضية مع السماح بتجاوزها
 * كلياً عبر متغير البيئة CSP_POLICY (سلسلة CSP كاملة). لتحقيق صرامة قصوى:
 * أزل 'unsafe-inline' بعد التخلص من الـ inline scripts وفعّل nonces — انظر SECURITY.md.
 */
export function defaultCsp(): string {
  const override = process.env.CSP_POLICY;
  if (override) return override;

  return buildCsp({
    "default-src": ["'self'"],
    // 'unsafe-inline'/'unsafe-eval' مطلوبان لـ Next.js/React في الحالة الراهنة؛
    // الخطوة التالية الموصى بها: CSP بالنوانس (nonces) — انظر توثيق الحزمة.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://apis.google.com",
      "https://accounts.google.com",
      "https://*.google.com",
      "https://*.googleapis.com",
      "https://*.gstatic.com",
      "https://*.firebaseapp.com",
      "https://cdn.jsdelivr.net",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "https://res.cloudinary.com",
      "https://lh3.googleusercontent.com",
      "https://images.unsplash.com",
    ],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "connect-src": [
      "'self'",
      "https:",
      "wss:",
      "https://*.googleapis.com",
      "https://*.firebaseapp.com",
      "https://*.google.com",
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
    ],
    "frame-src": [
      "'self'",
      "https://apis.google.com",
      "https://accounts.google.com",
      "https://*.firebaseapp.com",
      "https://*.google.com",
    ],
    "frame-ancestors": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  });
}

/** هل طلب غير تصفحي (API / أتمتة)؟ نستخدمها لتجاوز رؤوس المتصفح عند اللزوم. */
export function isApiRequest(request: NextRequest): boolean {
  return request.nextUrl.pathname.startsWith('/api/');
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Content-Security-Policy', defaultCsp());
  return response;
}

/** منع التخزين المؤقت للاستجابات الحساسة (API ولوحة الإدارة). */
export function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
