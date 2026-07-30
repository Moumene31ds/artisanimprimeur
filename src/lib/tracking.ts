// src/lib/tracking.ts
import crypto from "crypto";

// Helper to hash PII according to Meta CAPI guidelines
export function hashPII(data?: string | null): string | null {
  if (!data) return null;
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
}

interface UserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
}

interface TrackingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface TrackingEvent {
  eventName: "AddToCart" | "Purchase";
  eventId: string; // Used for event deduplication
  userData: UserData;
  value: number;
  currency?: string;
  items: TrackingItem[];
}

/**
 * Sends a server event to Meta Conversions API (CAPI)
 */
export async function sendMetaCapiEvent(event: TrackingEvent) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("⚠️ Meta CAPI skipped: META_PIXEL_ID or META_ACCESS_TOKEN is missing.");
    return;
  }

  // Normalize phone (Algerian codes: remove leading 0, add 213)
  let phone = event.userData.phone;
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    phone = digits.startsWith("0") ? "213" + digits.substring(1) : digits;
  }

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: "website",
        user_data: {
          em: event.userData.email ? [hashPII(event.userData.email)] : [],
          ph: phone ? [hashPII(phone)] : [],
          fn: event.userData.firstName ? [hashPII(event.userData.firstName)] : [],
          ln: event.userData.lastName ? [hashPII(event.userData.lastName)] : [],
          client_ip_address: event.userData.clientIp || undefined,
          client_user_agent: event.userData.clientUserAgent || undefined,
        },
        custom_data: {
          currency: event.currency || "DZD",
          value: event.value,
          contents: event.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            item_price: item.price,
          })),
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const resJson = await response.json();
    if (!response.ok) {
      console.error("❌ Meta CAPI Error Response:", resJson);
    } else {
      console.log(`✅ Meta CAPI event ${event.eventName} sent. EventID: ${event.eventId}`);
    }
  } catch (err) {
    console.error("❌ Meta CAPI exception:", err);
  }
}

/**
 * Sends a server event to GA4 via Measurement Protocol
 */
export async function sendGA4Event(event: TrackingEvent) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn("⚠️ GA4 Measurement Protocol skipped: GA4_MEASUREMENT_ID or GA4_API_SECRET is missing.");
    return;
  }

  // Generate a clientId. If user email is present, we hash it, otherwise generate random
  const clientId = event.userData.email 
    ? hashPII(event.userData.email) 
    : crypto.randomUUID();

  const gaEventName = event.eventName === "AddToCart" ? "add_to_cart" : "purchase";

  const payload = {
    client_id: clientId,
    events: [
      {
        name: gaEventName,
        params: {
          currency: event.currency || "DZD",
          value: event.value,
          transaction_id: event.eventName === "Purchase" ? event.eventId : undefined,
          items: event.items.map((item) => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?api_secret=${apiSecret}&measurement_id=${measurementId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ GA4 Error Response:", text);
    } else {
      console.log(`✅ GA4 event ${gaEventName} sent. client_id: ${clientId}`);
    }
  } catch (err) {
    console.error("❌ GA4 exception:", err);
  }
}
