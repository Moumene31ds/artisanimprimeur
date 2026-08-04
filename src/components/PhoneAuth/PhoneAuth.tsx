// src/components/PhoneAuth/PhoneAuth.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Smartphone,
  Loader2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Pencil,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  MessageSquareText,
  WifiOff,
  FlaskConical,
} from "lucide-react";
import type { User, ConfirmationResult } from "firebase/auth";
import { OTPInput } from "./OTPInput";
import SecurityVerification from "@/components/SecurityVerification";
import {
  sendOTP,
  verifyOTP,
  createTokenVerifier,
  configureAuthTestMode,
  isValidPhone,
  getAuthErrorMessage,
  maskPhone,
  formatPhoneInput,
  secondsToTime,
  type Language,
  type CaptchaConfig,
} from "@/lib/phoneAuth";

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;
// وضع الاختبار: بدون إرسال SMS فعلي (يتطلب إضافة الرقم ضمن قائمة أرقام الاختبار في Firebase Console)
const TEST_MODE = process.env.NEXT_PUBLIC_AUTH_TEST_MODE === "true";
const RESEND_KEY = "phoneAuthResendUntil";
const PHONE_KEY = "phoneAuthLastPhone";

const COUNTRY_CODES: Array<{ code: string; label: string; flag: string }> = [
  { code: "+213", label: "الجزائر DZ", flag: "🇩🇿" },
  { code: "+33", label: "فرنسا FR", flag: "🇫🇷" },
  { code: "+1", label: "الولايات المتحدة US", flag: "🇺🇸" },
  { code: "+44", label: "المملكة المتحدة GB", flag: "🇬🇧" },
  { code: "+212", label: "المغرب MA", flag: "🇲🇦" },
  { code: "+216", label: "تونس TN", flag: "🇹🇳" },
  { code: "+971", label: "الإمارات AE", flag: "🇦🇪" },
  { code: "+966", label: "السعودية SA", flag: "🇸🇦" },
];

interface PhoneAuthProps {
  language?: Language;
  /** يُستدعى عند نجاح التحقق */
  onSuccess?: (user: User) => void;
  /** إظهار زر تغيير الرقم والعودة للخطوة الأولى */
  allowChangeNumber?: boolean;
  /** إعدادات الحماية من وثيقة settings/ui — نفس reCAPTCHA المستخدمة في السلة */
  captchaConfig?: CaptchaConfig;
}

export function PhoneAuth({
  language = "ar",
  onSuccess,
  allowChangeNumber = true,
  captchaConfig,
}: PhoneAuthProps) {
  const isRtl = language === "ar";
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [countryCode, setCountryCode] = useState("+213");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // هل نستخدم reCAPTCHA المشروع (من السلة) بدل الافتراضي من Firebase؟
  const useProjectCaptcha =
    !!captchaConfig &&
    (captchaConfig.mode === "recaptcha" || captchaConfig.mode === "recaptcha_v3") &&
    !!captchaConfig.siteKey;
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showWebOTP, setShowWebOTP] = useState(false);
  const [otpError, setOtpError] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  // وقت انتهاء عداد إعادة الإرسال (يمر عبر sessionStorage ليصمد عند تحديث الصفحة)
  const resendUntilRef = useRef(0);

  const t = {
    title: isRtl ? "تسجيل الدخول برقم الهاتف" : "Connexion par téléphone",
    subtitle: isRtl
      ? "أدخل رقم هاتفك وسنرسل لك رمز تحقق عبر الرسائل النصية"
      : "Entrez votre numéro et recevez un code de vérification par SMS",
    phoneLabel: isRtl ? "رقم الهاتف" : "Numéro de téléphone",
    phonePlaceholder: isRtl ? "5 00 00 00 00" : "5 00 00 00 00",
    sendCode: isRtl ? "إرسال رمز التحقق" : "Envoyer le code",
    sending: isRtl ? "جاري الإرسال..." : "Envoi en cours...",
    otpTitle: isRtl ? "أدخل رمز التحقق" : "Entrez le code de vérification",
    otpSubtitle: isRtl
      ? "أدخل الرمز المكوّن من 6 أرقام المرسل إلى"
      : "Saisissez le code à 6 chiffres envoyé au",
    verifying: isRtl ? "جاري التحقق..." : "Vérification...",
    verify: isRtl ? "تأكيد الرمز" : "Confirmer",
    resendIn: isRtl ? "إعادة الإرسال خلال" : "Renvoyer dans",
    resend: isRtl ? "إعادة إرسال الرمز" : "Renvoyer le code",
    changeNumber: isRtl ? "تغيير الرقم" : "Changer de numéro",
    webotp: isRtl
      ? "التقاط الرمز تلقائيًا مفعّل من الرسائل النصية"
      : "Saisie automatique activée depuis le SMS",
    secure: isRtl
      ? "محمي بواسطة Google reCAPTCHA غير المرئي"
      : "Protégé par Google reCAPTCHA invisible",
    sentSuccess: isRtl
      ? "تم إرسال رمز التحقق بنجاح"
      : "Code de vérification envoyé avec succès",
    verified: isRtl ? "تم تسجيل الدخول بنجاح!" : "Connexion réussie !",
    invalidPhone: isRtl
      ? "الرجاء إدخال رقم هاتف صحيح بالصيغة الدولية"
      : "Veuillez saisir un numéro valide au format international",
    enterCode: isRtl
      ? "أدخل رمز التحقق أولًا"
      : "Saisissez d'abord le code de vérification",
    sessionExpired: isRtl
      ? "انتهت الجلسة. أعد إرسال الرمز."
      : "Session expirée. Renvoyez un nouveau code.",
    offline: isRtl
      ? "أنت غير متصل بالإنترنت — تحقق من اتصالك ثم أعد المحاولة."
      : "Vous êtes hors ligne — vérifiez votre connexion puis réessayez.",
    testMode: isRtl
      ? "وضع الاختبار مفعّل: أضف رقمك ضمن أرقام الاختبار في Firebase Console ثم أدخل رمز الاختبار."
      : "Mode test activé : ajoutez votre numéro aux numéros de test dans Firebase Console puis saisissez le code de test.",
  };

  const fullPhone = `${countryCode}${phoneLocal}`;

  const startCountdown = useCallback(() => {
    resendUntilRef.current = Date.now() + RESEND_SECONDS * 1000;
    setCountdown(RESEND_SECONDS);
    try {
      sessionStorage.setItem(RESEND_KEY, String(resendUntilRef.current));
    } catch {
      /* ignore */
    }
  }, []);

  // التهيئة: وضع الاختبار + استرجاع العداد والرقم المحفوظ
  useEffect(() => {
    if (TEST_MODE) configureAuthTestMode(true);
    try {
      const until = Number(sessionStorage.getItem(RESEND_KEY) || 0);
      if (until > Date.now()) resendUntilRef.current = until;
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { code?: string; phone?: string };
        if (parsed?.code && parsed?.phone) {
          setCountryCode(parsed.code);
          setPhoneLocal(String(parsed.phone));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // عداد تنازلي لإعادة الإرسال يعتمد على الوقت المطلق (يصمد عند تحديث الصفحة)
  useEffect(() => {
    if (step !== "otp") return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((resendUntilRef.current - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        try {
          sessionStorage.removeItem(RESEND_KEY);
        } catch {
          /* ignore */
        }
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  // دعم WebOTP API في المتصفح الحالي (لعرض شارة الملء التلقائي)
  useEffect(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;
    setShowWebOTP(true);
  }, [step]);

  const handleSendCode = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(t.offline);
      toast.error(t.offline);
      return;
    }
    if (!isValidPhone(fullPhone)) {
      setError(t.invalidPhone);
      toast.error(t.invalidPhone);
      return;
    }

    // عند تفعيل reCAPTCHA المشروع يجب إتمام التحقق أولًا (مثل السلة)
    if (useProjectCaptcha && !captchaToken) {
      const msg = isRtl
        ? "أكمل التحقق الأمني أولًا لإرسال الرمز."
        : "Veuillez compléter la vérification de sécurité avant d'envoyer le code.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setSending(true);

    try {
      const confirmation = useProjectCaptcha && captchaToken
        ? await sendOTP(fullPhone, createTokenVerifier(captchaToken))
        : await sendOTP(fullPhone);
      confirmationRef.current = confirmation;
      setOtp("");
      setOtpError(false);
      startCountdown();
      setStep("otp");
      setSuccessMsg(t.sentSuccess);
      toast.success(t.sentSuccess);
      // حفظ الرقم لملء تلقائي في الزيارة القادمة
      try {
        localStorage.setItem(PHONE_KEY, JSON.stringify({ code: countryCode, phone: phoneLocal }));
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error("[PhoneAuth] sendOTP failed", err);
      let msg = getAuthErrorMessage(err, language);
      if (TEST_MODE) {
        msg += isRtl
          ? " (في وضع الاختبار: أضف رقمك ضمن أرقام الاختبار في Firebase Console ثم أعد المحاولة)"
          : " (en mode test : ajoutez votre numéro aux numéros de test dans Firebase Console puis réessayez)";
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (code = otp) => {
    const cleanCode = code.trim();
    if (cleanCode.length !== OTP_LENGTH) {
      const msg = t.enterCode;
      setError(msg);
      setOtpError(true);
      toast.error(msg);
      return;
    }
    if (!confirmationRef.current) {
      setError(t.sessionExpired);
      setOtpError(true);
      return;
    }

    setError(null);
    setOtpError(false);
    setVerifying(true);

    try {
      const user = await verifyOTP(confirmationRef.current, cleanCode);
      try {
        confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
      } catch {
        /* ignore */
      }
      setSuccessMsg(t.verified);
      toast.success(t.verified);
      onSuccess?.(user);
    } catch (err) {
      console.error("[PhoneAuth] verifyOTP failed", err);
      const msg = getAuthErrorMessage(err, language);
      setError(msg);
      setOtpError(true);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (countdown > 0 || !isValidPhone(fullPhone)) return;
    if (useProjectCaptcha && !captchaToken) return;
    setError(null);
    setSending(true);
    try {
      const confirmation = useProjectCaptcha && captchaToken
        ? await sendOTP(fullPhone, createTokenVerifier(captchaToken))
        : await sendOTP(fullPhone);
      confirmationRef.current = confirmation;
      setOtp("");
      setOtpError(false);
      startCountdown();
      setSuccessMsg(t.sentSuccess);
      toast.success(t.sentSuccess);
    } catch (err) {
      console.error("[PhoneAuth] resend OTP failed", err);
      const msg = getAuthErrorMessage(err, language);
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, fullPhone, language, captchaToken, useProjectCaptcha, startCountdown]);

  const handleChangeNumber = () => {
    setStep("phone");
    setOtp("");
    setOtpError(false);
    setError(null);
    setSuccessMsg(null);
    setCountdown(0);
    try {
      sessionStorage.removeItem(RESEND_KEY);
    } catch {
      /* ignore */
    }
  };

  const cardAnimation = {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 0.98 },
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative min-h-dvh w-full flex items-center justify-center overflow-hidden p-4 sm:p-6"
    >
      {/* خلفية متدرجة متحركة */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/30 dark:bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-violet-500/25 dark:bg-violet-700/20 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-cyan-400/25 dark:bg-cyan-600/15 blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      {/* زر تبديل الوضع الداكن/الفاتح */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
        className="absolute top-5 end-5 p-2.5 rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur-xl border border-white/50 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-lg hover:scale-105 active:scale-95 transition-transform"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          {...cardAnimation}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full max-w-md premium-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl relative z-10"
        >
          {/* حاوية reCAPTCHA غير المرئية */}
          <div id="recaptcha-container" className="fixed -top-10 -left-10 w-px h-px opacity-0 pointer-events-none" />

          {/* الترويسة */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-5"
            >
              <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </motion.div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
              {t.title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              {step === "phone" ? t.subtitle : t.otpSubtitle}
            </p>
            {step === "otp" && (
              <p dir="ltr" className="mt-1 text-sm font-bold text-accent">
                {maskPhone(fullPhone)}
              </p>
            )}
          </div>

          {/* رسائل الخطأ والنجاح */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-xl p-3.5 text-sm text-amber-700 dark:text-amber-300 font-semibold"
                role="alert"
              >
                <WifiOff className="h-5 w-5 shrink-0" />
                <span>{t.offline}</span>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-300/60 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/30 backdrop-blur-xl p-3.5 text-sm text-rose-700 dark:text-rose-300 font-semibold"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
            {successMsg && !error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-300/60 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 backdrop-blur-xl p-3.5 text-sm text-emerald-700 dark:text-emerald-300 font-semibold"
                role="status"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* الخطوة 1: رقم الهاتف */}
          {step === "phone" && (
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.phoneLabel}
                </label>
                <div
                  dir="ltr"
                  className="flex items-stretch gap-2 rounded-2xl border-2 border-white/50 dark:border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-xl focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.15)] transition-all"
                >
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label="Country code"
                    className="pl-3 pr-2 py-3.5 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none border-e border-slate-200/60 dark:border-white/10"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code} className="dark:bg-slate-900">
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={t.phonePlaceholder}
                    value={formatPhoneInput(phoneLocal)}
                    onChange={(e) =>
                      setPhoneLocal(e.target.value.replace(/[^\d]/g, ""))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    className="flex-1 min-w-0 px-3 py-3.5 bg-transparent text-base font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400/70 outline-none"
                  />
                </div>
              </div>

              {TEST_MODE && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-violet-300/60 dark:border-violet-500/30 bg-violet-50/80 dark:bg-violet-950/30 p-3.5 text-xs text-violet-700 dark:text-violet-300 font-semibold leading-relaxed">
                  <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t.testMode}</span>
                </div>
              )}

              {/* reCAPTCHA المشروع (نفس المكوّن المستخدم في السلة) */}
              {useProjectCaptcha && (
                <div className="pt-1">
                  <SecurityVerification
                    captchaMode={captchaConfig!.mode}
                    siteKey={captchaConfig!.siteKey}
                    language={language}
                    onVerify={() => {}}
                    onToken={(token) => setCaptchaToken(token)}
                  />
                </div>
              )}

              <button
                onClick={handleSendCode}
                disabled={sending || !phoneLocal || (useProjectCaptcha && !captchaToken)}
                className="btn-shine w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-base shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.sending}
                  </>
                ) : (
                  <>
                    {isRtl ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                    {t.sendCode}
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t.secure}
              </p>
            </div>
          )}

          {/* الخطوة 2: إدخال رمز OTP */}
          {step === "otp" && (
            <div className="space-y-6">
              <OTPInput
                length={OTP_LENGTH}
                value={otp}
                onChange={(code) => {
                  setOtp(code);
                  setOtpError(false);
                }}
                onComplete={(code) => handleVerify(code)}
                error={otpError}
                disabled={verifying}
                webOTP
              />

              {showWebOTP && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {t.webotp}
                </motion.p>
              )}

              {TEST_MODE && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-violet-300/60 dark:border-violet-500/30 bg-violet-50/80 dark:bg-violet-950/30 p-3.5 text-xs text-violet-700 dark:text-violet-300 font-semibold leading-relaxed">
                  <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t.testMode}</span>
                </div>
              )}

              <button
                onClick={() => handleVerify()}
                disabled={verifying || otp.length !== OTP_LENGTH}
                className="btn-shine w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-black text-base shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.verifying}
                  </>
                ) : (
                  <>
                    {isRtl ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                    {t.verify}
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-3">
                {/* إعادة الإرسال مع العداد التنازلي */}
                <div className="flex-1 min-w-0">
                  {countdown > 0 ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3 justify-center">
                      <RotateCcw className={`h-4 w-4 text-slate-400 ${sending ? "animate-spin" : ""}`} />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {t.resendIn}{" "}
                        <span dir="ltr" className="text-accent font-black text-sm inline-block min-w-6 text-center tabular-nums">
                          {secondsToTime(countdown)}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/5 dark:bg-accent/10 px-4 py-3 text-sm font-black text-accent hover:bg-accent/10 dark:hover:bg-accent/15 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      {t.resend}
                    </button>
                  )}
                </div>

                {/* تغيير الرقم */}
                {allowChangeNumber && (
                  <button
                    onClick={handleChangeNumber}
                    className="flex items-center gap-1.5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t.changeNumber}
                  </button>
                )}
              </div>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t.secure}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
