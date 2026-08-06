import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { awardPointsForOrder } from "@/lib/loyalty-award";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const orderId = String(body?.orderId || "");

    const result = await awardPointsForOrder(admin.uid, orderId);

    return NextResponse.json({ success: result.awarded, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
