import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsGet, fsCreate, fsPatch } from "@/lib/firestore-rest";
import { getLoyaltySettings } from "@/lib/loyalty-config";
import { computeLoyaltyProfile } from "@/lib/loyalty-profile";
import { diffInDays, todayKey } from "@/lib/loyalty";

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization")) as string;
    const user = await verifyIdToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uid = user.uid;
    const settings = await getLoyaltySettings(token);
    const { config } = settings;

    // 1) قراءة حالة التسجيل السابقة
    const checkinRef = `loyalty_checkins/${uid}`;
    const prev = await fsGet(token, checkinRef).catch(() => null);

    const prevDate = prev?.lastCheckIn ? new Date(prev.lastCheckIn) : null;
    if (prevDate && todayKey(prevDate) === todayKey()) {
      return NextResponse.json({ success: false, alreadyCheckedIn: true, error: "Déjà enregistré aujourd'hui" });
    }

    // 2) حساب الستريك
    let streak = 1;
    if (prevDate && diffInDays(prevDate, new Date()) === 1) {
      streak = (Number(prev?.streak) || 0) + 1;
    }
    const totalCheckIns = (Number(prev?.totalCheckIns) || 0) + 1;

    // 3) حساب النقاط + مكافأة الأسبوع الكامل
    let points = Number(config.dailyCheckInBase) || 0;
    if (streak % 7 === 0) {
      points += Number(config.dailyCheckInStreakBonus) || 0;
    }

    // 4) حفظ حالة التسجيل
    await fsPatch(
      token,
      checkinRef,
      {
        lastCheckIn: new Date().toISOString(),
        streak,
        totalCheckIns,
      }
    ).catch(() =>
      fsCreate(
        token,
        "loyalty_checkins",
        {
          lastCheckIn: new Date().toISOString(),
          streak,
          totalCheckIns,
          userId: uid,
        },
        uid
      )
    );

    // 5) تسجيل معاملة النقاط
    await fsCreate(token, "pointTransactions", {
      userId: uid,
      type: "daily_checkin",
      points,
      title: `Daily check-in (streak ${streak} days)`,
      titleAr: `تسجيل يومي (سلسلة ${streak} أيام)`,
      streak,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    // 6) تحديث كاش نقاط المستخدم
    const userDoc = await fsGet(token, `users/${uid}`).catch(() => null);
    await fsPatch(token, `users/${uid}`, {
      points: (Number(userDoc?.points) || 0) + points,
      lastCheckIn: new Date().toISOString(),
    }).catch(() => {});

    const profile = await computeLoyaltyProfile(token, uid);

    return NextResponse.json({
      success: true,
      pointsAwarded: points,
      streak,
      totalCheckIns,
      weeklyBonus: streak % 7 === 0,
      profile,
    });
  } catch (err: any) {
    console.error("[checkin] failed:", err?.message ?? err);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez plus tard" }, { status: 500 });
  }
}
