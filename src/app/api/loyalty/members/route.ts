import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fsQuery } from "@/lib/firestore-rest";
import { getTierForSpending } from "@/lib/loyalty";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1) كل أعضاء النظام
    const users = await fsQuery(admin.uid, {
      from: [{ collectionId: "users" }],
      orderBy: [{ field: { fieldPath: "lifetimeSpending" }, direction: "DESCENDING" }],
    }).catch(() => []);

    // 2) آخر معاملات النقاط
    const transactions = await fsQuery(admin.uid, {
      from: [{ collectionId: "pointTransactions" }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit: 300,
    }).catch(() => []);

    // 3) عدد الجوائز الممنوحة (الطلبات المكتملة)
    const awards = await fsQuery(admin.uid, {
      from: [{ collectionId: "loyaltyAwards" }],
      orderBy: [{ field: { fieldPath: "awardedAt" }, direction: "DESCENDING" }],
      limit: 500,
    }).catch(() => []);

    const members = users.map((u: any) => ({
      id: u.id,
      email: u.email || "",
      displayName: u.displayName || u.email?.split("@")[0] || "Client",
      photoUrl: u.photoUrl || null,
      points: Number(u.points) || 0,
      lifetimeSpending: Number(u.lifetimeSpending) || 0,
      tier: getTierForSpending(Number(u.lifetimeSpending) || 0).id,
      referralCode: u.referralCode || null,
      lastInteraction: u.lastInteraction || u.createdAt || null,
    }));

    const tierCounts: Record<string, number> = {};
    let totalPoints = 0;
    let totalSpending = 0;
    for (const m of members) {
      tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1;
      totalPoints += m.points;
      totalSpending += m.lifetimeSpending;
    }

    const pointsIssued = awards.reduce((s: number, a: any) => s + (Number(a.pointsAwarded) || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalMembers: members.length,
        totalPoints,
        totalSpending,
        pointsIssued,
        ordersAwarded: awards.length,
        tierCounts,
      },
      members,
      transactions: transactions.slice(0, 150).map((t: any) => ({
        id: t.id,
        userId: t.userId,
        type: t.type,
        points: Number(t.points) || 0,
        title: t.titleAr || t.title || "",
        createdAt: t.createdAt || null,
      })),
      awards: awards.slice(0, 100).map((a: any) => ({
        orderId: a.id,
        userId: a.userId,
        pointsAwarded: Number(a.pointsAwarded) || 0,
        tierId: a.tierId,
        awardedAt: a.awardedAt || null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
