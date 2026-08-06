import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fsGet, fsCreate, fsPatch } from "@/lib/firestore-rest";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const userId = String(body?.userId || "");
    const signedPoints = Math.round(Number(body?.points) || 0);
    const reason = String(body?.reason || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }
    if (signedPoints === 0) {
      return NextResponse.json({ error: "points doit être différent de 0" }, { status: 400 });
    }

    const user = await fsGet(admin.uid, `users/${userId}`);
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // تسجيل المعاملة (تعديل يدوي من الأدمن)
    await fsCreate(admin.uid, "pointTransactions", {
      userId,
      type: "adjust",
      points: signedPoints,
      title: `Ajustement manuel (admin): ${reason || "sans motif"}`,
      titleAr: `تعديل يدوي (أدمن): ${reason || "بدون سبب"}`,
      reason,
      adjustedBy: admin.email,
      createdAt: new Date().toISOString(),
    });

    // تحديث كاش المستخدم
    const newPoints = Math.max(0, (Number(user.points) || 0) + signedPoints);
    await fsPatch(admin.uid, `users/${userId}`, {
      points: newPoints,
      lastPointsAdjustment: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, userId, adjusted: signedPoints, newPoints });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
