// src/lib/security/google-auth.ts
// ---------------------------------------------------------------------------
// وحدة الأمان والتحقق التشفيري لخدمة تسجيل الدخول الرسمية من Google (GIS)
// ---------------------------------------------------------------------------
// تتضمن:
// 1. التحقق التشفيري الصارم من توكنات Google (ID Tokens).
// 2. فحص المُصدِر (iss)، والجمهور المستهدف (aud)، والبريد المفعّل (email_verified).
// 3. التحقق من Nonce لمكافحة هجمات الإعادة (Anti-Replay Attack Protection).
// 4. إدارة جلسات خادمية مشفرة بـ HMAC-SHA256 (HttpOnly Cookies).
// 5. تعقيم وتطهير بيانات المستخدم القادمة من Google.
// ---------------------------------------------------------------------------

import crypto from "crypto";

export interface GoogleTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  email: string;
  email_verified: boolean | string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  nonce?: string;
  iat: number;
  exp: number;
}

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
  emailVerified: boolean;
  provider: "google";
}

/**
 * توليد Nonce تشفيري عشوائي لحماية عملية المصادقة من هجمات الإعادة (Replay Attacks).
 */
export function generateAuthNonce(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * التحقق الصارم من تطابق الـ Nonce لمنع التزوير.
 */
export function verifyAuthNonce(receivedNonce?: string, expectedNonce?: string): boolean {
  if (!receivedNonce || !expectedNonce) return false;
  if (receivedNonce.length !== expectedNonce.length) return false;
  return crypto.timingSafeEqual(Buffer.from(receivedNonce), Buffer.from(expectedNonce));
}

/**
 * فك تشفير حمولة JWT بدون التحقق (للقراءة الأولية قبل التحقق التشفيري).
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * التحقق التشفيري الصارم من توكن Google ID Token:
 * - فحص بنية التوكن.
 * - الاستعلام من نقطة نهاية التحقق الرسمية لـ Google (tokeninfo) للتحقق من التوقيع الرقمي وصلاحيته.
 * - التحقق من أن المُصدِر هو Google (accounts.google.com أو https://accounts.google.com).
 * - التحقق من مطابقة معرف العميل (aud).
 * - التحقق من تفعيل البريد الإلكتروني.
 * - التحقق من تاريخ انتهاء الصلاحية.
 * - التحقق من الـ Nonce عند تمريره.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  options: {
    clientId?: string;
    expectedNonce?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<{ valid: boolean; user?: VerifiedGoogleUser; error?: string }> {
  if (!idToken || typeof idToken !== "string") {
    return { valid: false, error: "Missing or invalid token format" };
  }

  // 1. فحص أولي لشكل التوكن
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWT" };
  }

  const payloadPreview = decodeJwtPayload(idToken);
  if (!payloadPreview) {
    return { valid: false, error: "Invalid JWT payload" };
  }

  // 2. التحقق من انتهاء الصلاحية
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (typeof payloadPreview.exp === "number" && payloadPreview.exp < nowInSeconds) {
    return { valid: false, error: "Token has expired" };
  }

  // 3. التحقق من المصدر (iss)
  const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
  if (!validIssuers.includes(payloadPreview.iss)) {
    return { valid: false, error: `Invalid issuer: ${payloadPreview.iss}` };
  }

  // 4. التحقق من معرف العميل (aud) إن حُدد
  const targetClientId = options.clientId || process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (targetClientId && payloadPreview.aud !== targetClientId) {
    return { valid: false, error: `Audience mismatch: expected ${targetClientId}` };
  }

  // 5. التحقق من تفعيل البريد
  const emailVerified = payloadPreview.email_verified === true || payloadPreview.email_verified === "true";
  if (!emailVerified) {
    return { valid: false, error: "Google email is not verified" };
  }

  // 6. التحقق من Nonce لمكافحة هجمات الإعادة
  if (options.expectedNonce) {
    if (!verifyAuthNonce(payloadPreview.nonce, options.expectedNonce)) {
      return { valid: false, error: "Nonce mismatch / Replay attack detected" };
    }
  }

  // 7. التحقق التشفيري المرجعي عبر نقطة نهاية Google الرسمية (Google tokeninfo API)
  const fetchFn = options.fetchImpl || fetch;
  try {
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const res = await fetchFn(tokenInfoUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { valid: false, error: `Google verification failed: ${res.status} ${errText}` };
    }

    const verifiedPayload = (await res.json()) as GoogleTokenPayload;

    // إعادة تأكيد الشروط الحيوية من الاستجابة الرسمية
    if (!validIssuers.includes(verifiedPayload.iss)) {
      return { valid: false, error: "Invalid issuer in Google verified response" };
    }
    if (targetClientId && verifiedPayload.aud !== targetClientId) {
      return { valid: false, error: "Audience mismatch in Google verified response" };
    }
    if (verifiedPayload.email_verified !== true && verifiedPayload.email_verified !== "true") {
      return { valid: false, error: "Email not verified by Google" };
    }

    // تعقيم وتطهير بيانات المستخدم
    const sanitizedEmail = String(verifiedPayload.email || "").trim().toLowerCase().slice(0, 254);
    const sanitizedName = String(verifiedPayload.name || verifiedPayload.given_name || "Google User")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 100);
    const sanitizedPicture = typeof verifiedPayload.picture === "string" && verifiedPayload.picture.startsWith("https://")
      ? verifiedPayload.picture
      : "";

    return {
      valid: true,
      user: {
        sub: verifiedPayload.sub,
        email: sanitizedEmail,
        name: sanitizedName,
        picture: sanitizedPicture,
        emailVerified: true,
        provider: "google",
      },
    };
  } catch (err: any) {
    return { valid: false, error: `Network/verification error: ${err?.message || err}` };
  }
}

// ---------------------------------------------------------------------------
// إدارة جلسات آمنة مشفرة بتوقيع HMAC-SHA256 (HttpOnly Cookie Sessions)
// ---------------------------------------------------------------------------

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.FIREBASE_API_KEY || "artisan-imprimeur-google-secure-session-key-2026";
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: number;
  exp: number;
}

/**
 * إنشاء توكن جلسة آمن وموقع تشفيرياً بـ HMAC-SHA256.
 */
export function createSessionToken(payload: Omit<SessionPayload, "createdAt" | "exp">, expiresInSeconds = 7 * 24 * 3600): string {
  const secret = getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    createdAt: now,
    exp: now + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * التحقق التشفيري الصارم من توكن الجلسة واستخراج الحمولة.
 */
export function verifySessionToken(token: string): { valid: boolean; session?: SessionPayload; error?: string } {
  if (!token || typeof token !== "string") return { valid: false, error: "Empty token" };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, error: "Invalid token structure" };

  const [payloadB64, signature] = parts;
  const secret = getSessionSecret();

  const expectedSig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  if (signature.length !== expectedSig.length) return { valid: false, error: "Signature length mismatch" };
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  if (!valid) return { valid: false, error: "Invalid session signature" };

  try {
    const session = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (session.exp && session.exp < now) {
      return { valid: false, error: "Session expired" };
    }
    return { valid: true, session };
  } catch {
    return { valid: false, error: "Corrupted session payload" };
  }
}
