// ---------------------------------------------------------------------------
// loyalty-profile.ts — حساب ملف الولاء الكامل للعميل على الخادم.
// يُستخدم في /api/loyalty/me و /api/loyalty/redeem لتجنب تكرار الحساب.
//
// طريقة حساب الرصيد (متوافقة مع السلوك القديم):
//   points = floor(إجمالي الإنفاق / 100) + Σ(معاملات النقاط) − Σ(نقاط الجوائز الممنوحة)
//
// النقطة الأولى تحسب "الأساس" التاريخي لكل الطلبات غير الملغاة (حتى لو لم
// تُمنح جوائزها بعد)، ومعاملات النقاط تحمل كل الكسب/الاستبدال/الألعاب، ونطرح
// الجوائز الممنوحة (basePoints) حتى لا نعدّ نفس الأساس مرتين عند إتمام الطلب.
// ---------------------------------------------------------------------------

import { fsGet, fsQuery, fsPatch } from "@/lib/firestore-rest";
import { getTierForSpending, getNextTier, LoyaltyTier } from "@/lib/loyalty";

export interface LoyaltyProfile {
  userId: string;
  points: number;
  lifetimeSpending: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  streak: number;
  lastCheckIn: string | null;
  totalCheckIns: number;
  canCheckIn: boolean;
  birthday: string | null;
  birthdayClaimYear: number | null;
  birthdayToday: boolean;
  referralCode: string | null;
  orderCount: number;
  completedOrderCount: number;
  transactions: any[];
  pointsToday: { earned: number; redeemed: number };
}

export async function computeLoyaltyProfile(token: string, uid: string): Promise<LoyaltyProfile> {
  const [user, orders, txs, awards, checkins] = await Promise.all([
    fsGet(token, `users/${uid}`).catch(() => null),
    fsQuery(token, {
      from: [{ collectionId: "orders" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "customerUserId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
    }).catch(() => []),
    fsQuery(token, {
      from: [{ collectionId: "pointTransactions" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
    }).catch(() => []),
    fsQuery(token, {
      from: [{ collectionId: "loyaltyAwards" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
    }).catch(() => []),
    fsGet(token, `loyalty_checkins/${uid}`).catch(() => null),
  ]);

  // --- الإنفاق والطلبات ---
  let spent = 0;
  let completedCount = 0;
  for (const o of orders) {
    if (o.status === "Annulé") continue;
    spent += Number(o.total) || 0;
    if (o.status === "Terminé") completedCount++;
  }

  // --- معاملات النقاط والجوائز ---
  const adjustments = txs.reduce((sum: number, t: any) => sum + (Number(t.points) || 0), 0);
  const awardedBase = awards.reduce((sum: number, a: any) => sum + (Number(a.basePoints) || 0), 0);
  const basePoints = Math.floor(spent / 100);
  const points = Math.max(0, basePoints + adjustments - awardedBase);

  const tier = getTierForSpending(spent);
  const nextTier = getNextTier(spent);

  // --- التسجيل اليومي (Streak) ---
  const lastCheckIn = checkins?.lastCheckIn ? new Date(checkins.lastCheckIn) : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const canCheckIn = !lastCheckIn || lastCheckIn.toISOString().slice(0, 10) !== todayStr;

  // --- عيد الميلاد ---
  const birthday = user?.birthday || null;
  const birthdayClaimYear = Number(user?.birthdayClaimYear) || null;
  const birthdayToday = birthday
    ? (() => {
        const d = new Date(birthday);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      })()
    : false;

  // --- نقاط اليوم (إحصاء) ---
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  let earnedToday = 0;
  let redeemedToday = 0;
  for (const t of txs) {
    const when = t.createdAt ? new Date(t.createdAt) : null;
    if (!when || when < todayStart) continue;
    const pts = Number(t.points) || 0;
    if (pts > 0) earnedToday += pts;
    else redeemedToday += Math.abs(pts);
  }

  // --- تحديث كاش المستخدم (نقاط + إنفاق + مستوى) لبقية الواجهات والأدمن ---
  const cachePatch: Record<string, any> = {
    points,
    lifetimeSpending: spent,
    tierId: tier.id,
  };
  if (birthday) cachePatch.birthday = birthday;
  await fsPatch(token, `users/${uid}`, cachePatch).catch(() => {});

  // --- تسلسل المعاملات ---
  const transactions = [...txs]
    .sort((a: any, b: any) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 100)
    .map((t: any) => ({
      id: t.id,
      type: t.type,
      points: Math.abs(Number(t.points) || 0),
      signed: Number(t.points) || 0,
      title: t.title || "",
      titleAr: t.titleAr || t.title || "",
      createdAt: t.createdAt || null,
    }));

  return {
    userId: uid,
    points,
    lifetimeSpending: spent,
    tier,
    nextTier,
    streak: Number(checkins?.streak) || 0,
    lastCheckIn: lastCheckIn ? lastCheckIn.toISOString() : null,
    totalCheckIns: Number(checkins?.totalCheckIns) || 0,
    canCheckIn,
    birthday,
    birthdayClaimYear,
    birthdayToday,
    referralCode: user?.referralCode || null,
    orderCount: orders.length,
    completedOrderCount: completedCount,
    transactions,
    pointsToday: { earned: earnedToday, redeemed: redeemedToday },
  };
}
