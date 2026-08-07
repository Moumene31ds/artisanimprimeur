import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { bearerToken } from "@/lib/auth-verify";
import { fsGet, fsQuery } from "@/lib/firestore-rest";
import { getTierForSpending } from "@/lib/loyalty";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = bearerToken(request.headers.get("authorization")) as string;

    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const by = request.nextUrl.searchParams.get("by") || "uid";

    if (!query) {
      return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
    }

    let user: any = null;

    if (by === "referralCode") {
      // البحث عن مستخدم عبر كود الإحالة (المرجع: referralCodes/<code>)
      const codeDoc = await fsGet(token, `referralCodes/${query.toUpperCase()}`).catch(() => null);
      if (codeDoc?.userId) {
        user = await fsGet(token, `users/${codeDoc.userId}`).catch(() => null);
      }
    } else {
      // البحث المباشر عبر معرّف المستخدم (uid) — المستخدم في رمز العضوية
      user = await fsGet(token, `users/${query}`).catch(() => null);
    }

    if (!user) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }

    const spending = Number(user.lifetimeSpending) || 0;
    return NextResponse.json({
      success: true,
      member: {
        id: user.id ?? user.uid ?? query,
        displayName: user.displayName || user.email?.split("@")[0] || "Client",
        email: user.email || "",
        phone: user.phone || user.phoneNumber || "",
        photoUrl: user.photoUrl || user.photoURL || null,
        points: Number(user.points) || 0,
        lifetimeSpending: spending,
        tier: getTierForSpending(spending).id,
        referralCode: user.referralCode || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
