import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import webpush from "web-push";

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, url, orderId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const q = query(
      collection(db, "pushSubscriptions"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

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
      snap.docs.map(async (subDoc) => {
        const sub = subDoc.data();
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys,
        };

        await webpush.sendNotification(
          pushSubscription,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
