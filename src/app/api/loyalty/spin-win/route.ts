import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { fsGet, fsCreate, fsPatch } from "@/lib/firestore-rest";
import { getLoyaltySettings } from "@/lib/loyalty-config";
import { computeLoyaltyProfile } from "@/lib/loyalty-profile";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(prefix: string): string {
  let code = prefix.toUpperCase();
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

// القيم الوحيدة المسموح بها من عجلة الحظ (تطابق SPIN_PRIZES في صفحة المكافآت)
const ALLOWED_POINTS_PRIZES = [20, 50, 100];
const ALLOWED_PERCENT_VALUES = [10, 15];
const ALLOWED_FIXED_VALUES = [500, 700];

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization")) as string;
    const user = await verifyIdToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uid = user.uid;
    const body = await request.json();
    const spinId = String(body?.spinId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    const prize = body?.prize || {};
    const type = String(prize.type || "");
    const value = Number(prize.value) || 0;

    if (!["points", "percent", "fixed", "none"].includes(type)) {
      return NextResponse.json({ success: false, error: "Type de prix invalide" }, { status: 400 });
    }

    // التحقق من قيم الجائزة المسموح بها فقط
    if (type === "points" && !ALLOWED_POINTS_PRIZES.includes(value)) {
      return NextResponse.json({ success: false, error: "Prix non autorisé" }, { status: 400 });
    }
    if (type === "percent" && !ALLOWED_PERCENT_VALUES.includes(value)) {
      return NextResponse.json({ success: false, error: "Prix non autorisé" }, { status: 400 });
    }
    if (type === "fixed" && !ALLOWED_FIXED_VALUES.includes(value)) {
      return NextResponse.json({ success: false, error: "Prix non autorisé" }, { status: 400 });
    }

    const settings = await getLoyaltySettings(token);
    const spinCost = Number(settings.config.spinCost) || 0;

    const profile = await computeLoyaltyProfile(token, uid);
    if (profile.points < spinCost) {
      return NextResponse.json({ success: false, error: "Points insuffisants" }, { status: 400 });
    }

    // منع الازدواج: إذا عولج نفس الدوران مسبقاً لا نخصم النقاط مجدداً
    const dedupKey = `pointTransactions/spin_${spinId}`;
    if (spinId) {
      const already = await fsGet(token, dedupKey).catch(() => null);
      if (already) {
        const fresh = await computeLoyaltyProfile(token, uid);
        return NextResponse.json({ success: true, alreadyProcessed: true, profile: fresh });
      }
    }

    // 1) خصم تكلفة الدوران (وثيقة بمفتاح spinId لضمان التفرد)
    if (spinCost > 0) {
      await fsCreate(
        token,
        "pointTransactions",
        {
          userId: uid,
          type: "spin_cost",
          points: -spinCost,
          title: "Spin Wheel (cost)",
          titleAr: "دوران عجلة الحظ",
          createdAt: new Date().toISOString(),
        },
        spinId ? `spin_${spinId}` : undefined
      ).catch(() => {});
    }

    // 2) تسليم الجائزة
    let prizePoints = 0;
    let wonCode: string | null = null;

    if (type === "points") {
      prizePoints = value;
      await fsCreate(token, "pointTransactions", {
        userId: uid,
        type: "won",
        points: prizePoints,
        title: `Won points on Spin Wheel: +${prizePoints} Pts`,
        titleAr: `فوز بنقاط في عجلة الحظ: +${prizePoints} نقطة`,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    } else if (type === "percent" || type === "fixed") {
      wonCode = generateCode(`SPIN-${type.toUpperCase()}`);
      const codeData = {
        code: wonCode,
        discountType: type,
        discountValue: value,
        minAmount: 0,
        active: true,
        isReward: true,
        isFreeShipping: false,
        ownerId: uid,
        createdAt: new Date().toISOString(),
      };
      await fsCreate(token, "promoCodes", codeData, wonCode).catch(async () => {
        const retryCode = generateCode(`SPIN-${type.toUpperCase()}`);
        await fsCreate(token, "promoCodes", { ...codeData, code: retryCode }, retryCode);
        wonCode = retryCode;
      });
    }

    // 3) تحديث كاش نقاط المستخدم
    const userDoc = await fsGet(token, `users/${uid}`).catch(() => null);
    await fsPatch(token, `users/${uid}`, {
      points: Math.max(0, (Number(userDoc?.points) || 0) - spinCost + prizePoints),
      lastSpin: new Date().toISOString(),
    }).catch(() => {});

    const updatedProfile = await computeLoyaltyProfile(token, uid);

    return NextResponse.json({
      success: true,
      type,
      value,
      prizePoints,
      code: wonCode,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("[spin-win] failed:", err?.message ?? err);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez plus tard" }, { status: 500 });
  }
}
