"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: (notification: any) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOfficialSignInProps {
  isRtl?: boolean;
  onSuccess: (user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => Promise<void> | void;
  disabled?: boolean;
  enableOneTap?: boolean;
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  className?: string;
}

/**
 * توليد Nonce تشفيري عشوائي من جانب العميل لمكافحة هجمات الإعادة (Anti-Replay Attack)
 */
function generateClientNonce(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function GoogleOfficialSignIn({
  isRtl = false,
  onSuccess,
  disabled = false,
  enableOneTap = false,
  theme = "outline",
  size = "large",
  shape = "rectangular",
  text = "continue_with",
  className = "",
}: GoogleOfficialSignInProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState<string>("");
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    // توليد Nonce فريد ومحمي لكل جلسة مصادقة
    setNonce(generateClientNonce());
  }, []);

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        toast.error(
          isRtl
            ? "لم يتم استلام توكن التحقق من Google."
            : "Aucun jeton de vérification reçu de Google."
        );
        return;
      }

      setLoading(true);
      try {
        // 1. التحقق التشفيري الصارم من جانب الخادم عبر API نقطة نهاية Google الرسمية
        const verifyRes = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: response.credential,
            nonce: nonce,
          }),
        });

        const data = await verifyRes.json();

        if (!verifyRes.ok || !data.ok) {
          throw new Error(data.error || "Échec de la validation Google.");
        }

        // 2. مزامنة بيانات الاعتماد مع Firebase Client SDK محلياً بدون أي Popup
        // يضمن تشغيل كامل قواعد Firestore الأمنية (request.auth != null) بسلاسة فائقة
        let authenticatedUser = data.user;
        try {
          if (auth) {
            const credential = GoogleAuthProvider.credential(response.credential);
            const firebaseUserCred = await signInWithCredential(auth, credential);
            authenticatedUser = {
              uid: firebaseUserCred.user.uid,
              email: firebaseUserCred.user.email || data.user.email,
              displayName: firebaseUserCred.user.displayName || data.user.displayName,
              photoURL: firebaseUserCred.user.photoURL || data.user.photoURL,
            };
          }
        } catch (firebaseErr) {
          console.warn("[GoogleOfficialSignIn] Firebase local bridge notice:", firebaseErr);
        }

        toast.success(
          isRtl
            ? `أهلاً بك! تم تسجيل الدخول الرسمي عبر Google بنجاح.`
            : `Bienvenue ! Connexion officielle Google réussie.`
        );

        await onSuccess(authenticatedUser);
      } catch (err: any) {
        console.error("Google Auth Error:", err);
        toast.error(
          isRtl
            ? `خطأ أثناء التحقق من Google: ${err.message || "فشلت العملية"}`
            : `Erreur d'authentification Google : ${err.message || "Échec"}`
        );
      } finally {
        setLoading(false);
      }
    },
    [isRtl, nonce, onSuccess]
  );

  const renderGoogleButton = useCallback(() => {
    if (!window.google?.accounts?.id || !buttonContainerRef.current || !clientId) return;

    try {
      // تهيئة Google Identity Services مع التوكن والـ Nonce
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        nonce: nonce,
        auto_select: false,
        context: "signin",
      });

      // إفراغ الحاوية قبل إعادة الرسم لتجنب التكرار
      buttonContainerRef.current.innerHTML = "";

      // رسم الزر الرسمي لـ Google بكامل مواصفات الهوية البصرية الرسمية
      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: "standard",
        shape: shape,
        theme: theme,
        text: text,
        size: size,
        logo_alignment: isRtl ? "right" : "left",
        width: buttonContainerRef.current.offsetWidth || 300,
        locale: isRtl ? "ar" : "fr",
      });

      // تفعيل Google One Tap إذا كان مطلوباً
      if (enableOneTap) {
        window.google.accounts.id.prompt();
      }

      initializedRef.current = true;
    } catch (e) {
      console.error("Failed to render Google official button:", e);
    }
  }, [clientId, handleCredentialResponse, nonce, shape, theme, text, size, isRtl, enableOneTap]);

  useEffect(() => {
    if (scriptLoaded && clientId) {
      renderGoogleButton();
    }
  }, [scriptLoaded, clientId, renderGoogleButton]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* تحميل مكتبة Google Identity Services الرسمية بأعلى معايير الأمان */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex items-center justify-center rounded-xl z-20 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={18} />
            <span>{isRtl ? "جاري التحقق التشفيري الآمن..." : "Vérification sécurisée en cours..."}</span>
          </div>
        </div>
      )}

      {/* زر Google الرسمي الحقيقي */}
      {clientId ? (
        <div
          ref={buttonContainerRef}
          className={`w-full flex justify-center min-h-[44px] ${disabled || loading ? "opacity-60 pointer-events-none" : ""}`}
        />
      ) : (
        /* زر إرشادي أنيق في حال عدم ضبط NEXT_PUBLIC_GOOGLE_CLIENT_ID بعد في البيئة المحلية */
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => {
            toast.info(
              isRtl
                ? "خدمة Google الرسمية جاهزة. يرجى إضافة NEXT_PUBLIC_GOOGLE_CLIENT_ID في ملف .env.local لتفعيلها فورياً."
                : "Service Google officiel prêt. Ajoutez NEXT_PUBLIC_GOOGLE_CLIENT_ID dans .env.local pour activer."
            );
          }}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all shadow-xs"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>
            {isRtl ? "المتابعة باستخدام Google (الخدمة الرسمية)" : "Continuer avec Google (Officiel)"}
          </span>
        </button>
      )}
    </div>
  );
}
