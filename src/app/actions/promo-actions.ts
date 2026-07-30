// src/app/actions/promo-actions.ts
"use server";

import { prisma } from "@/lib/prisma";

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

    // Query database for the promo code
    const promo = await prisma.promoCode.findUnique({
      where: { code: codeClean },
    });

    if (!promo) {
      return { success: false, error: "Code promo invalide ou expiré." };
    }

    // 1. Check if promo code is active
    if (!promo.active) {
      return { success: false, error: "Ce code promo est inactif." };
    }

    // 2. Check expiration date
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return { success: false, error: "Ce code promo a expiré." };
    }

    // 3. Check total usage limits
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      return { success: false, error: "Ce code promo a atteint sa limite d'utilisation." };
    }

    // 4. Check user-specific restrictions
    if (promo.userSpecific && promo.userSpecific !== userId) {
      return { success: false, error: "Ce code promo est réservé à un autre compte." };
    }

    const minAmount = Number(promo.minAmount);
    const discountValue = Number(promo.discountValue);
    const maxDiscount = promo.maxDiscount ? Number(promo.maxDiscount) : null;

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
        code: promo.code,
        discountType: promo.discountType,
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
    await prisma.promoCode.update({
      where: { code: code.toUpperCase().trim() },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error using promo code:", error);
    return { success: false, error };
  }
}
