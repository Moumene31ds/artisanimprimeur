// src/app/actions/review-actions.ts
"use server";

import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SubmitReviewData {
  userId?: string | null;
  orderId?: string | null;
  rating: number;
  comment?: string | null;
}

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
      const orderSnap = await getDoc(doc(db, "orders", orderId));

      if (orderSnap.exists()) {
        const order = orderSnap.data();

        if (order.customerUserId === userId) {
          // If order exists and is not cancelled (Annulé)
          if (order.status !== "Annulé") {
            isVerified = true;
          }
        } else {
          return {
            success: false,
            error: "Numéro de commande invalide ou n'appartenant pas à votre compte.",
          };
        }
      } else {
        return {
          success: false,
          error: "Numéro de commande invalide ou n'appartenant pas à votre compte.",
        };
      }
    }

    const reviewRef = await addDoc(collection(db, "reviews"), {
      userId: userId || null,
      orderId: orderId || null,
      rating,
      comment: comment || null,
      isVerified,
      createdAt: serverTimestamp(),
    });

    const review = {
      id: reviewRef.id,
      userId: userId || null,
      orderId: orderId || null,
      rating,
      comment: comment || null,
      isVerified,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      review,
      isVerified,
      message: isVerified
        ? "Votre avis a été publié avec le badge 'Acheteur vérifié' ! ✨"
        : "Votre avis a été publié avec succès.",
    };
  } catch (error) {
    console.error("Error submitting review:", error);
    return { success: false, error: "Échec de la soumission de l'avis." };
  }
}

/**
 * Fetches recent reviews
 */
export async function getRecentReviewsAction(limitCount = 10) {
  try {
    const reviewsQuery = query(
      collection(db, "reviews"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(reviewsQuery);

    const reviews = await Promise.all(
      snap.docs.map(async (reviewSnap) => {
        const data = reviewSnap.data();

        // Resolve the reviewer's public profile
        let user: { displayName: string | null; photoUrl: string | null } | null = null;
        if (data.userId) {
          try {
            const userSnap = await getDoc(doc(db, "users", data.userId));
            if (userSnap.exists()) {
              const u = userSnap.data();
              user = {
                displayName: u.displayName || null,
                photoUrl: u.photoUrl || null,
              };
            }
          } catch {
            // Ignore profile lookup failures
          }
        }

        return {
          id: reviewSnap.id,
          ...data,
          user,
          createdAt: serializeDate(data.createdAt),
        };
      })
    );

    return { success: true, reviews };
  } catch (error) {
    console.error("Error loading reviews:", error);
    return { success: false, error: "Impossible de charger les avis." };
  }
}
