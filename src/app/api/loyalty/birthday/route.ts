import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsGet, fsCreate, fsPatch } from "@/lib/firestore-rest";
import { getLoyaltySettings } from "@/lib/loyalty-config";
import { computeLoyaltyProfile } from "@/lib/loyalty-profile";
import { getTierForSpending } from "@/lib/loyalty";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyIdToken(bearerToken(request.headers.get("authorization")));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uid = user.uid;
    const body = await request.json();
    const action = body?.action || "save";

    const settings = await getLoyaltySettings(uid);
    const { config } = settings;

    // قراءة بيانات المستخدم الحالية
    const userDoc = await fsGet(uid, `users/${uid}`).catch(() => null);
    const userRef = `users/${uid}`;

    if (action === "save") {
      // حفظ تاريخ الميلاد (YYYY-MM-DD)
      const birthday = String(body?.birthday || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        return NextResponse.json({ success: false, error: "Format de date invalide" }, { status: 400 });
      }
      const parsed = new Date(birthday);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, error: "Date de naissance invalide" }, { status: 400 });
      }

      await fsPatch(uid, userRef, { birthday }).catch(() => {});
      const profile = await computeLoyaltyProfile(uid, uid);
      return NextResponse.json({ success: true, saved: true, birthday, profile });
    }

    if (action === "claim") {
      const birthday = userDoc?.birthday || null;
      if (!birthday) {
        return NextResponse.json({ success: false, error: "Aucune date d'anniversaire enregistrée" });
      }

      const currentYear = new Date().getFullYear();
      const claimedYear = Number(userDoc?.birthdayClaimYear) || 0;
      if (claimedYear === currentYear) {
        return NextResponse.json({ success: false, alreadyClaimed: true, error: "Bonus déjà réclamé cette année" });
      }

      // مكافأة عيد الميلاد (تتضاعف لمستوى البلاتين والأعلى)
      const spending = Number(userDoc?.lifetimeSpending) || 0;
      const tier = getTierForSpending(spending);
      const isPremium = tier.id === "platinum" || tier.id === "diamond";
      const points = (Number(config.birthdayBonus) || 0) * (isPremium ? 2 : 1);

      await fsCreate(uid, "pointTransactions", {
        userId: uid,
        type: "birthday",
        points,
        title: "Bonus anniversaire",
        titleAr: "هدية عيد الميلاد",
        tierId: tier.id,
        createdAt: new Date().toISOString(),
      }).catch(() => {});

      await fsPatch(uid, userRef, {
        birthdayClaimYear: currentYear,
        points: (Number(userDoc?.points) || 0) + points,
      }).catch(() => {});

      const profile = await computeLoyaltyProfile(uid, uid);
      return NextResponse.json({ success: true, pointsAwarded: points, profile });
    }

    return NextResponse.json({ success: false, error: "Action inconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
