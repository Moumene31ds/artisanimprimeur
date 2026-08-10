// ---------------------------------------------------------------------------
// src/lib/security/passwords.ts — تجزئة كلمات المرور (Node-only، ليست Edge)
// ---------------------------------------------------------------------------
// scrypt عبر crypto الأصلي في Node (بلا أي اعتماديات خارجية):
//  - ملح (Salt) عشوائي 16 بايت لكل كلمة مرور.
//  - معاملات عالية (N=2^17, r=8, p=1) مع مفاتيح 32 بايت.
//  - مقارنة ثابتة الزمن عبر timingSafeEqual.
//  - صيغة تخزين ذاتية الوصف:  scrypt$N$r$p$salt_b64$hash_b64
//
// ملاحظة: المصادقة الحالية تعتمد Firebase Auth (تدير التجزئة داخلياً).
// هذه الأداة جاهزة لأي حساب يعتمد كلمة مرور خاصة (مديرين، نسخ احتياطي...).
// ---------------------------------------------------------------------------

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEYLEN = 32;
const SALT_LEN = 16;
const SCRYPT_N = 131072; // 2^17 — مكلف عمداً لإبطاء هجمات القوة الغاشمة
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export interface PasswordOptions {
  n?: number;
  r?: number;
  p?: number;
  keylen?: number;
}

/** تجزئة كلمة مرور بملح جديد — تُستخدم عند الإنشاء أو تغيير كلمة المرور. */
export function hashPassword(password: string, options: PasswordOptions = {}): string {
  const n = options.n ?? SCRYPT_N;
  const r = options.r ?? SCRYPT_R;
  const p = options.p ?? SCRYPT_P;
  const keylen = options.keylen ?? KEYLEN;
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(password, salt, keylen, { N: n, r, p, maxmem: 128 * n * r * 2 });
  return `scrypt$${n}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** تحقق ثابت الزمن من كلمة مرور مقابل التجزئة المخزّنة. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  try {
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = scryptSync(password, salt, expected.length, { N: n, r, p, maxmem: 128 * n * r * 2 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** هل التجزئة تحتاج إلى إعادة تجزئة (مُعاملات أضعف من الحالية)؟ */
export function needsRehash(stored: string, options: PasswordOptions = {}): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  const n = Number(parts[1]);
  const target = options.n ?? SCRYPT_N;
  return n < target;
}
