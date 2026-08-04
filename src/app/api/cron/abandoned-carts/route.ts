// src/app/api/cron/abandoned-carts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { sendAbandonedCartEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * GET handler triggered by cron job scheduler.
 * Finds abandoned carts, sends reminder emails, and updates Firestore records.
 */
export async function GET(request: NextRequest) {
  // Optional security check for Vercel Cron or local trigger
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  try {
    // We define a threshold of 30 minutes of inactivity
    const threshold = new Date(Date.now() - 30 * 60 * 1000);

    // Fetch sessions that haven't been emailed yet
    const sessionsQuery = query(
      collection(db, "cartSessions"),
      where("emailSent", "==", false)
    );
    const sessionsSnap = await getDocs(sessionsQuery);

    // Filter in code for email presence and inactivity threshold (avoids composite index)
    const sessions = sessionsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((session: any) => {
        if (!session.email) return false;
        const updatedAt = toDate(session.updatedAt);
        if (!updatedAt) return false;
        return updatedAt <= threshold;
      });

    console.log(`⏱️ Abandoned Cart Cron: Found ${sessions.length} sessions to process.`);

    let processedCount = 0;
    const checkoutBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://artisan-imprimeur.dz";

    for (const session of sessions) {
      if (!session.email) continue;

      // Extract details
      let displayName = "Cher client";
      if (session.userId) {
        try {
          const userSnap = await getDoc(doc(db, "users", session.userId));
          if (userSnap.exists() && userSnap.data().displayName) {
            displayName = userSnap.data().displayName;
          }
        } catch {
          // Fall back to generic salutation
        }
      }

      const cartItems = Array.isArray(session.items) ? (session.items as any[]) : [];
      const checkoutUrl = `${checkoutBaseUrl}/cart`;

      // Trigger Resend email
      const emailResult = await sendAbandonedCartEmail(
        session.email,
        displayName,
        cartItems,
        checkoutUrl
      );

      if (emailResult.success) {
        // Update session state in Firestore
        await updateDoc(doc(db, "cartSessions", session.id), {
          isAbandoned: true,
          emailSent: true,
        });
        processedCount++;
      } else {
        console.error(
          `❌ Failed to send abandoned cart email to ${session.email}:`,
          emailResult.error
        );
      }
    }

    return NextResponse.json({
      success: true,
      found: sessions.length,
      processed: processedCount,
    });
  } catch (error) {
    console.error("❌ Abandoned Cart Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
