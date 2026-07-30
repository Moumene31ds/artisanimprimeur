"use client";

import { useAppStore } from "@/lib/store";
import { createTranslator, getLanguageDirection, normalizeLanguage } from "@/lib/translations";
import { 
  Printer, Mail, Lock, ArrowRight, User as UserIcon, Sparkles, Loader2, 
  Eye, EyeOff, ShieldCheck, KeyRound, ArrowLeft, CheckCircle2, Phone, Smartphone, 
  Gift, HelpCircle, AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { GlobalLoader } from "@/components/GlobalLoader"; 
import SecurityVerification from "@/components/SecurityVerification";
import { getAuthErrorMessage, getPasswordStrength, validateEmail, validateSignupForm } from "@/lib/auth-utils";

type AuthMode = "login" | "signup" | "forgot" | "phone";

export default function LoginPage() {
  const { language, setLanguage } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("weak");
  const [formMessage, setFormMessage] = useState("");
  const [resetSentSuccess, setResetSentSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [hasReferral, setHasReferral] = useState(false);

  const normalizedLanguage = normalizeLanguage(language);
  const isRtl = getLanguageDirection(normalizedLanguage) === "rtl";
  const t = createTranslator(normalizedLanguage);

  useEffect(() => { setMounted(true); }, []);

  // Capture referral code if present in URL query string
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      if (refCode) {
        localStorage.setItem("referred_by_code", refCode.trim().toUpperCase());
        setAuthMode("signup");
        setHasReferral(true);
        toast.info(isRtl ? "🎁 كود الإحالة مفعّل! أنشئ حساباً للحصول على 50 نقطة هدية." : "🎁 Code de parrainage activé ! Créez un compte pour gagner 50 points.");
      } else if (localStorage.getItem("referred_by_code")) {
        setHasReferral(true);
      }
    }
  }, [mounted, isRtl]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  // Handle redirect result after Google/Facebook redirect sign-in
  useEffect(() => {
    if (!mounted) return;
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setLoading(true);
          await applyReferralIfNewUser(
            result.user.uid,
            result.user.email ?? "",
            result.user.displayName ?? "User"
          );
          await addDoc(collection(db, "securityLogs"), {
            event: "login_success",
            email: result.user.email ?? "social-user",
            timestamp: serverTimestamp(),
            type: "redirect",
            status: "success",
            ip: "client-logged",
          });
          toast.success(isRtl ? "أهلاً بك! تم تسجيل الدخول بنجاح." : "Bienvenue ! Connexion réussie.");
          router.push("/");
        }
      } catch (err: any) {
        if (err?.code) {
          const msg = getAuthErrorMessage(err.code, isRtl);
          setFormMessage(msg);
          toast.error(msg);
        }
      } finally {
        setLoading(false);
      }
    };
    handleRedirectResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);


  const applyReferralIfNewUser = async (userId: string, userEmail: string, userName: string) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists() && userSnap.data().createdAt && userSnap.data().referralApplied) {
        return; 
      }

      const refCode = localStorage.getItem("referred_by_code");
      if (!refCode) return;

      const inputCode = refCode.trim().toUpperCase();
      const codeRef = doc(db, "referralCodes", inputCode);
      const codeSnap = await getDoc(codeRef);
      if (codeSnap.exists()) {
        const referrerData = codeSnap.data();
        const referrerId = referrerData.userId;
        
        if (referrerId !== userId) {
          await addDoc(collection(db, "pointTransactions"), {
            userId: referrerId,
            type: 'won',
            points: 50,
            title: `Referral bonus from user #${userId.substring(0, 6)}`,
            titleAr: `هدية إحالة من المستخدم #${userId.substring(0, 6)}`,
            createdAt: serverTimestamp(),
          });

          await addDoc(collection(db, "pointTransactions"), {
            userId: userId,
            type: 'won',
            points: 50,
            title: `Applied referral code of user #${referrerId.substring(0, 6)}`,
            titleAr: `تطبيق كود إحالة المستخدم #${referrerId.substring(0, 6)}`,
            createdAt: serverTimestamp(),
          });

          const referrerDocRef = doc(db, "users", referrerId);
          const referrerSnap = await getDoc(referrerDocRef);
          const referrerPoints = referrerSnap.exists() ? (referrerSnap.data().points || 0) : 0;
          await setDoc(referrerDocRef, { points: referrerPoints + 50 }, { merge: true });

          await setDoc(userDocRef, {
            referredBy: inputCode,
            referredByUserId: referrerId,
            referralApplied: true,
            points: (userSnap.exists() ? (userSnap.data().points || 0) : 0) + 50,
            email: userEmail,
            displayName: userName,
            createdAt: serverTimestamp()
          }, { merge: true });

          localStorage.removeItem("referred_by_code");
        }
      }
    } catch (err) {
      console.error("Error applying social referral:", err);
    }
  };

  // Security Verification States
  const [uiConfig, setUiConfig] = useState<any>({
    captchaMode: "disabled",
    recaptchaSiteKey: ""
  });
  const [securityVerified, setSecurityVerified] = useState(true);

  // Brute Force Protection States
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    
    const checkLockout = () => {
      const lockoutUntil = localStorage.getItem("login_lockout_until");
      if (lockoutUntil) {
        const remaining = Math.ceil((Number(lockoutUntil) - Date.now()) / 1000);
        if (remaining > 0) {
          setIsLocked(true);
          setLockoutTimeLeft(remaining);
          return remaining;
        } else {
          localStorage.removeItem("login_lockout_until");
          localStorage.removeItem("login_failed_attempts");
          setIsLocked(false);
          setLockoutTimeLeft(0);
        }
      }
      return 0;
    };

    const initialRemaining = checkLockout();
    if (initialRemaining > 0) {
      const interval = setInterval(() => {
        const rem = checkLockout();
        if (rem <= 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mounted, isLocked]);

  useEffect(() => {
    if (!mounted) return;
    const fetchSecuritySettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ui"));
        if (snap.exists()) {
          const data = snap.data();
          setUiConfig(data);
          if (data.captchaMode === "disabled") {
            setSecurityVerified(true);
          } else {
            setSecurityVerified(false);
          }
        }
      } catch (err) {
        console.error("Error loading security settings:", err);
      }
    };
    fetchSecuritySettings();
  }, [mounted]);

  if (!mounted) return <GlobalLoader />;

  // Phone SMS OTP Login Handler (Simulated regional Algerian OTP +213)
  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage("");
    if (!phoneNumber || phoneNumber.length < 8) {
      const msg = isRtl ? "يرجى إدخال رقم هاتف جزائري صحيح (مثال: 0555123456)." : "Veuillez saisir un numéro algérien valide.";
      setFormMessage(msg);
      toast.error(msg);
      return;
    }

    if (!otpSent) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setOtpSent(true);
        toast.success(isRtl ? "تم إرسال رمز التحقق (OTP) عبر SMS!" : "Code de vérification envoyé par SMS !");
      }, 1200);
    } else {
      if (otpCode.length < 4) {
        const msg = isRtl ? "رمز التحقق يتكون من 4 إلى 6 أرقام." : "Le code doit comporter au moins 4 chiffres.";
        setFormMessage(msg);
        toast.error(msg);
        return;
      }
      setLoading(true);
      try {
        await signInAnonymously(auth);
        toast.success(isRtl ? "تم الدخول بنجاح عبر الهاتف!" : "Connexion réussie via Téléphone !");
        router.push("/");
      } catch (err) {
        toast.error(isRtl ? "رمز التحقق غير صحيح." : "Code OTP incorrect.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Email authentication handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage("");
    setResetSentSuccess(false);

    if (isLocked) {
      toast.error(isRtl ? "الحساب مقفل مؤقتاً لحمايتك!" : "Formulaire verrouillé temporairement !");
      return;
    }

    if (authMode === "forgot") {
      handlePasswordReset();
      return;
    }

    if (rememberMe) {
      localStorage.setItem("remembered_email", email.trim());
    } else {
      localStorage.removeItem("remembered_email");
    }

    if (authMode === "signup") {
      const validation = validateSignupForm({ name, email, password });
      if (!validation.ok) {
        const localized = validation.message === 'name'
          ? (isRtl ? 'يرجى إدخال الاسم الكامل.' : 'Veuillez saisir votre nom complet.')
          : validation.message === 'email'
            ? (isRtl ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Veuillez saisir une adresse email valide.')
            : (isRtl ? 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع أرقام ورموز.' : 'Mot de passe trop faible. Utilisez au moins 8 caractères avec chiffres et symboles.');
        setFormMessage(localized);
        toast.error(localized);
        return;
      }
    } else if (!validateEmail(email)) {
      const localized = isRtl ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Veuillez saisir une adresse email valide.';
      setFormMessage(localized);
      toast.error(localized);
      return;
    }

    setLoading(true);
    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        
        localStorage.removeItem("login_failed_attempts");
        localStorage.removeItem("login_lockout_until");
        setFormMessage("");

        await addDoc(collection(db, "securityLogs"), {
          event: "login_success",
          email: email.trim(),
          timestamp: serverTimestamp(),
          type: "email",
          status: "success",
          ip: "client-logged"
        });

        toast.success(isRtl ? "تم تسجيل الدخول بنجاح!" : "Connexion réussie !");
      } else {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(res.user, { displayName: name.trim() });

        await setDoc(doc(db, "users", res.user.uid), {
          email: email.trim(),
          displayName: name.trim(),
          points: 0,
          createdAt: serverTimestamp()
        }, { merge: true });

        await applyReferralIfNewUser(res.user.uid, email.trim(), name.trim());

        await addDoc(collection(db, "securityLogs"), {
          event: "signup_success",
          email: email.trim(),
          name: name.trim(),
          timestamp: serverTimestamp(),
          type: "email",
          status: "success",
          ip: "client-logged"
        });

        toast.success(isRtl ? "تم إنشاء الحساب بنجاح!" : "Compte créé avec succès !");
      }
      router.push("/");
    } catch (err: any) {
      const friendlyMessage = getAuthErrorMessage(err?.code || "", isRtl);
      setFormMessage(friendlyMessage);
      if (authMode === "login") {
        const attempts = Number(localStorage.getItem("login_failed_attempts") || 0) + 1;
        localStorage.setItem("login_failed_attempts", attempts.toString());

        await addDoc(collection(db, "securityLogs"), {
          event: "login_failed",
          email: email.trim(),
          timestamp: serverTimestamp(),
          type: "email",
          status: "failed",
          details: `Tentative incorrecte ${attempts}/5`,
          ip: "client-logged"
        });

        if (attempts >= 5) {
          const lockoutDuration = 15 * 60 * 1000;
          const lockoutUntil = Date.now() + lockoutDuration;
          localStorage.setItem("login_lockout_until", lockoutUntil.toString());
          setIsLocked(true);
          setLockoutTimeLeft(15 * 60);

          await addDoc(collection(db, "securityLogs"), {
            event: "brute_force_lockout",
            email: email.trim(),
            timestamp: serverTimestamp(),
            type: "email",
            status: "lockout",
            details: "Trop de tentatives incorrectes. Bloqué pendant 15 minutes.",
            ip: "client-logged"
          });

          toast.error(isRtl 
            ? "لقد تجاوزت الحد الأقصى لمحاولات تسجيل الدخول! تم قفل الحساب مؤقتاً لمدة 15 دقيقة." 
            : "Nombre maximal de tentatives dépassé ! Formulaire verrouillé pour 15 minutes.");
        } else {
          toast.error(err?.code?.includes("invalid-credential")
            ? (isRtl ? `البيانات غير صحيحة. المحاولة ${attempts} من 5.` : `Identifiants incorrects. Tentative ${attempts} sur 5.`)
            : friendlyMessage);
        }
      } else {
        toast.error(friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!validateEmail(email)) {
      const localized = isRtl ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Veuillez saisir une adresse email valide.';
      setFormMessage(localized);
      toast.error(localized);
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      const localized = isRtl 
        ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح!' 
        : 'Un lien de réinitialisation a été envoyé à votre adresse e-mail !';
      setFormMessage(localized);
      setResetSentSuccess(true);
      toast.success(localized);
    } catch (err: any) {
      const friendlyMessage = getAuthErrorMessage(err?.code || "", isRtl);
      setFormMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setFormMessage("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      let res;
      try {
        // Primary method: popup (faster UX)
        res = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        // Fallback: redirect if popup is blocked or unsupported
        const blockedCodes = [
          'auth/popup-blocked',
          'auth/popup-closed-by-user',
          'auth/cancelled-popup-request',
        ];
        if (blockedCodes.includes(popupErr?.code)) {
          toast.info(
            isRtl
              ? "جاري التحويل إلى صفحة تسجيل الدخول..."
              : "Redirection vers la page de connexion Google..."
          );
          await signInWithRedirect(auth, provider);
          return; // redirect will reload the page
        }
        throw popupErr; // rethrow non-popup errors
      }

      if (!res?.user) throw new Error('No user returned from Google sign-in.');

      await applyReferralIfNewUser(
        res.user.uid,
        res.user.email ?? "",
        res.user.displayName ?? "Google User"
      );

      await addDoc(collection(db, "securityLogs"), {
        event: "login_success",
        email: res.user.email ?? "google-user",
        timestamp: serverTimestamp(),
        type: "google",
        status: "success",
        ip: "client-logged",
      });

      toast.success(isRtl ? "أهلاً بك! تم تسجيل الدخول عبر Google." : "Bienvenue ! Connexion Google réussie.");
      router.push("/");
    } catch (err: any) {
      console.error("Google Login Error:", err?.code, err?.message);
      const friendlyMessage = getAuthErrorMessage(err?.code || "", isRtl);
      setFormMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setFormMessage("");
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');

      let res;
      try {
        res = await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        const blockedCodes = [
          'auth/popup-blocked',
          'auth/popup-closed-by-user',
          'auth/cancelled-popup-request',
        ];
        if (blockedCodes.includes(popupErr?.code)) {
          toast.info(
            isRtl
              ? "جاري التحويل إلى صفحة تسجيل الدخول..."
              : "Redirection vers la page de connexion Facebook..."
          );
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }

      if (!res?.user) throw new Error('No user returned from Facebook sign-in.');

      await applyReferralIfNewUser(
        res.user.uid,
        res.user.email ?? "",
        res.user.displayName ?? "Facebook User"
      );

      await addDoc(collection(db, "securityLogs"), {
        event: "login_success",
        email: res.user.email ?? "facebook-user",
        timestamp: serverTimestamp(),
        type: "facebook",
        status: "success",
        ip: "client-logged",
      });

      toast.success(isRtl ? "تم تسجيل الدخول بـ Facebook!" : "Connexion Facebook réussie !");
      router.push("/");
    } catch (err: any) {
      console.error("Facebook Login Error:", err?.code, err?.message);
      const friendlyMessage = getAuthErrorMessage(err?.code || "", isRtl);
      setFormMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setFormMessage("");
    try {
      await signInAnonymously(auth);
      router.push("/");
    } catch(err) {
      toast.error(isRtl ? "فشل الدخول كضيف." : "Échec de la connexion invité.");
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} bg-slate-50 dark:bg-[#020617] relative overflow-hidden`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Background Animated Blobs */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 -right-10 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{animationDelay: '3s'}}></div>

      {/* Brand Hero Sidebar (Large Screens) */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden items-center justify-center p-12 border-e border-slate-800/60">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-emerald-600/20 pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-lg text-white">
          <Link href="/" className="inline-block mb-10 hover:scale-105 transition-transform group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl shadow-blue-500/30 group-hover:rotate-6 transition-transform">
              <Printer size={32} className="text-white" />
            </div>
          </Link>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black mb-6 leading-tight tracking-tight"
          >
            L'Impression<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Réinventée & Connectée.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-slate-400 text-base font-medium leading-relaxed"
          >
            {isRtl 
              ? "انضم إلى أكثر من 15,000 عميل وشركة في الجزائر يثقون في منصة الحرفي لتحويل تصاميمهم إلى مطبوعات فاخرة وتوصيلها حتى الباب." 
              : "Rejoignez plus de 15 000 clients et entreprises en Algérie qui font confiance à L'Artisan pour imprimer et livrer leurs projets."}
          </motion.p>

          {/* Interactive Feature Cards */}
          <div className="mt-12 space-y-4">
             <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{isRtl ? "دخول آمن 100% ومشفر" : "Authentification Sécurisée"}</h4>
                  <p className="text-xs text-slate-400">{isRtl ? "تشفير SSL متقدم مدمج مع حماية ضد المحاولات المتكررة" : "Cryptage SSL 256 bits et protection contre la force brute"}</p>
                </div>
             </div>

             <div className="p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Gift size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{isRtl ? "برنامج المكافآت والإحالة" : "Programme de Parrainage VIP"}</h4>
                  <p className="text-xs text-slate-400">{isRtl ? "احصل على 50 نقطة ولاء مجانية لكل صديق تدعوه للمنصة" : "Gagnez 50 points pour chaque ami invité sur notre plateforme"}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Authentication Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md">
          
          {/* Quick Header & Language Toggle */}
          <div className="flex justify-between items-center mb-8">
             <Link href="/" className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
               <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
               {isRtl ? "العودة للرئيسية" : "Retour à l'accueil"}
             </Link>
             <button 
               onClick={() => setLanguage(language === 'ar' ? 'fr' : 'ar')} 
               className="px-4 py-2 bg-slate-200/60 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700 transition-colors shadow-sm"
             >
               {language === 'ar' ? 'Français' : 'العربية'}
             </button>
          </div>

          {/* Referral Active Banner */}
          {hasReferral && authMode === "signup" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-blue-500/15 border border-emerald-500/30 dark:border-emerald-500/20 p-3.5 rounded-2xl flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                🎁
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                <p className="font-black text-emerald-600 dark:text-emerald-400">
                  {isRtl ? "كود الإحالة مفعّل!" : "Code de parrainage activé !"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isRtl ? "أنشئ حسابك الآن واستلم 50 نقطة مكافأة مجاناً في محفظتك." : "Inscrivez-vous pour débloquer votre bonus de 50 points."}
                </p>
              </div>
            </motion.div>
          )}

          <div className="text-center lg:text-start mb-6">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
              {authMode === "login" && t("welcomeBackTitle")}
              {authMode === "signup" && t("createAccountTitle")}
              {authMode === "forgot" && t("forgotPasswordTitle")}
              {authMode === "phone" && (isRtl ? "الدخول برقم الهاتف" : "Connexion par Téléphone")}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {authMode === "login" && t("welcomeBackSubtitle")}
              {authMode === "signup" && t("createAccountSubtitle")}
              {authMode === "forgot" && t("forgotPasswordDescription")}
              {authMode === "phone" && (isRtl ? "أدخل رقم هاتفك الجزائري لاستلام رمز التحقق الفوري" : "Entrez votre numéro algérien pour recevoir un code SMS")}
            </p>
          </div>

          {/* View Switcher Tabs (Login / Signup / Phone) */}
          {authMode !== "forgot" ? (
            <div className="flex p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl mb-6 border border-slate-200 dark:border-slate-700/60">
               <button 
                 onClick={() => { setAuthMode("login"); setFormMessage(""); }} 
                 className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${authMode === "login" ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                  {t("login")}
               </button>
               <button 
                 onClick={() => { setAuthMode("signup"); setFormMessage(""); }} 
                 className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${authMode === "signup" ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                  {t("signup")}
               </button>
               <button 
                 onClick={() => { setAuthMode("phone"); setFormMessage(""); }} 
                 className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${authMode === "phone" ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
               >
                  <Smartphone size={14} />
                  <span>{isRtl ? "هاتف" : "SMS"}</span>
               </button>
            </div>
          ) : (
            <button 
              onClick={() => { setAuthMode("login"); setFormMessage(""); setResetSentSuccess(false); }}
              className="inline-flex items-center gap-2 mb-6 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
              {t("backToLogin")}
            </button>
          )}

          {/* Security Banner Card */}
          <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{t("secureAuthTitle")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("secureAuthDescription")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800">{t("secureAuthFeature1")}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800">{t("secureAuthFeature2")}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800">{t("secureAuthFeature3")}</span>
            </div>
          </div>

          {/* Form: Phone Mode vs Email/Password Mode */}
          {authMode === "phone" ? (
            <form onSubmit={handlePhoneAuth} className="space-y-4">
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-400 text-xs font-bold`}>
                  🇩🇿 +213
                </div>
                <input 
                  required 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  placeholder={isRtl ? "555 12 34 56" : "555 12 34 56"} 
                  disabled={otpSent}
                  className={`w-full ${isRtl ? 'pr-20 pl-4' : 'pl-20 pr-4'} py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm`} 
                />
              </div>

              {otpSent && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <input 
                    required 
                    type="text" 
                    maxLength={6}
                    value={otpCode} 
                    onChange={e => setOtpCode(e.target.value)} 
                    placeholder={isRtl ? "أدخل الرمز (مثال: 1234)" : "Entrez le code OTP (ex: 1234)"} 
                    className="w-full text-center tracking-[0.5em] py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono font-black text-lg" 
                  />
                </motion.div>
              )}

              {/* Alert Message Box */}
              {formMessage && (
                <div className="rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                  <AlertCircle size={16} />
                  <span>{formMessage}</span>
                </div>
              )}

              <button disabled={loading} type="submit" className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-base shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer mt-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  otpSent ? (isRtl ? "تأكيد والدخول" : "Valider et Connecter") : (isRtl ? "إرسال رمز SMS" : "Envoyer le code SMS")
                )}
                {!loading && <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4 relative">
              <AnimatePresence>
                {isLocked && (
                  <motion.div 
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 z-20 rounded-3xl flex flex-col items-center justify-center p-6 text-center border border-red-500/25 shadow-2xl"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-16 h-16 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/30 shadow-lg"
                    >
                      <Lock size={32} className="animate-pulse" />
                    </motion.div>
                    
                    <h3 className="text-lg font-black text-slate-950 dark:text-white mb-2">
                      {t("securityBannerTitle")}
                    </h3>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4 leading-relaxed font-bold">
                      {t("securityBannerText")}
                    </p>

                    <div className="bg-slate-100 dark:bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
                        {t("securityBannerTimer")}
                      </span>
                      <span className="text-xl font-black font-mono text-red-500 animate-pulse">
                        {Math.floor(lockoutTimeLeft / 60)}:{(lockoutTimeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name Field (Sign Up Mode Only) */}
              <AnimatePresence mode="popLayout">
                {authMode === "signup" && (
                  <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}} className="relative">
                    <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}><UserIcon size={18} className="text-slate-400"/></div>
                    <input 
                      required type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t("nameLabel")} 
                      className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm`} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Field */}
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}><Mail size={18} className="text-slate-400"/></div>
                <input 
                  required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t("email")} 
                  className={`w-full ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm dir-ltr`} 
                  dir="ltr" 
                />
              </div>

              {/* Password Field (Login & Signup Modes) */}
              {authMode !== "forgot" && (
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}><Lock size={18} className="text-slate-400"/></div>
                  <input 
                    required type={showPassword ? "text" : "password"} value={password} onChange={e=>{
                      setPassword(e.target.value);
                      setPasswordStrength(getPasswordStrength(e.target.value));
                    }} placeholder={t("password")} 
                    className={`w-full ${isRtl ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'} py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm dir-ltr`} 
                    dir="ltr" 
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200`}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {/* Password Strength Meter (Signup Mode) */}
              {authMode === "signup" && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{t("passwordStrengthLabel")}</span>
                    <span className={passwordStrength === 'strong' ? 'text-emerald-600' : passwordStrength === 'medium' ? 'text-amber-600' : 'text-rose-600'}>
                      {passwordStrength === 'strong' ? t("passwordStrong") : passwordStrength === 'medium' ? t("passwordMedium") : t("passwordWeak")}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength === 'strong' ? 'w-full bg-emerald-500' : passwordStrength === 'medium' ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-rose-500'}`} />
                  </div>
                </div>
              )}

              {/* Alert Message Box */}
              {formMessage && (
                <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${resetSentSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400'}`}>
                  {resetSentSuccess ? <CheckCircle2 size={16} /> : <KeyRound size={16} />}
                  <span>{formMessage}</span>
                </div>
              )}

              {/* Security CAPTCHA Check */}
              {uiConfig.captchaMode !== "disabled" && (
                <div className="pt-1">
                  <SecurityVerification 
                    captchaMode={uiConfig.captchaMode || "slider"}
                    siteKey={uiConfig.recaptchaSiteKey}
                    language={language}
                    onVerify={setSecurityVerified}
                  />
                </div>
              )}

              {/* Options Row (Remember Me & Forgot Password link) */}
              {authMode === "login" && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    {t("rememberMe")}
                  </label>
                  <button type="button" onClick={() => { setAuthMode("forgot"); setFormMessage(""); }} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {t("forgotPassword")}
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button disabled={loading || !securityVerified} type="submit" className="w-full py-3.5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-base shadow-xl shadow-slate-900/20 dark:shadow-blue-500/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer mt-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  authMode === "login" ? t("login") : authMode === "signup" ? t("createAccount") : (t("sendResetLink") || "إرسال رابط الاستعادة")
                )}
                {!loading && <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />}
              </button>
            </form>
          )}

          {/* Social Auth Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase font-bold"><span className="bg-slate-50 dark:bg-[#020617] px-4 text-slate-400 dark:text-slate-500">{t("or")}</span></div>
          </div>

          {/* Social Auth & Guest Buttons */}
          <div className="space-y-3">
            <button onClick={handleGoogleLogin} disabled={loading} type="button" className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-2xl font-bold text-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {t("googleLogin")}
            </button>
            
            <button onClick={handleFacebookLogin} disabled={loading} type="button" className="w-full py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-2xl font-bold text-sm hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              {t("facebookLogin")}
            </button>

            <button onClick={handleGuest} disabled={loading} type="button" className="w-full pt-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-xs transition-colors text-center disabled:opacity-50">
              <span className="border-b border-dotted border-slate-400 hover:border-solid hover:border-slate-800 dark:hover:border-slate-200 pb-0.5">
                {t("guestAccessHint")}
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
