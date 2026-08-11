"use client";

// Multi-provider SSO button grid for L'Artisan Imprimeur
// Supports: Google, Facebook, Apple, GitHub, Microsoft, Yahoo
// Includes automatic account linking when an email already exists.

import { useState } from "react";
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  GithubAuthProvider,
  User,
  AuthError,
  fetchSignInMethodsForEmail,
  linkWithPopup,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Brand SVG marks
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
    </svg>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

function YahooMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#6001D2" d="M13.32 13.1 19.7 3.8h-3.6L11.8 9.7l-.7-1.15-4.2-4.75H3.3l5.95 8.6L3.3 20.2h3.6l4.9-5.85.7 1.15 4.3 4.7h3.9l-6.38-9.1z"/>
    </svg>
  );
}

// ─── Provider definitions ───────────────────────────────────────────────────
type ProviderDef = {
  id: string;
  name: string;
  color: string;
  hover: string;
  border: string;
  text: string;
  mark: (className?: string) => React.ReactNode;
  build: () => GoogleAuthProvider | FacebookAuthProvider | OAuthProvider | GithubAuthProvider;
  dark?: boolean;
};

const PROVIDERS: ProviderDef[] = [
  {
    id: "google",
    name: "Google",
    color: "bg-white dark:bg-slate-800",
    hover: "hover:bg-slate-50 dark:hover:bg-slate-700",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-white",
    mark: (c) => <GoogleMark className={c} />,
    build: () => new GoogleAuthProvider(),
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "bg-[#1877F2]",
    hover: "hover:bg-[#166FE5]",
    border: "border-[#1877F2]/40",
    text: "text-white",
    mark: (c) => <FacebookMark className={c} />,
    build: () => {
      const p = new FacebookAuthProvider();
      p.addScope("email");
      return p;
    },
  },
  {
    id: "apple",
    name: "Apple",
    color: "bg-black dark:bg-white",
    hover: "hover:bg-slate-900 dark:hover:bg-slate-200",
    border: "border-black/30 dark:border-white/30",
    text: "text-white dark:text-black",
    mark: (c) => <AppleMark className={c} />,
    build: () => new OAuthProvider("apple.com"),
  },
  {
    id: "github",
    name: "GitHub",
    color: "bg-slate-900 dark:bg-slate-100",
    hover: "hover:bg-slate-800 dark:hover:bg-white",
    border: "border-slate-700 dark:border-slate-300",
    text: "text-white dark:text-slate-900",
    mark: (c) => <GithubMark className={c} />,
    build: () => new GithubAuthProvider(),
  },
  {
    id: "microsoft",
    name: "Microsoft",
    color: "bg-white dark:bg-slate-800",
    hover: "hover:bg-slate-50 dark:hover:bg-slate-700",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-white",
    mark: (c) => <MicrosoftMark className={c} />,
    build: () => new OAuthProvider("microsoft.com"),
  },
  {
    id: "yahoo",
    name: "Yahoo",
    color: "bg-[#6001D2]",
    hover: "hover:bg-[#4d01a8]",
    border: "border-[#6001D2]/40",
    text: "text-white",
    mark: (c) => <YahooMark className={c} />,
    build: () => new OAuthProvider("yahoo.com"),
  },
];

interface SSOProvidersProps {
  isRtl: boolean;
  onSuccess: (user: User) => Promise<void> | void;
  onGuest: () => Promise<void> | void;
  disabled?: boolean;
}

export default function SSOProviders({ isRtl, onSuccess, onGuest, disabled }: SSOProvidersProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const ensureUserProfile = async (user: User) => {
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(
          ref,
          {
            email: user.email || "",
            displayName: user.displayName || "",
            points: 0,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            provider: user.providerData?.[0]?.providerId || null,
          },
          { merge: true }
        );
      } else {
        await setDoc(
          ref,
          { lastLogin: serverTimestamp(), provider: user.providerData?.[0]?.providerId || null },
          { merge: true }
        );
      }
    } catch (err) {
      console.error("Error ensuring user profile:", err);
    }
  };

  const logSecurity = (event: string, details?: Record<string, unknown>) => {
    addDoc(collection(db, "securityLogs"), {
      event,
      timestamp: serverTimestamp(),
      status: "success",
      ip: "client-logged",
      ...details,
    }).catch(() => {});
  };

  const handleProvider = async (p: ProviderDef) => {
    if (disabled) return;
    setLoadingProvider(p.id);
    try {
      const provider = p.build();
      // If there's already an anonymous/guest session, upgrade it via linking
      const currentUser = auth.currentUser;
      let user: User;
      if (currentUser && currentUser.isAnonymous) {
        const cred = await linkWithPopup(currentUser, provider);
        user = cred.user;
      } else {
        const cred = await signInWithPopup(auth, provider);
        user = cred.user;
      }

      await ensureUserProfile(user);
      await logSecurity("login_success", {
        email: user.email || "sso-user",
        type: p.id,
      });

      toast.success(
        isRtl
          ? `تم تسجيل الدخول بنجاح عبر ${p.name}!`
          : `Connexion réussie avec ${p.name} !`
      );
      await onSuccess(user);
    } catch (err: any) {
      const authErr = err as AuthError;
      // Account linking case: email already used with another provider
      if (authErr.code === "auth/account-exists-with-different-credential") {
        const pendingEmail = authErr.customData?.email as string | undefined;
        const methods = pendingEmail ? await fetchSignInMethodsForEmail(auth, pendingEmail).catch(() => []) : [];
        toast.error(
          isRtl
            ? `هذا البريد (${pendingEmail || "…"}) مسجل بالفعل بطريقة أخرى. سجّل الدخول بالبريد ثم اربط حسابك.`
            : `L'email (${pendingEmail || "…"}) est déjà associé à un autre compte. Connectez-vous avec l'email puis liez votre compte.`,
          { duration: 6000 }
        );
        logSecurity("sso_link_conflict", { email: pendingEmail || null, provider: p.id, methods });
        return;
      }
      if (authErr.code === "auth/popup-closed-by-user") return;
      if (authErr.code === "auth/popup-blocked") {
        toast.error(
          isRtl
            ? "تم حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة ثم حاول مجدداً."
            : "Popup bloquée. Autorisez les fenêtres pop-up puis réessayez."
        );
        return;
      }
      toast.error(
        isRtl
          ? `فشل تسجيل الدخول عبر ${p.name}.`
          : `Échec de connexion avec ${p.name}.`
      );
      logSecurity("login_failed", { type: p.id });
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuest = async () => {
    if (disabled) return;
    try {
      await onGuest();
    } catch {
      toast.error(isRtl ? "فشل الدخول كضيف." : "Échec de la connexion invité.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        {PROVIDERS.slice(0, 6).map((p) => (
          <motion.button
            key={p.id}
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleProvider(p)}
            disabled={disabled || loadingProvider !== null}
            title={p.name}
            className={`flex flex-col items-center justify-center gap-2 py-3.5 rounded-2xl border font-bold transition-all disabled:opacity-50 ${p.color} ${p.hover} ${p.border} ${p.text} shadow-sm`}
          >
            {loadingProvider === p.id ? (
              <svg className="animate-spin" width="19" height="19" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              p.mark("w-[19px] h-[19px]")
            )}
            <span className="text-[10px] leading-none">{p.name}</span>
          </motion.button>
        ))}
      </div>

      <button
        onClick={handleGuest}
        disabled={disabled || loadingProvider !== null}
        type="button"
        className="w-full pt-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-sm transition-colors text-center disabled:opacity-50"
      >
        <span className="border-b border-dotted border-slate-400 hover:border-solid hover:border-slate-800 dark:hover:border-slate-200 pb-1">
          {isRtl ? "المتابعة كضيف" : "Continuer en invité"}
        </span>
      </button>
    </div>
  );
}
