// src/app/api/newsletter/route.ts
// تصدير مشتركي النشرة البريدية CSV — للمديرين فقط.
// (الاشتراك يتم مباشرة من العميل إلى Firestore عبر قواعد أمان صارمة)
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { bearerToken } from "@/lib/auth-verify";
import { fsQuery } from "@/lib/firestore-rest";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = bearerToken(request.headers.get("authorization")) as string;

    const docs = await fsQuery(token, {
      from: { collectionId: "newsletter_subscribers" },
      limit: 5000,
    });

    const rows = [
      ["email", "source", "subscribedAt", "unsubscribed"],
      ...docs.map((d: any) => [
        d.email || "",
        d.source || "",
        d.subscribedAt || "",
        String(Boolean(d.unsubscribed)),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="newsletter-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("newsletter GET error:", err?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
