// src/app/actions/review-actions.ts
"use server";

import { prisma } from "@/lib/prisma";

interface SubmitReviewData {
  userId?: string | null;
  orderId?: string | null;
  rating: number;
  comment?: string | null;
}

/**
 * Submits a new review. If a valid, non-cancelled order is supplied, marks the review as "Verified Buyer".
 */
export async function submitReviewAction(data: SubmitReviewData) {
  try {
    const { userId, orderId, rating, comment } = data;

    if (rating < 1 || rating > 5) {
      return { success: false, error: "La note doit être comprise entre 1 et 5." };
    }

    let isVerified = false;

    // Verify if orderId matches this user and is completed/valid
    if (orderId && userId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          customerUserId: userId,
        },
      });

      if (order) {
        // If order exists and is not cancelled (Annulé)
        if (order.status !== "Annulé") {
          isVerified = true;
        }
      } else {
        return { success: false, error: "Numéro de commande invalide ou n'appartenant pas à votre compte." };
      }
    }

    const review = await prisma.review.create({
      data: {
        userId: userId || null,
        orderId: orderId || null,
        rating,
        comment: comment || null,
        isVerified,
      },
    });

    return { 
      success: true, 
      review, 
      isVerified, 
      message: isVerified 
        ? "Votre avis a été publié avec le badge 'Acheteur vérifié' ! ✨" 
        : "Votre avis a été publié avec succès." 
    };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: "Échec de la soumission de l'avis." };
  }
}

/**
 * Fetches recent reviews
 */
export async function getRecentReviewsAction(limit = 10) {
  try {
    const reviews = await prisma.review.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            displayName: true,
            photoUrl: true,
          },
        },
      },
    });

    return { success: true, reviews };
  } catch (error) {
    console.error("Error loading reviews:", error);
    return { success: false, error: "Impossible de charger les avis." };
  }
}
