import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsGet, fsCreate, fsPatch } from "@/lib/firestore-rest";
import { getLoyaltySettings } from "@/lib/loyalty-config";
import { computeLoyaltyProfile } from "@/lib/loyalty-profile";

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization")) as string;
    const user = await verifyIdToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uid = user.uid;
    const body = await request.json();
    const orderId = String(body?.orderId || "");

    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId requis" }, { status: 400 });
    }

    // التحقق: الطلب يجب أن يكون مكتملاً وليس ملغى وأن يكون الطلب للمستخدم نفسه
    const order = await fsGet(token, `orders/${orderId}`).catch(() => null);
    if (!order) {
      return NextResponse.json({ success: false, error: "Commande introuvable" }, { status: 404 });
    }
    if (order.customerUserId && order.customerUserId !== uid) {
      return NextResponse.json({ success: false, error: "Commande invalide" }, { status: 403 });
    }
    if (order.status === "Annulé") {
      return NextResponse.json({ success: false, error: "Commande annulée" }, { status: 400 });
    }

    // منع التكرار: معاملة مراجعة واحدة لكل طلب
    const existing = await fsGet(token, `users/${uid}/reviewBonuses/${orderId}`).catch(() => null);
    if (existing) {
      return NextResponse.json({ success: false, alreadyClaimed: true });
    }

    const settings = await getLoyaltySettings(token);
    const { config } = settings;
    const points = Number(config.reviewBonus) || 0;

    // تسجيل إثبات المكافأة لمنع الازدواج
    await fsCreate(
      token,
      `users/${uid}/reviewBonuses`,
      { orderId, points, createdAt: new Date().toISOString() },
      orderId
    ).catch(() => {});

    if (points > 0) {
      await fsCreate(token, "pointTransactions", {
        userId: uid,
        orderId,
        type: "review",
        points,
        title: `Bonus avis vérifié - commande #${orderId.slice(-6).toUpperCase()}`,
        titleAr: `مكافأة مراجعة موثقة - الطلب #${orderId.slice(-6).toUpperCase()}`,
        createdAt: new Date().toISOString(),
      }).catch(() => {});

      const userDoc = await fsGet(token, `users/${uid}`).catch(() => null);
      await fsPatch(token, `users/${uid}`, {
        points: (Number(userDoc?.points) || 0) + points,
      }).catch(() => {});
    }

    const profile = await computeLoyaltyProfile(token, uid);

    return NextResponse.json({ success: true, pointsAwarded: points, profile });
  } catch (err: any) {
    console.error("[review-bonus] failed:", err?.message ?? err);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez plus tard" }, { status: 500 });
  }
}
