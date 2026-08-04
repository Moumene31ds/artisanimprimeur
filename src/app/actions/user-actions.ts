// src/app/actions/user-actions.ts
"use server";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
 * Synchronizes the Firebase Auth user with Firestore.
 * If the user is new, sets up their wallet, generates their referral code,
 * creates a welcome promo code, links referral sources, and sends the welcome email.
 */
export async function syncUserAction(params: SyncUserParams) {
  try {
    const { uid, email, displayName, photoUrl, referredByCode } = params;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // User exists, update basic details
      const existing = userSnap.data();
      await updateDoc(userRef, {
        displayName: displayName || existing.displayName || null,
        photoUrl: photoUrl || existing.photoUrl || null,
        lastInteraction: new Date(),
      });

      const updatedUser = {
        id: uid,
        ...existing,
        ...(displayName ? { displayName } : {}),
        ...(photoUrl ? { photoUrl } : {}),
      };

      return { success: true, isNew: false, user: updatedUser };
    }

    // New user signup flow
    console.log(`🆕 Creating new user in Firestore: ${email} (${uid})`);

    // 1. Generate unique referral code for this user
    const userReferralCode = await generateUniqueReferralCode(async (code: string) => {
      const q = query(collection(db, "users"), where("referralCode", "==", code));
      const snap = await getDocs(q);
      return !snap.empty;
    });

    // Determine role
    const role = SUPER_ADMINS.includes(email.toLowerCase()) ? "ADMIN" : "USER";

    // 2. Generate personalized welcome promo code
    // E.g. WELCOME-ART123
    const welcomePromoCode = `WELCOME-${userReferralCode}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    // Run a batch write to ensure consistency
    const batch = writeBatch(db);

    // 2a. Create the user
    batch.set(
      userRef,
      {
        id: uid,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
        role,
        referralCode: userReferralCode,
        lastInteraction: new Date(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2b. Initialize user wallet
    batch.set(
      doc(db, "wallets", uid),
      {
        userId: uid,
        pointsBalance: 0,
        creditBalance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2c. Create the Welcome Promo Code (doc id = code)
    batch.set(
      doc(db, "promoCodes", welcomePromoCode),
      {
        code: welcomePromoCode,
        discountType: "PERCENT",
        discountValue: 10.0, // 10% discount
        minAmount: 0.0,
        active: true,
        usageLimit: 1, // Single-use
        usageCount: 0,
        userSpecific: uid,
        expiresAt,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    const newUser = {
      id: uid,
      email,
      displayName,
      photoUrl,
      role,
      referralCode: userReferralCode,
    };

    // 3. Handle incoming referral linking if referredByCode was supplied
    if (referredByCode) {
      const codeClean = referredByCode.trim().toUpperCase();

      // Find referrer user by their referral code
      const referrerQuery = query(
        collection(db, "users"),
        where("referralCode", "==", codeClean)
      );
      const referrerSnap = await getDocs(referrerQuery);
      const referrerDoc = referrerSnap.docs[0];

      // Avoid self-referral and link if referrer exists
      if (referrerDoc && referrerDoc.id !== uid) {
        try {
          const linkBatch = writeBatch(db);

          // Create pending referral record
          linkBatch.set(doc(collection(db, "referrals")), {
            referrerId: referrerDoc.id,
            referredId: uid,
            codeUsed: codeClean,
            status: "PENDING",
            createdAt: serverTimestamp(),
          });

          // Update referred user details
          linkBatch.update(userRef, {
            referredByCode: codeClean,
            referredByUserId: referrerDoc.id,
            referralApplied: true,
          });

          await linkBatch.commit();
          console.log(`🔗 Linked user ${uid} as referred by ${referrerDoc.id} (code: ${codeClean})`);
        } catch (linkErr) {
          console.error("Failed to link referral in batch:", linkErr);
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
