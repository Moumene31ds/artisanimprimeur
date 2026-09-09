// src/app/api/auth/login-guard/route.ts
// ---------------------------------------------------------------------------
// حارس الدخول الخادمي — قفل تصاعدي ضد هجمات تخمين كلمات المرور (OWASP A07).
// ---------------------------------------------------------------------------
// القفل المحلي في صفحة الدخول (localStorage) يمكن تجاوزه بمسح التخزين أو
// التصفح الخفي؛ هذه الطبقة الخادمية مرجعية (authoritative) ومحصّنة:
//  - تُخزَّن حالات الفشل في Firestore عبر firebase-admin (لا يلمسها العميل).
//  - مفتاح القفل: البريد الإلكتروني المطبّع + عنوان IP (كلاهما يجب أن يتجاوز).
//  - عتبة: 5 إخفاقات خلال 15 دقيقة → قفل يتصاعد 15/30/60 دقيقة لكل تجاوز.
//  - بدون FIREBASE_SERVICE_ACCOUNT: يعمل كمرور صامت (allowed) دون كسر النشر.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/security";
import { getAdminInstance, logSecurityEvent } from "@/lib/audit";

const WINDOW_MS = 15 * 60 * 1000; // نافذة عد الإخفاقات
const MAX_FAILURES = 5;
const BASE_LOCK_MS = 15 * 60 * 1000; // القفل الأساسي
const MAX_LOCK_MULTIPLIER = 4; // سقف التصعيد: 60 دقيقة

interface LockDoc {
  fails: number;
  windowStart: number;
  lockoutUntil: number;
  lockCount: number;
}

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase().slice(0, 254) : "";
}

async function readLock(key: string): Promise<LockDoc | null> {
  const admin = getAdminInstance();
  if (!admin) return null;
  const snap = await admin.firestore().collection("authLockouts").doc(key).get();
  return snap.exists ? (snap.data() as LockDoc) : null;
}

export async function POST(request: NextRequest) {
  let body: { action?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const emailKey = `email:${email}`;
  const ipKey = `ip:${ip}`;

  try {
    switch (body.action) {
      case "check": {
        for (const key of [emailKey, ipKey]) {
          const lock = await readLock(key);
          if (lock && Date.now() < lock.lockoutUntil) {
            const retryAfterSeconds = Math.ceil((lock.lockoutUntil - Date.now()) / 1000);
            return NextResponse.json({
              locked: true,
              retryAfterSeconds,
              reason: key === emailKey ? "account" : "network",
            });
          }
        }
        return NextResponse.json({ locked: false });
      }

      case "fail": {
        const admin = getAdminInstance();
        if (!admin) return NextResponse.json({ ok: true, enforced: false });
        const fs = admin.firestore();

        for (const key of [emailKey, ipKey]) {
          const now = Date.now();
          const ref = fs.collection("authLockouts").doc(key);
          const lock = await readLock(key);
          const fresh = !lock || now - (lock.windowStart || 0) > WINDOW_MS;

          const fails = fresh ? 1 : (lock!.fails || 0) + 1;
          const windowStart = fresh ? now : lock!.windowStart;
          let lockoutUntil = lock?.lockoutUntil && lock.lockoutUntil > now ? lock.lockoutUntil : 0;
          let lockCount = lock?.lockCount || 0;

          if (fails >= MAX_FAILURES) {
            lockCount += 1;
            const multiplier = Math.min(lockCount, MAX_LOCK_MULTIPLIER);
            lockoutUntil = now + BASE_LOCK_MS * multiplier;
          }

          await ref.set({ fails, windowStart, lockoutUntil, lockCount }, { merge: true });

          if (lockoutUntil && fails >= MAX_FAILURES) {
            await logSecurityEvent({
              type: "brute_force_lockout_server",
              ip,
              details: `Server-enforced lockout on ${key === emailKey ? "account" : "IP"} (${lockCount}x escalation, ${Math.round((lockoutUntil - now) / 60000)}min).`,
              metadata: { email: key === emailKey ? email : undefined },
            });
          }
        }
        return NextResponse.json({ ok: true, enforced: true });
      }

      case "reset": {
        const admin = getAdminInstance();
        if (!admin) return NextResponse.json({ ok: true, enforced: false });
        const fs = admin.firestore();
        await fs.collection("authLockouts").doc(emailKey).delete().catch(() => {});
        // لا نمحو قفل IP عند نجاح الدخول — قد يكون مصدراً آخر لهجوم جارٍ.
        return NextResponse.json({ ok: true, enforced: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.warn("[login-guard] error:", (err as Error)?.message ?? err);
    // فشل البنية التحتية لا يجب أن يحجب المستخدمين الشرعيين أبداً.
    return NextResponse.json({ locked: false, degraded: true });
  }
}
