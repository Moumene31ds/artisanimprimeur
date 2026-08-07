"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Bell, Shield, Share2, CheckCircle2, Loader2, Smartphone } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { useAppStore } from "@/lib/store";
import { auth } from "@/lib/firebase";
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPWAInstalled,
  captureInstallPrompt,
  getInstallPrompt,
  promptInstall,
} from "@/lib/pwa";
import { triggerHapticFeedback } from "@/lib/utils";

type InstallState = "prompt" | "installing" | "installed" | "dismissed";
type PushState = "idle" | "requesting" | "granted" | "denied";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

export default function PWAPrompt() {
  const { language } = useAppStore();
  const isRtl = language === "ar";
  const reduceMotion = useReducedMotion();

  const [state, setState] = useState<InstallState>("dismissed");
  const [hasPrompt, setHasPrompt] = useState(false);
  const [pushStep, setPushStep] = useState<PushState>("idle");

  // هل يمكننا فعلاً تثبيت/توجيه؟ (iOS أو توفر قبلinstallprompt) — يمنع ظهور
  // اللوحة على متصفحات لا تدعم التثبيت (Firefox، متصفحات سطح المكتب القديمة...).
  const canShowRef = useRef(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    canShowRef.current = hasPrompt || isIOS();
  }, [hasPrompt]);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    const installed = localStorage.getItem("pwa-installed");
    // التطبيق مثبّت/رُفض سابقاً → لا نظهر اللوحة إطلاقاً.
    if (dismissed || installed || isPWAInstalled()) return;

    const ios = isIOS();
    // iOS يحتاج إرشادات يدوية + Android يحتاج قبلinstallprompt:
    // نؤجل الإظهار قليلاً حتى لا نزعج المستخدم فور دخوله.
    const timer = setTimeout(() => {
      if (!localStorage.getItem("pwa-prompt-dismissed") && canShowRef.current) {
        setState("prompt");
      }
    }, ios ? 8000 : 12000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      captureInstallPrompt(e);
      setHasPrompt(true);
    };

    const onInstalled = () => {
      try {
        localStorage.setItem("pwa-installed", "true");
      } catch {
        /* ignore */
      }
      setState("installed");
      autoCloseTimer.current = setTimeout(() => setState("dismissed"), 2600);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS()) return;
    if (!getInstallPrompt()) {
      setState("dismissed");
      return;
    }
    triggerHapticFeedback("medium");
    setState("installing");
    const outcome = await promptInstall();
    setHasPrompt(false);
    if (outcome === "accepted") {
      try {
        localStorage.setItem("pwa-installed", "true");
      } catch {
        /* ignore */
      }
      triggerHapticFeedback("heavy");
      setState("installed");
      autoCloseTimer.current = setTimeout(() => setState("dismissed"), 2600);
    } else {
      // رفض أو استهلكت المطالبة في مكان آخر → أغلق اللوحة.
      setState("dismissed");
    }
  }, []);

  const handleEnablePush = useCallback(async () => {
    setPushStep("requesting");
    const permission = await requestNotificationPermission();

    if (permission === "granted") {
      try {
        const subscription = await subscribeToPushNotifications();
        if (subscription) {
          await saveSubscription(subscription);
        }
        triggerHapticFeedback("light");
        setPushStep("granted");
      } catch {
        setPushStep("denied");
      }
    } else {
      try {
        await unsubscribeFromPushNotifications();
      } catch {
        /* ignore */
      }
      setPushStep("denied");
    }
  }, []);

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    const user = auth.currentUser;
    if (!user) return;
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        subscription: subscription.toJSON(),
      }),
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setState("dismissed");
    try {
      localStorage.setItem("pwa-prompt-dismissed", "true");
    } catch {
      /* ignore */
    }
  }, []);

  const isIosDevice = isIOS();
  const open = state !== "dismissed";
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, damping: 28, stiffness: 320 };

  return (
    <BottomSheet
      open={open}
      onClose={handleDismiss}
      isRtl={isRtl}
      maxWidth="max-w-md"
      dismissible={state === "prompt"}
      title={
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src="/icons/icon-192x192.png"
              alt=""
              className="w-12 h-12 rounded-[1.1rem] shadow-lg shadow-blue-500/20 ring-1 ring-black/5 dark:ring-white/10"
            />
            {state === "installed" && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                <CheckCircle2 size={11} className="text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight truncate">
              {isRtl ? "ثبّت تطبيق الطباعة" : "Installez l'app d'impression"}
            </p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {isRtl ? "تجربة أسرع وإشعارات فورية" : "Expérience plus rapide et notifications"}
            </p>
          </div>
        </div>
      }
    >
      {state === "installed" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={transition}
          className="flex flex-col items-center text-center py-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 260, delay: 0.1 }}
            className="w-20 h-20 rounded-[1.7rem] bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-5"
          >
            <CheckCircle2 size={38} className="text-white" />
          </motion.div>
          <p className="text-base font-black text-slate-900 dark:text-white mb-1.5">
            {isRtl ? "تم التثبيت بنجاح! 🎉" : "Installation réussie ! 🎉"}
          </p>
          <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 max-w-[16rem]">
            {isRtl
              ? "ابحث عن أيقونة التطبيق على شاشتك الرئيسية وافتحها مباشرة."
              : "Retrouvez l'icône sur votre écran d'accueil et lancez-la directement."}
          </p>
        </motion.div>
      ) : isIosDevice ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500 text-white font-black text-sm shrink-0 shadow-md shadow-blue-500/20">
              1
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                {isRtl ? "اضغط زر المشاركة" : "Appuyez sur Partager"}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {isRtl ? "أسفل المتصفح أو من شريط العنوان" : "En bas du navigateur ou barre d'adresse"}
              </p>
            </div>
            <Share2 size={18} className="text-blue-500 shrink-0" />
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500 text-white font-black text-sm shrink-0 shadow-md shadow-indigo-500/20">
              2
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                {isRtl ? "« إضافة إلى الشاشة الرئيسية »" : "« Ajouter à l'écran d'accueil »"}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {isRtl ? "ثم اضغط « إضافة » للتأكيد" : "Puis appuyez sur « Ajouter »"}
              </p>
            </div>
            <Smartphone size={18} className="text-indigo-500 shrink-0" />
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleDismiss}
              className="min-h-[52px] w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Download size={17} />
              {isRtl ? "حسناً، فهمت" : "J'ai compris"}
            </button>
            <button
              onClick={handleDismiss}
              className="min-h-[44px] w-full rounded-2xl text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-[0.98] transition-colors"
            >
              {isRtl ? "لاحقاً" : "Plus tard"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="space-y-2.5 mb-5">
            <FeatureRow
              icon={<Download size={16} className="text-emerald-500" />}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              text={isRtl ? "يعمل بدون إنترنت — اطلب حتى بدون اتصال" : "Fonctionne hors-ligne, même sans réseau"}
            />
            <FeatureRow
              icon={<Bell size={16} className="text-blue-500" />}
              iconBg="bg-blue-50 dark:bg-blue-950/40"
              text={isRtl ? "إشعارات لحظية لحالة طلباتك" : "Notifications en temps réel sur vos commandes"}
            />
            <FeatureRow
              icon={<Shield size={16} className="text-purple-500" />}
              iconBg="bg-purple-50 dark:bg-purple-950/40"
              text={isRtl ? "فتح أسرع وأكثر أماناً" : "Ouverture rapide et sécurisée"}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <motion.button
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              onClick={handleInstall}
              disabled={state === "installing"}
              className="min-h-[52px] w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {state === "installing" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {state === "installing"
                ? (isRtl ? "جارٍ التثبيت…" : "Installation…")
                : (isRtl ? "تثبيت التطبيق" : "Installer l'application")}
            </motion.button>

            {(pushStep === "idle" || pushStep === "requesting") && (
              <button
                onClick={handleEnablePush}
                disabled={pushStep === "requesting"}
                className="min-h-[46px] w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[12px] hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {pushStep === "requesting" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Bell size={15} />
                )}
                {pushStep === "requesting"
                  ? (isRtl ? "جارٍ التفعيل…" : "Activation…")
                  : (isRtl ? "تفعيل الإشعارات" : "Activer les notifications")}
              </button>
            )}

            {pushStep === "granted" && (
              <p className="text-center text-[12px] text-emerald-500 font-black">
                {isRtl ? "✓ الإشعارات مفعلة" : "✓ Notifications activées"}
              </p>
            )}

            {pushStep === "denied" && (
              <p className="text-center text-[12px] text-amber-500 font-bold">
                {isRtl ? "فعّل الإشعارات من إعدادات المتصفح" : "Activez les notifications dans les paramètres"}
              </p>
            )}

            <button
              onClick={handleDismiss}
              className="min-h-[44px] w-full rounded-2xl text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-[0.98] transition-colors"
            >
              {isRtl ? "لاحقاً" : "Plus tard"}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function FeatureRow({
  icon,
  iconBg,
  text,
}: {
  icon: React.ReactNode;
  iconBg: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${iconBg}`}>
        {icon}
      </span>
      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{text}</span>
    </div>
  );
}
