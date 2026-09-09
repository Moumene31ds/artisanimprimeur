"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { motion } from "framer-motion";

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
  className?: string;
}

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
  enableOneTap = true,
  className = "",
}: GoogleOfficialSignInProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState<string>("");
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
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

        let data: any = null;
        const textBody = await verifyRes.text();
        try {
          data = JSON.parse(textBody);
        } catch {
          data = { error: textBody };
        }

        if (verifyRes.status === 429) {
          throw new Error(
            isRtl
              ? "طلبات كثيرة في وقت قصير. يرجى الانتظار لحظات ثم المحاولة مجدداً."
              : "Trop de requêtes. Veuillez patienter un instant avant de réessayer."
          );
        }

        if (!verifyRes.ok || !data?.ok) {
          throw new Error(data?.error || (isRtl ? "فشل التحقق من Google" : "Échec de la validation Google."));
        }

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
          console.warn("[GoogleOfficialSignIn] Firebase bridge:", firebaseErr);
        }

        toast.success(
          isRtl
            ? `أهلاً بك! تم تسجيل الدخول الرسمي عبر Google بنجاح ⚡`
            : `Bienvenue ! Connexion officielle Google réussie ⚡`
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
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        nonce: nonce,
        auto_select: false,
        context: "signin",
      });

      buttonContainerRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: "standard",
        shape: "pill",
        theme: "outline",
        text: "continue_with",
        size: "large",
        logo_alignment: isRtl ? "right" : "left",
        width: Math.min(buttonContainerRef.current.offsetWidth || 340, 380),
        locale: isRtl ? "ar" : "fr",
      });

      if (enableOneTap) {
        window.google.accounts.id.prompt();
      }

      initializedRef.current = true;
    } catch (e) {
      console.error("Failed to render Google official button:", e);
    }
  }, [clientId, handleCredentialResponse, nonce, isRtl, enableOneTap]);

  useEffect(() => {
    if (scriptLoaded && clientId) {
      renderGoogleButton();
    }
  }, [scriptLoaded, clientId, renderGoogleButton]);

  return (
    <div className={`relative w-full ${className}`}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* ─── الحاوية الخرافية بتأثيرات الإضاءة والهالة التفاعلية ─── */}
      <motion.div
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.99 }}
        className="relative group w-full"
      >
        {/* هالة خلفية متحركة بألوان Google الأربعة المشعة */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#4285F4]/30 via-[#EA4335]/25 via-[#FBBC05]/25 to-[#34A853]/30 blur-xl opacity-75 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-700 animate-pulse pointer-events-none" />

        {/* إطار متدرج أنيق جداً (Rainbow Iridescent Border) */}
        <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] shadow-lg shadow-blue-500/10 group-hover:shadow-2xl group-hover:shadow-blue-500/25 transition-all duration-500">
          
          {/* القلب الزجاجي الفاخر (Glassmorphic Card) */}
          <div className="relative bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[14px] p-3.5 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden">
            
            {/* لمعان ضوئي يمر بانسيابية عبر البطاقة */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

            {/* شارة علوية فاخرة مع أيقونة النجوم اللامعة */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles size={13} className="text-amber-500 animate-spin" style={{ animationDuration: "6s" }} />
              <span className="text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
                {isRtl ? "المصادقة الرسمية المباشرة والمحمية" : "AUTHENTIFICATION OFFICIELLE GOOGLE"}
              </span>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xs flex items-center justify-center rounded-[14px] z-30">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                  <span>{isRtl ? "جاري التحقق التشفيري الفوري..." : "Vérification cryptographique..."}</span>
                </div>
              </div>
            )}

            {/* موضع زر Google الرسمي الفعلي */}
            {clientId ? (
              <div
                ref={buttonContainerRef}
                className={`w-full flex justify-center items-center min-h-[44px] transition-transform duration-200 ${
                  disabled || loading ? "opacity-60 pointer-events-none" : ""
                }`}
              />
            ) : (
              /* زر احتياطي فخم بتصميم خرافي */
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => {
                  toast.info(
                    isRtl
                      ? "خدمة Google الرسمية جاهزة. أدخل NEXT_PUBLIC_GOOGLE_CLIENT_ID في ملف .env.local للتفعيل الفوري."
                      : "Service Google officiel prêt. Ajoutez NEXT_PUBLIC_GOOGLE_CLIENT_ID dans .env.local pour activer."
                  );
                }}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-sm shadow-sm transition-all"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>{isRtl ? "المتابعة باستخدام Google الرسمي" : "Continuer avec Google Officiel"}</span>
              </button>
            )}

            {/* شريط الأمان السفلي الموثق مع النبضة الخضراء */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 w-full flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>
                {isRtl
                  ? "Google Identity Services • تشفير خادمي بنسبة 100%"
                  : "Google Identity Services • Chiffrement 100% sécurisé"}
              </span>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
