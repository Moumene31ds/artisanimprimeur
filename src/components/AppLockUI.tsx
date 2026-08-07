"use client";
// src/components/AppLockUI.tsx
// ---------------------------------------------------------------------------
// واجهة قفل التطبيق: شاشة PIN بملء الشاشة + لوحة المفاتيح الرقمية + حارس
// الخصوصية (غشاوة عند إخفاء التطبيق). كلها قابلة لإعادة الاستخدام في شاشة
// القفل وإعدادات PIN (الإنشاء/التحقق).
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { nativeHaptic, nativeHapticSuccess } from "@/lib/native";
import { useAppLock, PIN_LENGTH } from "@/lib/applock";

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

function useIsRtl() {
  const language = useAppStore((s) => s.language);
  return language === "ar";
}

// ---------------------------------------------------------------------------
// PinDots — نقاط إدخال الرمز
// ---------------------------------------------------------------------------
export function PinDots({
  count,
  wrong,
  size = "md",
}: {
  count: number;
  wrong?: boolean;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5";
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <motion.span
          key={i}
          className={`${dot} rounded-full transition-all duration-200 ${
            i < count
              ? wrong
                ? "bg-red-500 scale-110 shadow-md shadow-red-500/40"
                : "bg-white scale-110 shadow-md shadow-white/30"
              : "bg-white/20"
          }`}
          animate={{ scale: i < count ? 1.15 : 1 }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PinKeypad — لوحة الأرقام
// ---------------------------------------------------------------------------
export function PinKeypad({
  onDigit,
  onDelete,
  disabled,
  isRtl,
  size = "md",
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  isRtl: boolean;
  size?: "md" | "lg";
}) {
  const btnH = size === "lg" ? "h-16 sm:h-[72px]" : "h-14 sm:h-16";
  const btnW = size === "lg" ? "w-16 sm:w-[72px]" : "w-14 sm:w-16";

  const handle = (v: string) => {
    if (disabled) return;
    if (v === "back") {
      nativeHaptic("light");
      onDelete();
    } else if (v !== "") {
      nativeHaptic("light");
      onDigit(v);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3.5 select-none" dir="ltr">
      {KEYPAD.map((v, i) => {
        if (v === "back") {
          return (
            <button
              key={i}
              type="button"
              aria-label="Effacer"
              onClick={() => handle(v)}
              disabled={disabled}
              className={`${btnH} ${btnW} rounded-2xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 bg-transparent transition-all active:scale-90 disabled:opacity-40`}
            >
              <Delete size={22} />
            </button>
          );
        }
        if (v === "") {
          return <div key={i} className={`${btnH} ${btnW}`} />;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => handle(v)}
            disabled={disabled}
            className={`${btnH} ${btnW} rounded-2xl flex flex-col items-center justify-center text-white text-2xl font-bold bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 shadow-lg transition-all active:scale-90 disabled:opacity-40`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PinKeypadPanel — نقط + لوحة (قابلة لإعادة الاستخدام في الإعدادات)
// ---------------------------------------------------------------------------
export function PinKeypadPanel({
  count,
  wrong,
  onDigit,
  onDelete,
  onBiometric,
  biometricAvailable,
  isRtl,
  size = "md",
}: {
  count: number;
  wrong: boolean;
  onDigit: (d: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  biometricAvailable?: boolean;
  isRtl: boolean;
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <PinDots count={count} wrong={wrong} />
      <PinKeypad onDigit={onDigit} onDelete={onDelete} isRtl={isRtl} size={size} />
      {onBiometric && biometricAvailable && (
        <button
          type="button"
          onClick={onBiometric}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
        >
          <Fingerprint size={18} />
          {isRtl ? "دخول بالبصمة" : "Déverrouillage biométrique"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppLockScreen — شاشة القفل بملء الشاشة
// ---------------------------------------------------------------------------
export function AppLockScreen() {
  const isRtl = useIsRtl();
  const lockStore = useAppLock();
  const [count, setCount] = useState(0);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [biometricOk, setBiometricOk] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    import("@/lib/applock")
      .then((m) => m.checkBiometricSupport())
      .then((ok) => {
        if (mounted) setBiometricOk(ok);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const clock = now.toLocaleTimeString(isRtl ? "ar-DZ" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = useMemo(
    () =>
      new Intl.DateTimeFormat(isRtl ? "ar-DZ" : "fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(now),
    [now, isRtl]
  );
  const hour = now.getHours();
  const greeting = hour < 12
    ? isRtl ? "صباح الخير" : "Bonjour"
    : hour < 18
      ? isRtl ? "نهارك سعيد" : "Bon après-midi"
      : isRtl ? "مساء الخير" : "Bonsoir";

  const lockoutLeft = lockStore.lockoutUntil > Date.now()
    ? Math.max(0, Math.ceil((lockStore.lockoutUntil - Date.now()) / 1000))
    : 0;

  const resetInput = () => {
    setPin("");
    setCount(0);
  };

  const handleDigit = async (d: string) => {
    if (lockoutLeft > 0) return;
    setWrong(false);
    const next = pin + d;
    setPin(next);
    setCount(next.length);
    if (next.length === PIN_LENGTH) {
      const { verifyPin, touch } = lockStore;
      setTimeout(async () => {
        const ok = await verifyPin(next);
        if (ok) {
          nativeHapticSuccess();
        } else {
          nativeHaptic("heavy");
          setWrong(true);
          resetInput();
        }
        touch();
      }, 120);
    }
  };

  const handleBiometric = async () => {
    const ok = await lockStore.unlockByBiometric(
      isRtl ? "افتح التطبيق ببصمة إصبعك" : "Déverrouiller avec votre empreinte"
    );
    if (ok) nativeHapticSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col overflow-y-auto overscroll-contain bg-slate-950"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* خلفية زخرفية */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/30 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px] pointer-events-none" />

      <div className="relative m-auto flex flex-col items-center px-6 py-8 w-full max-w-sm">
        {/* الشعار */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-4"
        >
          <Lock size={28} className="text-white" />
        </motion.div>

        <h1 className="text-white font-black text-base mb-0.5" dir="ltr">
          L&apos;Artisan Imprimeur
        </h1>
        <p className="text-white/50 text-xs mb-6">{isRtl ? "الحرفي للطباعة" : "Impression professionnelle"}</p>

        {/* الساعة */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-4"
          dir="ltr"
        >
          <div className="text-4xl font-black text-white tracking-tight tabular-nums">{clock}</div>
          <div className="text-white/50 text-xs mt-1 capitalize">{dateStr}</div>
        </motion.div>

        {/* الترحيب */}
        <p className="text-white/60 text-sm mb-5">{greeting}</p>

        {/* النقاط مع اهتزاز عند الخطأ */}
        <motion.div
          key={wrong ? "wrong" : "ok"}
          animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <PinDots count={count} wrong={wrong} />
        </motion.div>

        {/* حالة الخطأ أو القفل المؤقت */}
        <div className="h-5 mb-3 flex items-center justify-center">
          <AnimatePresence>
            {lockoutLeft > 0 ? (
              <motion.p
                key="lockout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm font-semibold flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                {isRtl
                  ? `أُقفل مؤقتاً — أعد المحاولة بعد ${lockoutLeft} ثانية`
                  : `Verrouillé — réessayez dans ${lockoutLeft}s`}
              </motion.p>
            ) : wrong ? (
              <motion.p
                key="wrong"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm font-semibold"
              >
                {isRtl ? "رمز غير صحيح، حاول مجدداً" : "Code incorrect, réessayez"}
              </motion.p>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 text-sm">
                {isRtl ? "أدخل رمز PIN الخاص بك" : "Entrez votre code PIN"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <PinKeypadPanel
          count={count}
          wrong={wrong}
          onDigit={handleDigit}
          onDelete={resetInput}
          onBiometric={lockStore.biometricEnabled && biometricOk ? handleBiometric : undefined}
          biometricAvailable={biometricOk}
          isRtl={isRtl}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PrivacyGuard — غشاوة الخصوصية عند إخفاء التطبيق أو تسجيل الشاشة
// ---------------------------------------------------------------------------
export function PrivacyGuard({ active }: { active: boolean }) {
  const isRtl = useIsRtl();
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-slate-950"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-5">
            <ShieldCheck size={34} className="text-white" />
          </div>
          <p className="text-white/70 text-sm">{isRtl ? "المحتوى مخفي لحماية خصوصيتك" : "Contenu masqué — confidentialité"}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
