// src/app/actions/user-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { generateUniqueReferralCode } from "@/lib/referral-utils";
import { sendWelcomeEmail } from "@/lib/email-service";

interface SyncUserParams {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  referredByCode?: string | null;
}

const SUPER_ADMINS = ["attouabdelkarim2@gmail.com", "moumene@artisan-imprimeur.dz"];

/**
 * Synchronizes the Firebase Auth user with PostgreSQL.
 * If the user is new, sets up their wallet, generates their referral code,
 * creates a welcome promo code, links referral sources, and sends the welcome email.
 */
export async function syncUserAction(params: SyncUserParams) {
  try {
    const { uid, email, displayName, photoUrl, referredByCode } = params;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (existingUser) {
      // User exists, update basic details
      const updatedUser = await prisma.user.update({
        where: { id: uid },
        data: {
          displayName: displayName || existingUser.displayName,
          photoUrl: photoUrl || existingUser.photoUrl,
          lastInteraction: new Date(),
        },
      });

      return { success: true, isNew: false, user: updatedUser };
    }

    // New user signup flow
    console.log(`🆕 Creating new user in SQL: ${email} (${uid})`);

    // 1. Generate unique referral code for this user
    const userReferralCode = await generateUniqueReferralCode(prisma);

    // Determine role
    const role = SUPER_ADMINS.includes(email.toLowerCase()) ? "ADMIN" as const : "USER" as const;

    // 2. Generate personalized welcome promo code
    // E.g. WELCOME-ART123
    const welcomePromoCode = `WELCOME-${userReferralCode}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    // Run database transactions to ensure consistency
    const newUser = await prisma.$transaction(async (tx: any) => {
      // 2a. Create the user
      const user = await tx.user.create({
        data: {
          id: uid,
          email,
          displayName,
          photoUrl,
          role,
          referralCode: userReferralCode,
          lastInteraction: new Date(),
        },
      });

      // 2b. Initialize user wallet
      await tx.wallet.create({
        data: {
          userId: uid,
          pointsBalance: 0,
          creditBalance: 0.0,
        },
      });

      // 2c. Create the Welcome Promo Code
      await tx.promoCode.create({
        data: {
          code: welcomePromoCode,
          discountType: "PERCENT",
          discountValue: 10.0, // 10% discount
          minAmount: 0.0,
          active: true,
          usageLimit: 1, // Single-use
          userSpecific: uid,
          expiresAt,
        },
      });

      return user;
    });

    // 3. Handle incoming referral linking if referredByCode was supplied
    if (referredByCode) {
      const codeClean = referredByCode.trim().toUpperCase();

      // Find referrer user
      const referrer = await prisma.user.findUnique({
        where: { referralCode: codeClean },
      });

      // Avoid self-referral and link if referrer exists
      if (referrer && referrer.id !== uid) {
        try {
          await prisma.$transaction(async (tx: any) => {
            // Create pending referral record
            await tx.referral.create({
              data: {
                referrerId: referrer.id,
                referredId: uid,
                codeUsed: codeClean,
                status: "PENDING",
              },
            });

            // Update referred user details
            await tx.user.update({
              where: { id: uid },
              data: {
                referredByCode: codeClean,
                referredByUserId: referrer.id,
              },
            });
          });
          console.log(`🔗 Linked user ${uid} as referred by ${referrer.id} (code: ${codeClean})`);
        } catch (linkErr) {
          console.error("Failed to link referral in transaction:", linkErr);
        }
      }
    }

    // 4. Trigger Welcome email via Resend
    try {
      await sendWelcomeEmail(email, displayName || email, welcomePromoCode);
    } catch (emailErr) {
      console.error("Welcome email failed to dispatch:", emailErr);
    }

    return { success: true, isNew: true, user: newUser };
  } catch (error) {
    console.error("Error in syncUserAction:", error);
    return { success: false, error: "Échec de la synchronisation de l'utilisateur." };
  }
}
