"use client";
// src/components/PinSheets.tsx
// ---------------------------------------------------------------------------
// شاشات إدخال رمز PIN بملء الشاشة (نفس تصميم شاشة القفل) — إعداد رمز جديد
// (إدخال + تأكيد) والتحقق من الرمز الحالي (للتغيير أو الإلغاء). شاشة كاملة
// مضمونة الملاءمة مع كل الهواتف بخلاف الأوراق السفلية المزدحمة.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Lock, X } from "lucide-react";
import { PinKeypadPanel } from "@/components/AppLockUI";
import { useAppLock, PIN_LENGTH } from "@/lib/applock";
import { nativeHaptic, nativeHapticSuccess } from "@/lib/native";

/** إطار شاشة كاملة بنفس خلفية شاشة القفل. */
function PinScreenFrame({
  open,
  onClose,
  isRtl,
  children,
}: {
  open: boolean;
  onClose: () => void;
  isRtl: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex flex-col overflow-y-auto overscroll-contain bg-slate-950"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/30 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-5 end-5 z-10 p-2.5 bg-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 active:scale-90 transition-all"
          >
            <X size={18} />
          </button>

          <div className="relative m-auto flex flex-col items-center px-6 py-10 w-full max-w-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-5"
            >
              <Lock size={24} className="text-white" />
            </motion.div>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShakeWrap({ wrong, children }: { wrong: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      key={wrong ? "wrong" : "ok"}
      animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

/** جسم إدخال PIN مع إكمال تلقائي — onComplete تُعيد true/undefined للنجاح أو false للخطأ. */
function PinFlowBody({
  title,
  subtitle,
  isRtl,
  onComplete,
  onBack,
  onBiometric,
  biometricAvailable,
}: {
  title: string;
  subtitle: string;
  isRtl: boolean;
  onComplete: (pin: string) => Promise<boolean | void>;
  onBack?: () => void;
  onBiometric?: () => void;
  biometricAvailable?: boolean;
}) {
  const [count, setCount] = useState(0);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  const reset = () => {
    setPin("");
    setCount(0);
  };

  const handleDigit = (d: string) => {
    if (wrong) setWrong(false);
    const next = pin + d;
    setPin(next);
    setCount(next.length);
    if (next.length === PIN_LENGTH) {
      setTimeout(async () => {
        const ok = await onComplete(next);
        if (ok === false) {
          nativeHaptic("heavy");
          setWrong(true);
          reset();
        } else {
          nativeHapticSuccess();
          reset();
        }
      }, 120);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="text-center">
        <h3 className="text-white font-black text-lg">{title}</h3>
        <p className="text-white/50 text-sm mt-1">{subtitle}</p>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-white/50 hover:text-white transition-colors"
        >
          {isRtl ? "↩ العودة" : "↩ Retour"}
        </button>
      )}

      <ShakeWrap wrong={wrong}>
        <PinKeypadPanel
          count={count}
          wrong={wrong}
          onDigit={handleDigit}
          onDelete={reset}
          onBiometric={onBiometric}
          biometricAvailable={biometricAvailable}
          isRtl={isRtl}
        />
      </ShakeWrap>

      <div className="h-5">
        {wrong && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm font-bold"
          >
            {isRtl ? "رمز غير مطابق، حاول مجدداً" : "Code non valide, réessayez"}
          </motion.p>
        )}
      </div>
    </div>
  );
}

/** شاشة إنشاء رمز PIN جديد (إدخال + تأكيد). */
export function PinSetupSheet({
  open,
  onClose,
  onDone,
  isRtl,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  isRtl: boolean;
}) {
  const setupPin = useAppLock((s) => s.setupPin);
  const [step, setStep] = useState<"new" | "confirm" | "success">("new");
  const [firstPin, setFirstPin] = useState("");

  const handleClose = () => {
    setStep("new");
    setFirstPin("");
    onClose();
  };

  const handleFirst = async (pin: string) => {
    setFirstPin(pin);
    setStep("confirm");
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setStep("new");
      setFirstPin("");
      toast.error(isRtl ? "الرمزان غير متطابقين — أعد المحاولة" : "Les deux codes ne correspondent pas");
      return false;
    }
    await setupPin(pin);
    setStep("success");
    setTimeout(() => {
      handleClose();
      onDone();
    }, 900);
  };

  return (
    <PinScreenFrame open={open} onClose={handleClose} isRtl={isRtl}>
      {step === "new" && (
        <PinFlowBody
          key="new"
          title={isRtl ? "أنشئ رمزاً من 6 أرقام" : "Créez un code à 6 chiffres"}
          subtitle={isRtl ? "سيتطلبه التطبيق لفتح القفل" : "Il sera demandé pour déverrouiller"}
          isRtl={isRtl}
          onComplete={handleFirst}
        />
      )}
      {step === "confirm" && (
        <PinFlowBody
          key="confirm"
          title={isRtl ? "أعد إدخال الرمز للتأكيد" : "Confirmez le code"}
          subtitle={isRtl ? "أدخل نفس الرمز مرة أخرى" : "Saisissez à nouveau le même code"}
          isRtl={isRtl}
          onComplete={handleConfirm}
          onBack={() => setStep("new")}
        />
      )}
      {step === "success" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-md"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </motion.div>
          <p className="font-black text-white">{isRtl ? "تم تفعيل قفل PIN" : "Verrouillage PIN activé"}</p>
        </div>
      )}
    </PinScreenFrame>
  );
}

/** شاشة التحقق من الرمز الحالي (لتغييره أو إلغاؤه). */
export function VerifyPinSheet({
  open,
  onClose,
  onSuccess,
  isRtl,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isRtl: boolean;
  title?: string;
}) {
  const verifyPin = useAppLock((s) => s.verifyPin);

  const handleVerify = async (pin: string): Promise<boolean> => {
    const ok = await verifyPin(pin);
    if (ok) {
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 150);
    }
    return ok;
  };

  return (
    <PinScreenFrame open={open} onClose={onClose} isRtl={isRtl}>
      <PinFlowBody
        title={isRtl ? "تحقق من الهوية" : "Vérification"}
        subtitle={isRtl ? "أدخل رمز PIN الحالي للمتابعة" : "Saisissez votre code PIN actuel pour continuer"}
        isRtl={isRtl}
        onComplete={handleVerify}
      />
    </PinScreenFrame>
  );
}
