// src/app/actions/wallet-actions.ts
"use server";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  writeBatch,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Converts Firestore timestamps/dates into JSON-safe ISO strings for server actions
const serializeDate = (value: any): any => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return value;
};

/**
 * Associates a referred user with their referrer using the 6-character referral code
 */
export async function applyReferralAction(referredUserId: string, referralCode: string) {
  try {
    const codeClean = referralCode.trim().toUpperCase();

    // Find referrer by their stored referral code
    const referrerQuery = query(
      collection(db, "users"),
      where("referralCode", "==", codeClean)
    );
    const referrerSnap = await getDocs(referrerQuery);
    const referrerDoc = referrerSnap.docs[0];

    if (!referrerDoc) {
      return { success: false, error: "Code d'invitation invalide ou introuvable." };
    }

    const referrer = { id: referrerDoc.id, ...(referrerDoc.data() as any) };

    if (referrer.id === referredUserId) {
      return { success: false, error: "Vous ne pouvez pas utiliser votre propre code !" };
    }

    // Check if new user is already referred
    const referredUserRef = doc(db, "users", referredUserId);
    const referredUserSnap = await getDoc(referredUserRef);

    if (!referredUserSnap.exists()) {
      return { success: false, error: "Utilisateur non trouvé." };
    }

    const referredUser = referredUserSnap.data();
    if (referredUser.referredByUserId || referredUser.referralApplied) {
      return { success: false, error: "Vous avez déjà appliqué un code de parrainage." };
    }

    // Perform a batch write to associate user
    const batch = writeBatch(db);

    // 1. Create a Referral record in PENDING state
    batch.set(doc(collection(db, "referrals")), {
      referrerId: referrer.id,
      referredId: referredUserId,
      codeUsed: codeClean,
      status: "PENDING",
      createdAt: serverTimestamp(),
    });

    // 2. Update user info to cache referrer details
    batch.update(referredUserRef, {
      referredByCode: codeClean,
      referredByUserId: referrer.id,
      referralApplied: true,
    });

    await batch.commit();

    return { success: true, referrerName: referrer.displayName || referrer.email };
  } catch (error) {
    console.error("Error applying referral action:", error);
    return { success: false, error: "Échec de l'application du code." };
  }
}

/**
 * Gets wallet details and transaction history for a user
 */
export async function getWalletDetailsAction(userId: string) {
  try {
    let walletRef = doc(db, "wallets", userId);
    let walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) {
      await setDoc(
        walletRef,
        {
          userId,
          pointsBalance: 0,
          creditBalance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      walletSnap = await getDoc(walletRef);
    }

    const walletData = walletSnap.data() as any;

    // Fetch the last 20 transactions
    const txQuery = query(
      collection(walletRef, "transactions"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const txSnap = await getDocs(txQuery);
    const transactions = txSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: serializeDate(data.createdAt),
        amount: data.amount != null ? Number(data.amount) : null,
        points: data.points ?? null,
      };
    });

    // Fetch the stored referral code from the user profile
    let referralCode: string | null = null;
    try {
      const userSnap = await getDoc(doc(db, "users", userId));
      if (userSnap.exists()) {
        referralCode = userSnap.data().referralCode || null;
      }
    } catch {
      // Ignore profile lookup failures
    }

    const serializedWallet = {
      id: walletSnap.id,
      ...walletData,
      referralCode,
      pointsBalance: Number(walletData.pointsBalance || 0),
      creditBalance: Number(walletData.creditBalance || 0),
      transactions,
    };

    return { success: true, wallet: serializedWallet };
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    return { success: false, error: "Impossible de charger le portefeuille." };
  }
}

/**
 * Completes a pending referral when the referred user places their first successful order.
 * Credits the referrer with 100 points + 500 DA, and credits the referred user with 50 welcome points.
 */
export async function completeReferralOnFirstOrder(referredUserId: string) {
  try {
    const referralQuery = query(
      collection(db, "referrals"),
      where("referredId", "==", referredUserId),
      where("status", "==", "PENDING")
    );
    const referralSnap = await getDocs(referralQuery);
    const referralDoc = referralSnap.docs[0];

    if (!referralDoc) {
      return { success: false, error: "Aucun parrainage en attente pour cet utilisateur." };
    }

    const referral = { id: referralDoc.id, ...(referralDoc.data() as any) };
    const referrerId = referral.referrerId;
    const pointsAward = 100;
    const creditAward = 500.0; // 500 DA credit in wallet

    const batch = writeBatch(db);

    // 1. Update referral status to COMPLETED
    batch.update(doc(db, "referrals", referral.id), {
      status: "COMPLETED",
      pointsAwarded: pointsAward,
      creditAwarded: creditAward,
      completedAt: serverTimestamp(),
    });

    // 2. Credit referrer's wallet
    const referrerWalletRef = doc(db, "wallets", referrerId);
    batch.set(
      referrerWalletRef,
      {
        pointsBalance: increment(pointsAward),
        creditBalance: increment(creditAward),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Create wallet transaction log for referrer
    batch.set(doc(collection(referrerWalletRef, "transactions")), {
      walletId: referrerWalletRef.id,
      points: pointsAward,
      amount: creditAward,
      type: "REFERRAL_BONUS",
      title: `Bonus de parrainage - Client #${referredUserId.substring(0, 6)}`,
      titleAr: `هدية إحالة من المستخدم #${referredUserId.substring(0, 6)}`,
      createdAt: serverTimestamp(),
    });

    // 4. Update referred user wallet with welcome points
    const referredWalletRef = doc(db, "wallets", referredUserId);
    batch.set(
      referredWalletRef,
      {
        pointsBalance: increment(50),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 5. Create wallet transaction log for referred user
    batch.set(doc(collection(referredWalletRef, "transactions")), {
      walletId: referredWalletRef.id,
      points: 50,
      type: "WELCOME_BONUS",
      title: "Bonus d'inscription parrainée",
      titleAr: "هدية ترحيبية برمز الإحالة",
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error("Error completing referral on first order:", error);
    return { success: false, error: "Échec de la validation du parrainage." };
  }
}
