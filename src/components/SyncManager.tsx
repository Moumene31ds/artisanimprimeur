// src/components/SyncManager.tsx
"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppStore } from "@/lib/store";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { syncUserAction } from "@/app/actions/user-actions";

// Helper to check if two cart items are identical (including customizations)
const areItemsEqual = (item1: any, item2: any) => {
  if (item1.id !== item2.id) return false;
  
  const opt1 = item1.selectedOptions || {};
  const opt2 = item2.selectedOptions || {};
  
  return (
    opt1.finition === opt2.finition &&
    opt1.paper === opt2.paper &&
    opt1.corners === opt2.corners &&
    opt1.lamination === opt2.lamination
  );
};

// Helper to merge local cart and database cart
const mergeCarts = (localCart: any[], dbCart: any[]) => {
  const merged = [...dbCart];
  
  for (const localItem of localCart) {
    const matchingIndex = merged.findIndex(item => areItemsEqual(item, localItem));
    if (matchingIndex !== -1) {
      merged[matchingIndex] = {
        ...merged[matchingIndex],
        quantity: Math.max(1, (merged[matchingIndex].quantity || 1) + (localItem.quantity || 1))
      };
    } else {
      merged.push(localItem);
    }
  }
  
  return merged;
};

// Helper to merge local favorites and database favorites
const mergeFavorites = (localFavs: any[], dbFavs: any[]) => {
  const merged = [...dbFavs];
  
  for (const localItem of localFavs) {
    const exists = merged.some(item => item.id === localItem.id);
    if (!exists) {
      merged.push(localItem);
    }
  }
  
  return merged;
};

export default function SyncManager() {
  const { user, isLoggedIn, loading } = useAuth();
  const cart = useAppStore((state) => state.cart);
  const favorites = useAppStore((state) => state.favorites);

  const prevUserIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Capture referral code from URL search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        localStorage.setItem("referred_by_code", refCode.trim().toUpperCase());
        console.log("🎟️ Captured referral code from URL:", refCode);
      }
    }
  }, []);

  // 1. Initial Load & Merge on Auth State Change
  useEffect(() => {
    if (loading) return;

    const currentUserId = user?.uid || null;
    const prevUserId = prevUserIdRef.current;

    // Detect user login
    if (currentUserId && currentUserId !== prevUserId) {
      prevUserIdRef.current = currentUserId;

      const performSyncOnLogin = async () => {
        if (!user) return;
        isSyncingRef.current = true;
        try {
          const userDocRef = doc(db, "users", currentUserId);
          const userDocSnap = await getDoc(userDocRef);

          let dbCart: any[] = [];
          let dbFavorites: any[] = [];

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            dbCart = Array.isArray(data.cart) ? data.cart : [];
            dbFavorites = Array.isArray(data.favorites) ? data.favorites : [];
          }

          // Get current local store state
          const currentLocalCart = useAppStore.getState().cart;
          const currentLocalFavorites = useAppStore.getState().favorites;

          // Merge local and database states
          const mergedCart = mergeCarts(currentLocalCart, dbCart);
          const mergedFavorites = mergeFavorites(currentLocalFavorites, dbFavorites);

          // Update local Zustand store
          useAppStore.setState({
            cart: mergedCart,
            favorites: mergedFavorites
          });

          // Save the combined merged result back to Firestore
          await setDoc(
            userDocRef,
            {
              cart: mergedCart,
              favorites: mergedFavorites,
              lastSyncAt: new Date().toISOString()
            },
            { merge: true }
          );

          // Sync with PostgreSQL
          const storedReferral = localStorage.getItem("referred_by_code");
          await syncUserAction({
            uid: currentUserId,
            email: user.email || "",
            displayName: user.displayName,
            photoUrl: user.photoURL,
            referredByCode: storedReferral,
          });

          if (storedReferral) {
            localStorage.removeItem("referred_by_code");
          }
        } catch (error) {
          console.error("Failed to synchronize user data on login:", error);
        } finally {
          isSyncingRef.current = false;
        }
      };

      performSyncOnLogin();
    } else if (!currentUserId) {
      // User logged out or is guest
      prevUserIdRef.current = null;
    }
  }, [user, loading]);

  // 2. Debounced Local -> Database Sync on Store changes
  useEffect(() => {
    if (!isLoggedIn || !user || isSyncingRef.current) return;

    const userDocRef = doc(db, "users", user.uid);

    // Debounce the database write by 1 second to avoid spamming Firestore
    const timeoutId = setTimeout(async () => {
      try {
        await setDoc(
          userDocRef,
          {
            cart,
            favorites,
            lastSyncAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to sync cart/favorites changes to Firestore:", error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [cart, favorites, isLoggedIn, user]);

  return null;
}
