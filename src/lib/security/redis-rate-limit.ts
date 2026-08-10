// ---------------------------------------------------------------------------
// src/lib/security/redis-rate-limit.ts — تقييد معدل موزّع (Edge-safe)
// ---------------------------------------------------------------------------
// يستخدم Upstash Redis عبر REST (يعمل في Edge/Middleware) كطبقة أولى،
// مع تراجع تلقائي إلى الذاكرة المحلية عند غياب الإعداد — فلا يكسر النشر أبداً.
//
// مفاتيح البيئة:
//   UPSTASH_REDIS_REST_URL    (اختياري) — يفعّل Redis الموزّع
//   UPSTASH_REDIS_REST_TOKEN  (اختياري)
//
// لماذا Redis؟ تقييد الذاكرة المحلية يعمل لكل مثيل (Instance) فقط؛
// مع Redis يصبح الحد موحّداً عبر كل مثيلات الخادم في Vercel/Edge.
// ---------------------------------------------------------------------------

import type { NextRequest } from 'next/server';
import { getClientIp } from './index';

export interface EdgeRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // طابع زمني ms
  retryAfterSeconds: number;
  limit: number;
  source: 'redis' | 'memory';
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_ENABLED = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ---------------------------------------------------------------
// تخزين احتياطي في الذاكرة (نافذة ثابتة مع تنظيف دوري + سقف حجم)
// ---------------------------------------------------------------
interface Bucket {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, Bucket>();
const MAX_MEMORY_BUCKETS = 5000;
let lastPrune = 0;

function pruneMemory(now: number) {
  if (now - lastPrune < 30_000) return;
  lastPrune = now;
  for (const [k, b] of memoryStore) {
    if (now > b.resetAt) memoryStore.delete(k);
  }
  if (memoryStore.size > MAX_MEMORY_BUCKETS) {
    const sorted = [...memoryStore.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (let i = 0; i < memoryStore.size - MAX_MEMORY_BUCKETS; i++) memoryStore.delete(sorted[i][0]);
  }
}

function memoryCheck(key: string, limit: number, windowMs: number, now: number): EdgeRateLimitResult {
  pruneMemory(now);
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs, retryAfterSeconds: 0, limit, source: 'memory' };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)), limit, source: 'memory' };
  }
  entry.count += 1;
  memoryStore.set(key, entry);
  return { allowed: true, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt, retryAfterSeconds: 0, limit, source: 'memory' };
}

// ---------------------------------------------------------------
// واجهة Upstash REST (INCR + EXPIRE + TTL عبر fetch فقط — Edge-safe)
// ---------------------------------------------------------------
async function redisCheck(key: string, limit: number, windowSec: number): Promise<EdgeRateLimitResult> {
  const endpoint = `${UPSTASH_URL}/pipeline`;
  const auth = UPSTASH_TOKEN ? { Authorization: `Bearer ${UPSTASH_TOKEN}` } : undefined;
  const now = Date.now();

  // INCR ثم EXPIRE (فقط عند القيمة الأولى) ثم TTL — كوحدة واحدة عبر pipeline.
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify([
      ['INCR', `rl:${key}`],
      ['EXPIRE', `rl:${key}`, windowSec, 'NX'],
      ['TTL', `rl:${key}`],
    ]),
    signal: AbortSignal.timeout(2_000),
  });

  if (!res.ok) throw new Error(`Upstash status ${res.status}`);

  const rows = (await res.json()) as unknown[];
  const count = Number((rows[0] as any)?.result ?? 0);
  const ttl = Number((rows[2] as any)?.result ?? windowSec);

  const resetAt = now + ttl * 1000;
  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt, retryAfterSeconds: Math.max(1, ttl), limit, source: 'redis' };
  }
  return { allowed: true, remaining: Math.max(0, limit - count), resetAt, retryAfterSeconds: 0, limit, source: 'redis' };
}

/** توليد مفتاح تقييد موحّد: IP + مسار + نطاق اختياري (uid / إيميل). */
export function buildRateLimitKey(
  request: NextRequest,
  scope: string,
  namespace = 'edge'
): string {
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname.replace(/\/+/g, '_').slice(0, 80);
  return `${namespace}:${scope}:${path}:${ip}`;
}

/**
 * فرض حد معدل — Redis إن كان مفعّلاً وإلا الذاكرة المحلية.
 * يُستدعى من middleware للطرق العامة، ومن الـ API routes للطرق الخاصة.
 */
export async function enforceRateLimitEdge(
  request: NextRequest,
  limit: number,
  windowMs: number,
  key?: string
): Promise<EdgeRateLimitResult> {
  const bucket = key ?? buildRateLimitKey(request, 'default');
  const windowSec = Math.max(1, Math.round(windowMs / 1000));

  if (REDIS_ENABLED) {
    try {
      return await redisCheck(bucket, limit, windowSec);
    } catch (err) {
      console.warn('[rate-limit] Redis failed, falling back to memory:', (err as Error)?.message ?? err);
    }
  }
  return memoryCheck(bucket, limit, windowMs, Date.now());
}
