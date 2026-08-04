// src/app/actions/cart-actions.ts
"use server";

import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SaveCartSessionParams {
  userId?: string | null;
  items: any[];
  email?: string | null;
  phone?: string | null;
}

// Deterministic session id for guest carts so upserts don't create duplicates
const guestSessionId = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) | 0;
  }
  return `guest_${Math.abs(hash).toString(36)}`;
};

/**
 * Saves or updates a CartSession in Firestore.
 * Used for tracking abandoned carts before order completion.
 */
export async function saveCartSessionAction(data: SaveCartSessionParams) {
  try {
    const { userId, items, email, phone } = data;

    if (!items || items.length === 0) {
      if (userId) {
        await deleteDoc(doc(db, "cartSessions", userId));
      }
      return { success: true, message: "Cart is empty, session cleared." };
    }

    if (userId) {
      // Upsert by userId for logged-in users (doc id = userId)
      const sessionRef = doc(db, "cartSessions", userId);
      const session = {
        userId,
        items,
        email: email || null,
        phone: phone || null,
        isAbandoned: false, // Reset status on active change
        emailSent: false,
        updatedAt: new Date(),
      };
      await setDoc(sessionRef, session, { merge: true });
      return { success: true, session: { id: sessionRef.id, ...session } };
    } else if (email) {
      // Upsert by email for guest checkout flows (deterministic doc id)
      const sessionRef = doc(db, "cartSessions", guestSessionId(email));
      const session = {
        userId: null,
        items,
        email,
        phone: phone || null,
        isAbandoned: false,
        emailSent: false,
        updatedAt: new Date(),
      };
      await setDoc(sessionRef, session, { merge: true });
      return { success: true, session: { id: sessionRef.id, ...session } };
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
      await deleteDoc(doc(db, "cartSessions", userId));
    } else if (email) {
      await deleteDoc(doc(db, "cartSessions", guestSessionId(email)));
    }
    return { success: true };
  } catch (error) {
    console.error("Error in clearCartSessionAction:", error);
    return { success: false, error: "Failed to clear cart session." };
  }
}
