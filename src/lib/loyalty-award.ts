// ---------------------------------------------------------------------------
// loyalty-award.ts — منح نقاط الولاء تلقائياً عند إتمام الطلب (Terminé).
//
// يستخدم Firestore REST بحساب المشرف لضمان كتابة آمنة تتجاوز قواعد العملاء.
// العملية Idempotent: تُسجَّل كل جائزة في مجموعة loyaltyAwards بمفتاح
// orderId حتى لا تُمنح النقاط مرتين مهما تكرر الاستدعاء.
// ---------------------------------------------------------------------------

import { fsGet, fsPatch, fsCreate } from "@/lib/firestore-rest";
import { getTierForSpending, getPointsForAmount } from "@/lib/loyalty";

const LOYALTY_AWARDS = "loyaltyAwards";

export interface AwardResult {
  awarded: boolean;
  alreadyAwarded?: boolean;
  skipped?: string;
  pointsAwarded?: number;
  orderId?: string;
  userId?: string;
  tierId?: string;
}

/**
 * يمنح نقاط الولاء لطلب مكتمل. آمن للاستدعاء المتكرر (idempotent).
 * @param adminToken معرف Firebase ID Token للمشرف.
 * @param orderId معرف الطلب.
 */
export async function awardPointsForOrder(adminToken: string, orderId: string): Promise<AwardResult> {
  if (!orderId) return { awarded: false, skipped: "missing-order-id" };

  // 1) هل مُنحت النقاط مسبقاً؟
  const existing = await fsGet(adminToken, `${LOYALTY_AWARDS}/${orderId}`);
  if (existing) {
    return { awarded: false, alreadyAwarded: true, orderId };
  }

  // 2) قراءة الطلب
  const order = await fsGet(adminToken, `orders/${orderId}`);
  if (!order) return { awarded: false, skipped: "order-not-found", orderId };

  // 3) فقط الطلبات المكتملة فعلياً تُمنح نقاطاً
  if (order.status !== "Terminé") {
    return { awarded: false, skipped: "not-completed", orderId };
  }

  // 4) الطلبات الضيف لا تمنح نقاطاً (لا حساب)
  const userId = order.customerUserId;
  if (!userId || userId === "guest") {
    await fsCreate(
      adminToken,
      LOYALTY_AWARDS,
      {
        orderId,
        userId: userId || null,
        total: Number(order.total) || 0,
        status: "skipped-guest",
        awardedAt: new Date().toISOString(),
      },
      orderId
    ).catch(() => {});
    return { awarded: false, skipped: "guest-order", orderId };
  }

  // 5) حساب النقاط مع مضاعف مستوى العميل (بناءً على إنفاقه مدى الحياة)
  const user = await fsGet(adminToken, `users/${userId}`);
  const lifetimeSpending = Number(user?.lifetimeSpending) || 0;
  const tier = getTierForSpending(lifetimeSpending);
  const total = Number(order.total) || 0;
  const points = getPointsForAmount(total, tier.multiplier);

  // 6) تسجيل الجائزة (idempotent) — يُكتب أولاً كضمانة ضد الازدواجية
  await fsCreate(
    adminToken,
    LOYALTY_AWARDS,
    {
      orderId,
      userId,
      orderTotal: total,
      basePoints: Math.floor(total / 100),
      multiplier: tier.multiplier,
      pointsAwarded: points,
      tierId: tier.id,
      status: "completed",
      awardedAt: new Date().toISOString(),
    },
    orderId
  );

  // 7) تسجيل معاملة نقاط للعميل
  if (points > 0) {
    await fsCreate(adminToken, "pointTransactions", {
      userId,
      orderId,
      type: "earned",
      points,
      title: `Points fidélité - commande #${orderId.slice(-6).toUpperCase()}`,
      titleAr: `نقاط ولاء - الطلب #${orderId.slice(-6).toUpperCase()}`,
      tierId: tier.id,
      multiplier: tier.multiplier,
      createdAt: new Date().toISOString(),
    });
  }

  // 8) تحديث كاش المستخدم: مجموع النقاط + الإنفاق مدى الحياة
  const currentPoints = Number(user?.points) || 0;
  const patch: Record<string, any> = {
    points: currentPoints + points,
    lifetimeSpending: lifetimeSpending + total,
    lastPointsAward: new Date().toISOString(),
  };
  await fsPatch(adminToken, `users/${userId}`, patch).catch((err: any) => {
    console.error("[loyalty-award] Failed to update user cache:", err?.message);
  });

  return {
    awarded: true,
    orderId,
    userId,
    pointsAwarded: points,
    tierId: tier.id,
  };
}
