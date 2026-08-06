// src/lib/admin-auth.ts
// تحقق موحّد من صلاحيات المشرف للـ API routes (نفس قائمة الإيميلات المستخدمة في
// /api/orders/production وقواعد Firestore).
import { NextRequest } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";

const RULES_ADMIN_EMAIL = "attouabdelkarim2@gmail.com";

const ADMIN_EMAILS = new Set(
  [
    ...(process.env.ADMIN_EMAILS || "").split(","),
    RULES_ADMIN_EMAIL,
  ]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export async function requireAdmin(
  request: NextRequest
): Promise<{ uid: string; email: string } | null> {
  const user = await verifyIdToken(bearerToken(request.headers.get("authorization")));
  if (!user?.email) return null;
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return null;
  return { uid: user.uid, email: user.email };
}
