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

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization")) as string;
    const user = await verifyIdToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uid = user.uid;
    const body = await request.json();
    const rewardId = String(body?.rewardId || "");

    if (!rewardId) {
      return NextResponse.json({ success: false, error: "rewardId requis" }, { status: 400 });
    }

    const settings = await getLoyaltySettings(token);
    const reward = settings.rewards.find((r) => r.id === rewardId);
    if (!reward) {
      return NextResponse.json({ success: false, error: "Récompense introuvable" }, { status: 404 });
    }

    // التحقق من الرصيد
    const profile = await computeLoyaltyProfile(token, uid);
    if (profile.points < reward.points) {
      return NextResponse.json({ success: false, error: "Points insuffisants" }, { status: 400 });
    }

    // توليد كود خصم حصري
    const code = generateCode(`VIP-${reward.type.toUpperCase()}`);
    const codeData = {
      code,
      discountType: reward.type,
      discountValue: reward.value,
      minAmount: 0,
      active: true,
      isReward: true,
      ownerId: uid,
      createdAt: new Date().toISOString(),
    };
    await fsCreate(token, "promoCodes", codeData, code).catch(async () => {
      // لو حصل تعارض نادر في المعرّف، نجرب كوداً جديداً
      const retryCode = generateCode(`VIP-${reward.type.toUpperCase()}`);
      await fsCreate(token, "promoCodes", { ...codeData, code: retryCode }, retryCode);
      return retryCode;
    });

    // خصم النقاط
    await fsCreate(token, "pointTransactions", {
      userId: uid,
      type: "redeemed",
      points: -reward.points,
      rewardId: reward.id,
      title: `Échange : ${reward.title.fr}`,
      titleAr: `استبدال: ${reward.title.ar}`,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    const userDoc = await fsGet(token, `users/${uid}`).catch(() => null);
    await fsPatch(token, `users/${uid}`, {
      points: Math.max(0, (Number(userDoc?.points) || 0) - reward.points),
    }).catch(() => {});

    const updatedProfile = await computeLoyaltyProfile(token, uid);

    return NextResponse.json({
      success: true,
      code,
      reward,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("[redeem] failed:", err?.message ?? err);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez plus tard" }, { status: 500 });
  }
}
