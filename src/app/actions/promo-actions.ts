// src/app/actions/promo-actions.ts
"use server";

import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ValidatePromoResult {
  success: boolean;
  error?: string;
  promo?: {
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    minAmount: number;
    maxDiscount: number | null;
    calculatedDiscount: number;
  };
}

// Normalizes a Firestore Timestamp or Date into a JS Date
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
 * Validates a database-driven promo code against current order details and user context.
 */
export async function validatePromoCodeAction(
  promoCodeInput: string,
  userId: string | null,
  orderSubtotal: number
): Promise<ValidatePromoResult> {
  try {
    const codeClean = promoCodeInput.trim().toUpperCase();

    // Fetch the promo code document (doc id = normalized code)
    const promoSnap = await getDoc(doc(db, "promoCodes", codeClean));

    if (!promoSnap.exists()) {
      return { success: false, error: "Code promo invalide ou expiré." };
    }

    const promo = promoSnap.data();

    // 1. Check if promo code is active
    if (promo.active !== true) {
      return { success: false, error: "Ce code promo est inactif." };
    }

    // 2. Check expiration date
    const expiresAt = toDate(promo.expiresAt);
    if (expiresAt && expiresAt < new Date()) {
      return { success: false, error: "Ce code promo a expiré." };
    }

    // 3. Check total usage limits
    const usageLimit = promo.usageLimit != null ? Number(promo.usageLimit) : null;
    const usageCount = promo.usageCount != null ? Number(promo.usageCount) : 0;
    if (usageLimit !== null && usageCount >= usageLimit) {
      return { success: false, error: "Ce code promo a atteint sa limite d'utilisation." };
    }

    // 4. Check user-specific restrictions
    if (promo.userSpecific && promo.userSpecific !== userId) {
      return { success: false, error: "Ce code promo est réservé à un autre compte." };
    }

    const minAmount = Number(promo.minAmount || 0);
    const discountValue = Number(promo.discountValue || 0);
    const maxDiscount = promo.maxDiscount != null ? Number(promo.maxDiscount) : null;

    // 5. Check minimum order value threshold
    if (orderSubtotal < minAmount) {
      return {
        success: false,
        error: `Le montant minimum requis pour ce code est de ${minAmount.toLocaleString()} DA.`,
      };
    }

    // Calculate the discount amount
    let calculatedDiscount = 0;
    if (promo.discountType === "PERCENT") {
      calculatedDiscount = (orderSubtotal * discountValue) / 100;
      if (maxDiscount !== null && calculatedDiscount > maxDiscount) {
        calculatedDiscount = maxDiscount;
      }
    } else {
      calculatedDiscount = discountValue;
    }

    // Ensure the discount doesn't exceed the subtotal
    calculatedDiscount = Math.min(calculatedDiscount, orderSubtotal);

    return {
      success: true,
      promo: {
        code: codeClean,
        discountType: promo.discountType === "FIXED" ? "FIXED" : "PERCENT",
        discountValue,
        minAmount,
        maxDiscount,
        calculatedDiscount,
      },
    };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return { success: false, error: "Erreur lors de la validation du code promo." };
  }
}

/**
 * Increments usage count of a promo code upon order placement
 */
export async function usePromoCodeAction(code: string) {
  try {
    const codeClean = code.trim().toUpperCase();
    await updateDoc(doc(db, "promoCodes", codeClean), {
      usageCount: increment(1),
    });
    return { success: true };
  } catch (error) {
    console.error("Error using promo code:", error);
    return { success: false, error };
  }
}
