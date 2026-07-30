// src/app/actions/cart-actions.ts
"use server";

import { prisma } from "@/lib/prisma";

interface SaveCartSessionParams {
  userId?: string | null;
  items: any[];
  email?: string | null;
  phone?: string | null;
}

/**
 * Saves or updates a CartSession in PostgreSQL.
 * Used for tracking abandoned carts before order completion.
 */
export async function saveCartSessionAction(data: SaveCartSessionParams) {
  try {
    const { userId, items, email, phone } = data;

    if (!items || items.length === 0) {
      if (userId) {
        await prisma.cartSession.deleteMany({
          where: { userId },
        });
      }
      return { success: true, message: "Cart is empty, session cleared." };
    }

    if (userId) {
      // Upsert by userId for logged-in users
      const session = await prisma.cartSession.upsert({
        where: { userId },
        update: {
          items,
          email: email || undefined,
          phone: phone || undefined,
          isAbandoned: false, // Reset status on active change
          emailSent: false,
          updatedAt: new Date(),
        },
        create: {
          userId,
          items,
          email,
          phone,
          isAbandoned: false,
          emailSent: false,
        },
      });
      return { success: true, session };
    } else if (email) {
      // Upsert by email where userId is null for guest checkout flows
      const existingSession = await prisma.cartSession.findFirst({
        where: { userId: null, email },
      });

      if (existingSession) {
        const session = await prisma.cartSession.update({
          where: { id: existingSession.id },
          data: {
            items,
            phone: phone || existingSession.phone,
            isAbandoned: false,
            emailSent: false,
            updatedAt: new Date(),
          },
        });
        return { success: true, session };
      } else {
        const session = await prisma.cartSession.create({
          data: {
            items,
            email,
            phone,
            isAbandoned: false,
            emailSent: false,
          },
        });
        return { success: true, session };
      }
    }

    return { success: false, error: "Neither userId nor email provided." };
  } catch (error) {
    console.error("Error in saveCartSessionAction:", error);
    return { success: false, error: "Failed to save cart session." };
  }
}

/**
 * Clears the active CartSession for a user or guest email.
 * This should be triggered immediately upon successful checkout/order creation.
 */
export async function clearCartSessionAction(userId: string | null, email?: string | null) {
  try {
    if (userId) {
      await prisma.cartSession.deleteMany({
        where: { userId },
      });
    } else if (email) {
      await prisma.cartSession.deleteMany({
        where: { userId: null, email },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Error in clearCartSessionAction:", error);
    return { success: false, error: "Failed to clear cart session." };
  }
}
