import { prisma } from "@/lib/prisma";

/**
 * Associates a referred user with their referrer using the 6-character referral code suffix
 */
export async function applyReferralAction(referredUserId: string, referralCode: string) {
  try {
    const codeClean = referralCode.trim().toUpperCase();

    // Find referrer where their ID ends with the referral code
    const referrer = await prisma.user.findFirst({
      where: {
        id: {
          endsWith: codeClean,
          mode: "insensitive",
        },
      },
    });

    if (!referrer) {
      return { success: false, error: "Code d'invitation invalide ou introuvable." };
    }

    if (referrer.id === referredUserId) {
      return { success: false, error: "Vous ne pouvez pas utiliser votre propre code !" };
    }

    // Check if new user is already referred
    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
    });

    if (!referredUser) {
      return { success: false, error: "Utilisateur non trouvé." };
    }

    if (referredUser.referredByUserId || referredUser.referralApplied) {
      return { success: false, error: "Vous avez déjà appliqué un code de parrainage." };
    }

    // Perform transaction to associate user
    await prisma.$transaction(async (tx: any) => {
      // 1. Create a Referral record in PENDING state
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: referredUserId,
          codeUsed: codeClean,
          status: "PENDING",
        },
      });

      // 2. Update user info to cache referrer details
      await tx.user.update({
        where: { id: referredUserId },
        data: {
          referredByCode: codeClean,
          referredByUserId: referrer.id,
          referralApplied: true,
        },
      });
    });

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
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          pointsBalance: 0,
          creditBalance: 0.0,
        },
        include: {
          transactions: true,
        },
      });
    }

    // Convert decimal numbers to numbers for JSON serialization safety
    const serializedWallet = {
      ...wallet,
      creditBalance: Number(wallet.creditBalance),
      transactions: wallet.transactions?.map((walletTx: any) => ({
        ...walletTx,
        amount: walletTx.amount ? Number(walletTx.amount) : null,
      })) || [],
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
    const referral = await prisma.referral.findUnique({
      where: { referredId: referredUserId },
    });

    if (!referral || referral.status !== "PENDING") {
      return { success: false, error: "Aucun parrainage en attente pour cet utilisateur." };
    }

    const referrerId = referral.referrerId;
    const pointsAward = 100;
    const creditAward = 500.0; // 500 DA credit in wallet

    await prisma.$transaction(async (tx: any) => {
      // 1. Update referral status to COMPLETED
      await tx.referral.update({
        where: { id: referral.id },
        data: {
          status: "COMPLETED",
          pointsAwarded: pointsAward,
          creditAwarded: creditAward,
          completedAt: new Date(),
        },
      });

      // 2. Credit referrer's wallet
      const referrerWallet = await tx.wallet.upsert({
        where: { userId: referrerId },
        update: {
          pointsBalance: { increment: pointsAward },
          creditBalance: { increment: creditAward },
        },
        create: {
          userId: referrerId,
          pointsBalance: pointsAward,
          creditBalance: creditAward,
        },
      });

      // 3. Create wallet transaction log for referrer
      await tx.walletTransaction.create({
        data: {
          walletId: referrerWallet.id,
          points: pointsAward,
          amount: creditAward,
          type: "REFERRAL_BONUS" as const,
          title: `Bonus de parrainage - Client #${referredUserId.substring(0, 6)}`,
          titleAr: `هدية إحالة من المستخدم #${referredUserId.substring(0, 6)}`,
        },
      });

      // 4. Update referred user wallet with welcome points
      const referredWallet = await tx.wallet.upsert({
        where: { userId: referredUserId },
        update: {
          pointsBalance: { increment: 50 },
        },
        create: {
          userId: referredUserId,
          pointsBalance: 50,
        },
      });

      // 5. Create wallet transaction log for referred user
      await tx.walletTransaction.create({
        data: {
          walletId: referredWallet.id,
          points: 50,
          type: "WELCOME_BONUS" as const,
          title: "Bonus d'inscription parrainée",
          titleAr: "هدية ترحيبية برمز الإحالة",
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error completing referral on first order:", error);
    return { success: false, error: "Échec de la validation du parrainage." };
  }
}
