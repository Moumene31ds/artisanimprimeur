"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Lock, RefreshCw, ScanFace } from "lucide-react";
import {
  isNative,
  setupNativeApp,
  registerNativePush,
  setupNativePushListeners,
  registerAndroidBackButton,
  authenticateWithBiometric,
  getBiometryKind,
} from "@/lib/native";

const BIOMETRIC_LOCK_KEY = "native_biometric_lock";

export function isBiometricLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BIOMETRIC_LOCK_KEY) === "enabled";
  } catch {
    return false;
  }
}

export function setBiometricLockEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(BIOMETRIC_LOCK_KEY, "enabled");
    else localStorage.removeItem(BIOMETRIC_LOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** إقلاع بيئة التطبيق الأصلي: شاشة البداية، شريط الحالة، زر الرجوع، الإشعارات، وقفل البصمة. */
export default function NativeBootstrap() {
  const [locked, setLocked] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [biometryKind, setBiometryKind] = useState<"fingerprint" | "face" | "other">("other");

  useEffect(() => {
    if (!isNative()) return;

    getBiometryKind().then((kind) => {
      if (kind === "face" || kind === "iris") setBiometryKind("face");
      else if (kind === "fingerprint") setBiometryKind("fingerprint");
    });

    setupNativeApp();
    registerAndroidBackButton(() => {
      if (window.history.length > 1) window.history.back();
    });
    registerNativePush();
    setupNativePushListeners({
      onToken: (token) => {
        // أرسل الرمز لاحقاً إلى الخادم لربطه بمستخدم التطبيق (تكامل FCM).
        console.debug("[native-push] FCM token ready:", token.slice(0, 12) + "…");
      },
    });

    const newAppLockActive = (() => {
      try {
        return !!localStorage.getItem("applock_pin_hash");
      } catch {
        return false;
      }
    })();
    const lockEnabled = newAppLockActive ? false : isBiometricLockEnabled();
    if (lockEnabled) {
      setLocked(true);
      authenticateWithBiometric("افتح التطبيق ببصمة إصبعك").then((ok) => {
        setChecking(false);
        if (ok) setLocked(false);
        else setAuthError(true);
      });
    } else {
      setChecking(false);
    }
  }, []);

  if (!isNative() || !locked) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col items-center justify-center gap-5 px-8"
      dir="rtl"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-accent flex items-center justify-center shadow-2xl shadow-indigo-500/30"
      >
        {biometryKind === "face" ? <ScanFace size={40} /> : <Fingerprint size={40} />}
      </motion.div>

      <div className="text-center space-y-1">
        <h1 className="text-lg font-black">التطبيق مقفول</h1>
        <p className="text-xs text-slate-400 font-semibold">
          {authError ? "تعذر التحقق — حاول مجدداً" : "افتح بقفل الشاشة أو البصمة"}
        </p>
      </div>

      {checking && !authError ? (
        <RefreshCw size={22} className="animate-spin text-indigo-400" />
      ) : (
        <button
          onClick={async () => {
            setAuthError(false);
            setChecking(true);
            const ok = await authenticateWithBiometric("افتح التطبيق ببصمة إصبعك");
            setChecking(false);
            if (ok) setLocked(false);
            else setAuthError(true);
          }}
          className="mt-2 inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-black text-sm shadow-xl active:scale-95 transition-transform cursor-pointer"
        >
          <Lock size={16} />
          فتح التطبيق
        </button>
      )}
    </motion.div>
  );
}
