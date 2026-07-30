"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Bell, Smartphone, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { createTranslator } from "@/lib/translations";
import {
  registerServiceWorker,
  requestNotificationPermission,
  canInstallPWA,
} from "@/lib/pwa";

type InstallState = "prompt" | "dismissed" | "installing" | "installed";

export default function PWAPrompt() {
  const { language } = useAppStore();
  const t = createTranslator(language);
  const [state, setState] = useState<InstallState>("dismissed");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pushStep, setPushStep] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    const installed = localStorage.getItem("pwa-installed");
    if (dismissed || installed || canInstallPWA() === false) {
      if (installed) setState("installed");
      return;
    }

    registerServiceWorker().then((reg) => {
      if (reg) {
        setTimeout(() => {
          if (state === "dismissed" && !localStorage.getItem("pwa-prompt-dismissed")) {
            setState("prompt");
          }
        }, 10000);
      }
    });
  }, [state]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      window.location.href = "/manifest.json";
      return;
    }

    setState("installing");
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (result.outcome === "accepted") {
      setState("installed");
      localStorage.setItem("pwa-installed", "true");
    } else {
      setState("dismissed");
    }
  }, [deferredPrompt]);

  const handleEnablePush = useCallback(async () => {
    setPushStep("requesting");
    const permission = await requestNotificationPermission();

    if (permission === "granted") {
      setPushStep("granted");
    } else {
      setPushStep("denied");
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setState("dismissed");
    localStorage.setItem("pwa-prompt-dismissed", "true");
  }, []);

  return (
    <AnimatePresence>
      {state === "prompt" && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 md:bottom-8 left-4 right-4 z-50 max-w-md mx-auto premium-glass rounded-3xl border border-white/60 dark:border-white/10 shadow-2xl shadow-blue-500/10 overflow-hidden"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-10"
          >
            <X size={14} className="text-slate-500" />
          </button>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                <Smartphone size={22} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {language === "ar" ? "ثبّت التطبيق" : "Installer l'application"}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  {language === "ar" ? "تجربة أسرع وإشعارات فورية" : "Expérience plus rapide et notifications"}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <Download size={12} className="text-emerald-500 shrink-0" />
                <span>{language === "ar" ? "يعمل بدون إنترنت" : "Fonctionne hors-ligne"}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <Bell size={12} className="text-blue-500 shrink-0" />
                <span>{language === "ar" ? "إشعارات لحظية للطلبات" : "Notifications en temps réel"}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <Shield size={12} className="text-purple-500 shrink-0" />
                <span>{language === "ar" ? "فتح أسرع وأكثر أماناً" : "Ouverture rapide et sécurisée"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleInstall}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {language === "ar" ? "تثبيت التطبيق" : "Installer l'application"}
              </button>

              {pushStep === "idle" && (
                <button
                  onClick={handleEnablePush}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Bell size={14} />
                  {language === "ar" ? "تفعيل الإشعارات" : "Activer les notifications"}
                </button>
              )}

              {pushStep === "granted" && (
                <div className="text-center text-[11px] text-emerald-500 font-bold">
                  {language === "ar" ? "✓ الإشعارات مفعلة" : "✓ Notifications activées"}
                </div>
              )}

              {pushStep === "denied" && (
                <div className="text-center text-[11px] text-amber-500 font-bold">
                  {language === "ar" ? "المرجو تفعيل الإشعارات من الإعدادات" : "Activez les notifications dans les paramètres"}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
