// src/app/actions/tracking-actions.ts
"use server";

import { headers } from "next/headers";
import { sendMetaCapiEvent, sendGA4Event } from "@/lib/tracking";

interface UserProfile {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export async function trackAddToCartAction(data: {
  eventId: string;
  value: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  user?: UserProfile;
}) {
  const headersList = await headers();
  const clientIp = headersList.get("x-forwarded-for")?.split(",")[0] || null;
  const clientUserAgent = headersList.get("user-agent") || null;

  const eventData = {
    eventName: "AddToCart" as const,
    eventId: data.eventId,
    userData: {
      email: data.user?.email || null,
      phone: data.user?.phone || null,
      firstName: data.user?.firstName || null,
      lastName: data.user?.lastName || null,
      clientIp,
      clientUserAgent,
    },
    value: data.value,
    currency: "DZD",
    items: data.items,
  };

  // Send events asynchronously without blocking client thread response
  Promise.allSettled([
    sendMetaCapiEvent(eventData),
    sendGA4Event(eventData)
  ]).catch((err) => console.error("Meta CAPI / GA4 Async Tracking failed:", err));
}

export async function trackPurchaseAction(data: {
  orderId: string;
  value: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  user: UserProfile & { name: string };
}) {
  const headersList = await headers();
  const clientIp = headersList.get("x-forwarded-for")?.split(",")[0] || null;
  const clientUserAgent = headersList.get("user-agent") || null;

  // Split name into first and last name if not provided separately
  const nameParts = data.user.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const eventData = {
    eventName: "Purchase" as const,
    eventId: data.orderId,
    userData: {
      email: data.user.email || null,
      phone: data.user.phone || null,
      firstName: data.user.firstName || firstName || null,
      lastName: data.user.lastName || lastName || null,
      clientIp,
      clientUserAgent,
    },
    value: data.value,
    currency: "DZD",
    items: data.items,
  };

  // Wait for delivery reports to log successfully
  await Promise.allSettled([
    sendMetaCapiEvent(eventData),
    sendGA4Event(eventData)
  ]);
}
