import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { computeLoyaltyProfile } from "@/lib/loyalty-profile";

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get("authorization")) as string;
    const user = await verifyIdToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await computeLoyaltyProfile(token, user.uid);
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("[loyalty/me] failed:", err?.message ?? err);
    return NextResponse.json({ error: "Une erreur est survenue, réessayez plus tard" }, { status: 500 });
  }
}
