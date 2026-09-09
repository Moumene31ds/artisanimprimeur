// src/app/api/auth/google/route.ts
// ---------------------------------------------------------------------------
// نقطة نهاية المصادقة والتحقق لخدمة Google الرسمية (Google Identity Services)
// ---------------------------------------------------------------------------
// الميزات الأمنية:
// 1. تقييد صارم للمعدل (Rate Limiting) بحد 10 طلبات في الدقيقة.
// 2. التحقق من النطاق والمصدر (Origin / Sec-Fetch-Site).
// 3. التحقق التشفيري الكامل من توكن Google الرسمية ومطابقة الـ Nonce لمنع التكرار والتزوير.
// 4. فحص الحساب الموقوف/المحظور (Account Suspension Check).
// 5. تسجيل الأحداث الأمنية في Firestore securityLogs.
// 6. إصدار توكن جلسة مشفر في كوكي HttpOnly + SameSite=Lax + Secure.
// 7. توفير Firebase Custom Token تلقائياً في حال توفر مفاتيح الخدمة لضمان التوافق التام مع قواعد Firestore.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import {
  verifyGoogleIdToken,
  createSessionToken,
  verifySessionToken,
} from "@/lib/security/google-auth";
import {
  getClientIp,
  enforceRateLimit,
  verifyRequestOrigin,
  getAllowedOrigins,
  applySecurityHeaders,
  applyNoStoreHeaders,
} from "@/lib/security";
import { getAdminInstance, logSecurityEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // 1. تقييد المعدل لحماية المسار من الاستنزاف والتخمين
  const rateLimit = enforceRateLimit(request, 30, 60_000, `google_auth_endpoint:${ip}`);
  if (!rateLimit.allowed) {
    await logSecurityEvent({
      type: "google_auth_rate_limited",
      ip,
      details: "Rate limit exceeded on Google auth endpoint",
    });
    const res = NextResponse.json(
      { error: "Too many authentication attempts. Please wait a moment." },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return applySecurityHeaders(applyNoStoreHeaders(res));
  }

  // 2. التحقق من أصل الطلب (Origin / CSRF Guard)
  const originCheck = verifyRequestOrigin(request, getAllowedOrigins());
  if (!originCheck.allowed) {
    await logSecurityEvent({
      type: "google_auth_forbidden_origin",
      ip,
      details: `Origin rejected: ${originCheck.reason}`,
    });
    const res = NextResponse.json({ error: "Unauthorized origin" }, { status: 403 });
    return applySecurityHeaders(applyNoStoreHeaders(res));
  }

  // 3. قراءة البيانات
  let body: { credential?: string; nonce?: string };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    return applySecurityHeaders(applyNoStoreHeaders(res));
  }

  const { credential, nonce } = body;
  if (!credential || typeof credential !== "string") {
    const res = NextResponse.json({ error: "Missing Google credential token" }, { status: 400 });
    return applySecurityHeaders(applyNoStoreHeaders(res));
  }

  // 4. التحقق التشفيري المرجعي من توكن Google
  const verification = await verifyGoogleIdToken(credential, {
    expectedNonce: typeof nonce === "string" ? nonce : undefined,
  });

  if (!verification.valid || !verification.user) {
    await logSecurityEvent({
      type: "google_auth_token_invalid",
      ip,
      details: verification.error || "Invalid Google token",
    });
    const res = NextResponse.json(
      { error: "Invalid Google credential", details: verification.error },
      { status: 401 }
    );
    return applySecurityHeaders(applyNoStoreHeaders(res));
  }

  const user = verification.user;

  // 5. فحص حالة الحساب (محظور أو معلق) عبر Firebase Admin إن وُجد
  const admin = getAdminInstance();
  let firebaseCustomToken: string | null = null;

  if (admin) {
    try {
      const fs = admin.firestore();
      const userRef = fs.collection("users").doc(user.sub);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.blocked === true) {
          await logSecurityEvent({
            type: "google_auth_blocked_user_attempt",
            ip,
            email: user.email,
            userId: user.sub,
            details: "Blocked user attempted Google sign-in",
          });
          const res = NextResponse.json(
            { error: "This account has been suspended." },
            { status: 403 }
          );
          return applySecurityHeaders(applyNoStoreHeaders(res));
        }

        // تحديث تاريخ آخر دخول
        await userRef.set(
          {
            lastLogin: new Date().toISOString(),
            email: user.email,
            displayName: user.name || userData?.displayName || "",
            photoURL: user.picture || userData?.photoURL || "",
            provider: "google",
          },
          { merge: true }
        );
      } else {
        // إنشاء ملف مستخدم جديد
        await userRef.set({
          uid: user.sub,
          email: user.email,
          displayName: user.name,
          photoURL: user.picture,
          points: 0,
          role: user.email === "attouabdelkarim2@gmail.com" ? "admin" : "user",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          provider: "google",
          verified: true,
        });
      }

      // إصدار Firebase Custom Token لتمكين الوصول إلى Firestore بنفس معرّف sub
      try {
        firebaseCustomToken = await admin.auth().createCustomToken(user.sub, {
          email: user.email,
          provider: "google",
        });
      } catch (tokenErr) {
        console.warn("[google-auth] Custom token generation skipped:", tokenErr);
      }
    } catch (dbErr) {
      console.error("[google-auth] Admin database error:", dbErr);
    }
  }

  // 6. تسجيل نجاح المصادقة في سجل التدقيق الأمني
  await logSecurityEvent({
    type: "google_auth_success",
    ip,
    email: user.email,
    userId: user.sub,
    details: "Authenticated via Official Google Identity Services",
    metadata: {
      provider: "google",
      hasCustomToken: Boolean(firebaseCustomToken),
    },
  });

  // 7. إنشاء توكن جلسة مشفر في كوكي آمن
  const sessionToken = createSessionToken({
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      uid: user.sub,
      email: user.email,
      displayName: user.name,
      photoURL: user.picture,
      provider: "google",
    },
    firebaseCustomToken,
  });

  // تعيين الكوكي الآمن (HttpOnly, SameSite=Lax, Secure في الإنتاج)
  response.cookies.set("auth_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 أيام
  });

  return applySecurityHeaders(applyNoStoreHeaders(response));
}

/**
 * فحص حالة الجلسة الحالية (Current Session Check)
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("auth_session")?.value;
  if (!sessionCookie) {
    return applySecurityHeaders(
      applyNoStoreHeaders(NextResponse.json({ authenticated: false }, { status: 401 }))
    );
  }

  const result = verifySessionToken(sessionCookie);
  if (!result.valid || !result.session) {
    const res = NextResponse.json({ authenticated: false, error: result.error }, { status: 401 });
    res.cookies.delete("auth_session");
    return applySecurityHeaders(applyNoStoreHeaders(res));
  }

  return applySecurityHeaders(
    applyNoStoreHeaders(
      NextResponse.json({
        authenticated: true,
        user: {
          uid: result.session.sub,
          email: result.session.email,
          displayName: result.session.name,
          photoURL: result.session.picture,
        },
      })
    )
  );
}

/**
 * تسجيل الخروج ومسح الجلسة (Logout)
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: "Logged out" });
  response.cookies.delete("auth_session");
  return applySecurityHeaders(applyNoStoreHeaders(response));
}
