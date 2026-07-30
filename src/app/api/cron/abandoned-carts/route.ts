// src/app/api/cron/abandoned-carts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

/**
 * GET handler triggered by cron job scheduler.
 * Finds abandoned carts, sends reminder emails, and updates database records.
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

    // Fetch sessions modified before the threshold, having emails, and not emailed yet
    const sessions = await prisma.cartSession.findMany({
      where: {
        email: { not: null },
        emailSent: false,
        updatedAt: { lte: threshold },
      },
      include: {
        user: true,
      },
    });

    console.log(`⏱️ Abandoned Cart Cron: Found ${sessions.length} sessions to process.`);
    
    let processedCount = 0;
    const checkoutBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://artisan-imprimeur.dz";

    for (const session of sessions) {
      if (!session.email) continue;

      // Extract details
      const displayName = session.user?.displayName || "Cher client";
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
        // Update session state in PostgreSQL
        await prisma.cartSession.update({
          where: { id: session.id },
          data: {
            isAbandoned: true,
            emailSent: true,
          },
        });
        processedCount++;
      } else {
        console.error(`❌ Failed to send abandoned cart email to ${session.email}:`, emailResult.error);
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
