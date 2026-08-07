"use client";
// src/components/PinSheets.tsx
// ---------------------------------------------------------------------------
// أوراق إعداد رمز PIN: إنشاء رمز جديد (إدخال + تأكيد) والتحقق من الرمز الحالي
// (لتغييره أو إلغاؤه). تعيد استخدام لوحة الأرقام من AppLockUI.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import BottomSheet from "@/components/BottomSheet";
import { PinKeypadPanel } from "@/components/AppLockUI";
import { useAppLock, PIN_LENGTH } from "@/lib/applock";
import { nativeHaptic, nativeHapticSuccess } from "@/lib/native";

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

/** جسم لوحة إدخال PIN مع إكمال تلقائي — onComplete تُعيد true/undefined للنجاح أو false للخطأ. */
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
    <div className="flex flex-col items-center gap-5 py-1">
      <div className="text-center">
        <h3 className="font-black text-slate-900 dark:text-white text-base">{title}</h3>
        <p className="text-xs font-bold text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-accent transition-colors"
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

      {wrong && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 text-sm font-bold"
        >
          {isRtl ? "رمز غير مطابق، حاول مجدداً" : "Code non valide, réessayez"}
        </motion.p>
      )}
    </div>
  );
}

/** ورقة إنشاء رمز PIN جديد (إدخال + تأكيد). */
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
    <BottomSheet open={open} onClose={handleClose} title={isRtl ? "إعداد رمز PIN" : "Configurer le code PIN"} isRtl={isRtl}>
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
            className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </motion.div>
          <p className="font-black text-slate-900 dark:text-white">{isRtl ? "تم تفعيل قفل PIN" : "Verrouillage PIN activé"}</p>
        </div>
      )}
    </BottomSheet>
  );
}

/** ورقة التحقق من الرمز الحالي (لتغييره أو إلغاؤه). */
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
    <BottomSheet open={open} onClose={onClose} title={title ?? (isRtl ? "أدخل رمز PIN الحالي" : "Entrez votre code PIN actuel")} isRtl={isRtl}>
      <PinFlowBody
        title={isRtl ? "تحقق من الهوية" : "Vérification"}
        subtitle={isRtl ? "أدخل رمز PIN الحالي للمتابعة" : "Saisissez votre code PIN actuel pour continuer"}
        isRtl={isRtl}
        onComplete={handleVerify}
      />
    </BottomSheet>
  );
}
