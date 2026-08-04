// src/lib/rate-limit.ts
// Tiny in-memory sliding-window rate limiter for API routes.
// State is per Node process instance — good enough to blunt abuse of a single
// function (and the AI quota), even though it is not distributed.

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly maxHits: number
  ) {}

  /** Prune stale entries for a key (cheap guard against unbounded growth). */
  private prune(key: string): number[] {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length === 0) this.hits.delete(key);
    else this.hits.set(key, arr);
    return arr;
  }

  allow(key: string): { allowed: boolean; retryAfterMs: number } {
    const arr = this.prune(key);
    if (arr.length >= this.maxHits) {
      return { allowed: false, retryAfterMs: Math.max(1, this.windowMs - (Date.now() - arr[0])) };
    }
    arr.push(Date.now());
    this.hits.set(key, arr);
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key?: string) {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}

// Receipt verification is expensive (free AI quota + Firestore writes).
// 5 attempts per 10 minutes per user is generous for humans and blunts bots.
export const verifyReceiptLimiter = new SlidingWindowRateLimiter(10 * 60 * 1000, 5);

// General uploads: 30 per 15 minutes per client IP/user.
export const uploadLimiter = new SlidingWindowRateLimiter(15 * 60 * 1000, 30);
