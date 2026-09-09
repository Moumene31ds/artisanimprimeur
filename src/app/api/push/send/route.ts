// src/app/api/push/send/route.ts
// إرسال إشعار فوري لكل أجهزة مستخدم معيّن — للمشرف فقط (كان مفتوحاً للجميع:
// أي شخص كان يستطيع إرسال إشعارات لأي زبون عبر userId).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { requireAdmin } from "@/lib/admin-auth";
import { bearerToken } from "@/lib/auth-verify";
import { fsQuery } from "@/lib/firestore-rest";
import { ApiError, fail } from "@/lib/security/api-error";

const sendSchema = z.object({
  userId: z.string().min(1).max(128),
  title: z.string().min(1).max(120).optional(),
  body: z.string().max(500).optional(),
  url: z.string().max(512).optional(),
  orderId: z.string().max(128).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) throw new ApiError(401, "Admin authentication required");
    const token = bearerToken(request.headers.get("authorization")) as string;

    const parsed = sendSchema.safeParse(await request.json());
    if (!parsed.success) throw parsed.error;
    const { userId, title, body, url, orderId } = parsed.data;

    const snap = await fsQuery(token, {
      from: [{ collectionId: "pushSubscriptions" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: userId },
        },
      },
      limit: 20,
    });

    if (snap.length === 0) throw new ApiError(404, "No subscriptions found");

    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPrivateKey || !vapidPublicKey) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:imprimeurlartisan@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const results = await Promise.allSettled(
      snap.map(async (doc) => {
        const sub = doc as any;
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys ?? {} },
          JSON.stringify({
            title: title || "L'Artisan Imprimeur",
            body: body || "",
            icon: "/icons/icon.svg",
            badge: "/icons/icon.svg",
            url: url || "/",
            orderId: orderId || null,
            tag: orderId || "general",
            renotify: !!orderId,
            requireInteraction: true,
          })
        );
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    return fail(error);
  }
}
