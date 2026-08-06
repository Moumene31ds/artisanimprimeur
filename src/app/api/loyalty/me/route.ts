import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, bearerToken } from "@/lib/auth-verify";
import { computeLoyaltyProfile } from "@/lib/loyalty-profile";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyIdToken(bearerToken(request.headers.get("authorization")));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await computeLoyaltyProfile(user.uid, user.uid);
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
