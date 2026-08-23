"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, getIdToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  signInProvider: string | null;
  emailVerified: boolean;
  isPhoneUser: boolean;
  token: string | null;
  refreshToken: () => Promise<string | null>;
  signOutUser: () => Promise<void>;
  lastSignInAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// الإيميل الحصري للمدير
const SUPER_ADMIN_EMAIL = 'attouabdelkarim2@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [signInProvider, setSignInProvider] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isPhoneUser, setIsPhoneUser] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<number | null>(null);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!auth.currentUser) return null;
      const freshToken = await getIdToken(auth.currentUser, true);
      setToken(freshToken);
      return freshToken;
    } catch (err) {
      console.error('Erreur lors du rafraîchissement du token:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // مراقبة حالة المستخدم من Firebase
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // استخراج مزوّد تسجيل الدخول
        const provider = currentUser.providerData?.[0]?.providerId || null;
        setSignInProvider(provider);
        setEmailVerified(currentUser.emailVerified);
        setIsPhoneUser(!!currentUser.phoneNumber && !currentUser.email);
        setLastSignInAt(
          currentUser.metadata.lastSignInTime
            ? new Date(currentUser.metadata.lastSignInTime).getTime()
            : null
        );

        // جلب توكن محدث للمصادقة
        try {
          const freshToken = await getIdToken(currentUser, true);
          setToken(freshToken);
        } catch (err) {
          setToken(await getIdToken(currentUser).catch(() => null));
        }

        // فرض الحظر: الحساب المحجوب من الإدارة يتم تسجيل خروجه فوراً
        try {
          const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileSnap.exists() && profileSnap.data().blocked === true) {
            await signOut(auth);
            toast.error('Votre compte a été suspendu. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.');
            return;
          }
        } catch (profileErr) {
          console.error('Blocked-check failed (non-blocking):', profileErr);
        }
      } else {
        setSignInProvider(null);
        setEmailVerified(false);
        setIsPhoneUser(false);
        setToken(null);
        setLastSignInAt(null);
      }

      setUser(currentUser);
      setIsLoggedIn(!!currentUser);

      // التحقق الصارم من بريد المدير
      if (currentUser && currentUser.email === SUPER_ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
    setSignInProvider(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isLoggedIn,
        signInProvider,
        emailVerified,
        isPhoneUser,
        token,
        refreshToken,
        signOutUser,
        lastSignInAt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
