"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Languages, Palette, Gauge, Type as TypeIcon, RotateCcw, Check, Sun, Moon,
  Monitor, Smartphone, Sparkles, ChevronRight, ArrowLeft, Zap, Cpu, MemoryStick,
  Wifi, RefreshCw, Rocket, Bell, Vibrate, Loader2, Activity, Droplets, Eye,
  HardDrive, Trash2, Battery, BatteryCharging, Clock, Download, CheckCircle2,
  Share2, Fingerprint, ShieldCheck, Lock, KeyRound, Timer, EyeOff
} from "lucide-react";
import { useAppStore, type ThemeMode, type FontSizeMode, type DeviceTier } from "@/lib/store";
import { useTheme } from "next-themes";
import { TRANSLATIONS, normalizeLanguage } from "@/lib/translations";
import Reveal from "@/components/Reveal";
import {
  detectDevice, getDeviceFacts, describeDevice, getBatteryInfo,
  getRecommendations, estimateBatterySavings, getConfidenceInfo,
  type DeviceSignals, type BatteryInfo,
} from "@/lib/device";
import { checkForUpdates, getBuildInfo, applyServiceWorkerUpdate, requestNotificationPermission, getLastSeenBuild, dispatchShowUpdate, promptInstall, isAppInstalled } from "@/lib/pwa";
import { APP_VERSION, CHANGELOG } from "@/lib/changelog";
import { isNative, getNativePlatform, getNativeAppInfo, nativeShare, isBiometricAvailable, authenticateWithBiometric } from "@/lib/native";
import { isBiometricLockEnabled, setBiometricLockEnabled } from "@/components/NativeBootstrap";
import { useAppLock, type LockMode } from "@/lib/applock";
import { PinSetupSheet, VerifyPinSheet } from "@/components/PinSheets";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 ${
        checked
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
          : "bg-slate-200 dark:bg-slate-700"
      } disabled:opacity-50`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md ${
          checked ? "right-1" : "left-1"
        }`}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  desc,
  iconClass,
  children,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  desc: string;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal direction="up" className="w-full">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${iconClass}`}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white text-base">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
          </div>
        </div>
        {children}
      </div>
    </Reveal>
  );
}

const TIER_COLORS: Record<DeviceTier, string> = {
  weak: "text-red-500",
  medium: "text-amber-500",
  powerful: "text-emerald-500",
};

const TIER_BG: Record<DeviceTier, string> = {
  weak: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  medium: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  powerful: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
};

function ScoreGauge({ score }: { score: number }) {
  const tier: DeviceTier = score < 45 ? "weak" : score <= 70 ? "medium" : "powerful";
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const stroke = tier === "weak" ? "#ef4444" : tier === "medium" ? "#f59e0b" : "#10b981";
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
        <circle
          cx="48" cy="48" r={radius} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{score}</span>
        <span className="text-[9px] font-bold text-slate-400 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const {
    language, setLanguage,
    theme, setTheme,
    performanceMode, setPerformanceMode,
    animationsEnabled, setAnimationsEnabled,
    fontSize, setFontSize,
    autoOptimize, setAutoOptimize,
    hapticFeedback, setHapticFeedback,
    notificationsEnabled, setNotificationsEnabled,
    deviceScore, deviceTier, deviceDetectedAt, deviceDetail, setDeviceInfo,
    backgroundEffects, setBackgroundEffects,
    reduceBlur, setReduceBlur,
    keepAwake, setKeepAwake,
    clearCart, clearFavorites,
    resetSettings,
  } = useAppStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [installingApp, setInstallingApp] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [nativeInfo, setNativeInfo] = useState<{ version: string | null; build: string | null } | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLock, setBiometricLock] = useState(false);
  const [sharingApp, setSharingApp] = useState(false);
  const [facts, setFacts] = useState<ReturnType<typeof getDeviceFacts> | null>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [storage, setStorage] = useState<{ local: number; cache: number }>({ local: 0, cache: 0 });

  const lock = useAppLock();
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<"change" | "disable" | null>(null);

  const fmtBytes = (b: number) => {
    if (b <= 0) return "0";
    const mb = b / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`;
  };

  useEffect(() => {
    setMounted(true);
    setAppInstalled(isAppInstalled());
    const onInstalled = () => setAppInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    setFacts(getDeviceFacts());
    getBatteryInfo().then(setBattery);
    if (isNative()) {
      getNativeAppInfo().then(setNativeInfo);
      isBiometricAvailable().then(setBiometricAvailable);
      setBiometricLock(isBiometricLockEnabled());
    }
    (async () => {
      let localBytes = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)!;
          localBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
        }
      } catch { /* ignore */ }
      let cacheBytes = 0;
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          cacheBytes = est.usage ?? 0;
        }
      } catch { /* ignore */ }
      setStorage({ local: localBytes, cache: cacheBytes });
    })();
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  // تحديث حقائق الجهاز (الشبكة/الذاكرة) بعد كل إعادة فحص تلقائية
  useEffect(() => {
    if (deviceScore !== null) setFacts(getDeviceFacts());
  }, [deviceScore]);

  if (!mounted) return null;

  const isRtl = language === "ar";
  const t = TRANSLATIONS[normalizeLanguage(language)] as Record<string, string>;
  const tr = (key: string, fallback?: string) => (t as any)[key] ?? fallback ?? key;
  const isDarkNow = resolvedTheme === "dark";

  const tierLabel = (tier: DeviceTier | null) =>
    tier === "weak" ? tr("tierWeak") : tier === "medium" ? tr("tierMedium") : tier === "powerful" ? tr("tierPowerful") : "—";

  const fmtAgo = (ts: number | null) => {
    if (!ts) return "—";
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return tr("justNow");
    return tr("minutesAgo").replace("{n}", String(Math.floor(seconds / 60)));
  };

  const batterySavings = estimateBatterySavings(deviceTier ?? "medium");
  const recommendations = getRecommendations(deviceTier ?? "medium");
  const suggestPerformance = deviceTier === "weak" && !performanceMode;
  const confidence = deviceDetail?.confidence ?? null;
  const confidenceInfo = confidence != null ? getConfidenceInfo(confidence) : null;
  const factors = deviceDetail?.factors ?? [];

  const reDetect = async () => {
    setAnalyzing(true);
    try {
      const signals: DeviceSignals = await detectDevice({ full: true });
      setDeviceInfo(signals.score, signals.tier, signals);
      setFacts(getDeviceFacts());
      toast.success(
        isRtl ? `اكتمل التحليل: ${signals.score} (${tierLabel(signals.tier)}) · موثوقية ${signals.confidence}%`
          : `Analyse terminée : ${signals.score} (${tierLabel(signals.tier)}) · fiabilité ${signals.confidence}%`
      );
    } catch {
      toast.error(isRtl ? "تعذّر تحليل الجهاز" : "Impossible d'analyser l'appareil");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyRecommendation = async () => {
    const signals = await detectDevice({ prev: deviceDetail });
    setDeviceInfo(signals.score, signals.tier, signals);
    if (signals.tier === "weak") {
      setPerformanceMode(true);
      setAnimationsEnabled(false);
    } else {
      setPerformanceMode(false);
      setAnimationsEnabled(true);
    }
    toast.success(isRtl ? "تم تطبيق الوضع الموصى به لجهازك ✨" : "Réglage recommandé appliqué ✨");
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        toast.error(tr("notifDenied"));
        return;
      }
      setNotificationsEnabled(true);
      toast.success(isRtl ? "تم تفعيل الإشعارات ✓" : "Notifications activées ✓");
    } else {
      setNotificationsEnabled(false);
      toast.success(isRtl ? "تم إيقاف الإشعارات" : "Notifications désactivées");
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    try {
      await checkForUpdates();
      const info = await getBuildInfo();
      const lastSeen = getLastSeenBuild();
      if (info && lastSeen !== info.version) {
        // نسخة جديدة حقيقية → إظهار واجهة التحديث فوراً.
        dispatchShowUpdate(info);
      } else {
        toast.success(tr("upToDate"));
      }
    } catch {
      toast.success(tr("upToDate"));
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    setUpdating(true);
    try {
      await applyServiceWorkerUpdate();
    } catch { /* ignore */ }
    setTimeout(() => { window.location.reload(); }, 1200);
  };

  const handleInstallApp = async () => {
    if (appInstalled) return;
    setInstallingApp(true);
    const outcome = await promptInstall();
    setInstallingApp(false);
    if (outcome === "accepted") {
      setAppInstalled(true);
      toast.success(tr("installDone"));
    } else if (outcome === "unavailable") {
      // لا توجد مطالبة محفوظة → توجيه يدوي حسب النظام الأساسي.
      toast.info(
        /iPhone|iPad|iPod/.test(navigator.userAgent) ? tr("installIOSHint") : tr("installBrowserHint"),
        { duration: 5000 }
      );
    }
  };

  const handleShareNativeApp = async () => {
    if (sharingApp) return;
    setSharingApp(true);
    await nativeShare({
      title: "L'Artisan Imprimeur | الحرفي للطباعة",
      text: "الطباعة الاحترافية في الجزائر — Impressions pro en Algérie",
      url: "https://artisanimprimeur.vercel.app",
    });
    setSharingApp(false);
  };

  const handleToggleBiometricLock = async (next: boolean) => {
    if (next) {
      const ok = await authenticateWithBiometric(isRtl ? "فعّل قفل بصمة الإصبع" : "Activez le déverrouillage biométrique");
      if (!ok) {
        toast.error(isRtl ? "تعذر التحقق — لم يُفعَّل القفل" : "Échec de vérification — verrouillage non activé");
        return;
      }
    }
    setBiometricLockEnabled(next);
    setBiometricLock(next);
    toast.success(next
      ? (isRtl ? "تم تفعيل قفل البصمة ✓" : "Déverrouillage biométrique activé ✓")
      : (isRtl ? "تم إيقاف قفل البصمة" : "Déverrouillage biométrique désactivé"));
  };

  const handleClearCache = async () => {
    if (!window.confirm(tr("clearCacheConfirm"))) return;
    setClearing(true);
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      clearCart();
      clearFavorites();
      try {
        localStorage.removeItem("artisan-imprimeur-storage");
        localStorage.removeItem("pwa-last-seen-build");
      } catch { /* ignore */ }
      setStorage({ local: 0, cache: 0 });
      toast.success(tr("clearCacheDone"));
      setTimeout(() => { window.location.reload(); }, 900);
    } catch {
      toast.error(isRtl ? "فشل مسح البيانات" : "Échec du nettoyage");
    } finally {
      setClearing(false);
    }
  };

  const themes: { value: ThemeMode; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { value: "light", label: tr("themeLight"), icon: Sun },
    { value: "dark", label: tr("themeDark"), icon: Moon },
    { value: "system", label: tr("themeSystem"), icon: Monitor },
  ];

  const fontSizes: { value: FontSizeMode; label: string; px: string }[] = [
    { value: "sm", label: tr("fontSizeSmall"), px: "85%" },
    { value: "md", label: tr("fontSizeMedium"), px: "100%" },
    { value: "lg", label: tr("fontSizeLarge"), px: "115%" },
    { value: "xl", label: tr("fontSizeXl"), px: "130%" },
  ];

  const changelogEntry = CHANGELOG.find((e) => e.version === APP_VERSION);

  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 mb-6 shadow-xl">
        <div className="decor-blob absolute -top-20 -right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="decor-blob absolute -bottom-24 -left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-blob animation-delay-1000"></div>
        <div className="relative z-10">
          <Link href="/profile" className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm font-bold mb-4">
            {isRtl ? <ChevronRight size={18} /> : <ArrowLeft size={18} />}
            {isRtl ? "العودة للملف الشخصي" : "Retour au profil"}
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{tr("settingsTitle")}</h1>
              <p className="text-blue-200/90 text-sm mt-1">{tr("settingsSubtitle")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 max-w-2xl mx-auto">

        {/* Language */}
        <SectionCard
          icon={Languages}
          title={tr("settingsLanguage")}
          desc={tr("settingsLanguageDesc")}
          iconClass="bg-gradient-to-tr from-blue-500 to-indigo-600"
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { code: "ar" as const, label: tr("langAr"), flag: "🇩🇿" },
              { code: "fr" as const, label: tr("langFr"), flag: "🇫🇷" },
            ].map((lang) => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`relative flex flex-col items-center gap-2 py-4 min-h-[88px] rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-lg shadow-blue-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className={`font-black text-sm ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`} dir="auto">
                    {lang.label}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center"
                    >
                      <Check size={14} strokeWidth={3} />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          icon={Palette}
          title={tr("settingsAppearance")}
          desc={tr("settingsAppearanceDesc")}
          iconClass="bg-gradient-to-tr from-amber-500 to-orange-600"
        >
          <div className="grid grid-cols-3 gap-2.5">
            {themes.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`relative flex flex-col items-center gap-2 py-3.5 min-h-[72px] rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    active
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-lg shadow-amber-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Icon size={20} className={active ? "text-amber-500" : "text-slate-500 dark:text-slate-400"} />
                  <span className={`text-[11px] font-black ${active ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}`}>
                    {label}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center"
                    >
                      <Check size={12} strokeWidth={3} />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {isDarkNow ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-500" />}
            {isRtl
              ? (theme === "dark" ? "الوضع الداكن مفعّل حالياً" : theme === "light" ? "الوضع الفاتح مفعّل حالياً" : "الوضع التلقائي يتبع جهازك")
              : (theme === "dark" ? "Mode sombre actif" : theme === "light" ? "Mode clair actif" : "Le mode automatique suit votre appareil")}
          </div>
        </SectionCard>

        {/* Device (smart detection) */}
        <SectionCard
          icon={Activity}
          title={tr("settingsDevice")}
          desc={tr("settingsDeviceDesc")}
          iconClass="bg-gradient-to-tr from-cyan-500 to-blue-600"
        >
          <div className="flex flex-col sm:flex-row items-center gap-5 mb-5">
            <ScoreGauge score={deviceScore ?? 50} />
            <div className="flex-1 w-full text-center sm:text-start">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{tr("deviceScore")}</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${TIER_BG[deviceTier ?? "medium"]}`}>
                  {tierLabel(deviceTier)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                {describeDevice(deviceTier ?? "medium")[isRtl ? "ar" : "fr"]}
              </p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-2.5">
                  <Cpu size={15} className="mx-auto mb-1 text-cyan-500" />
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("deviceCores")}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{facts?.cores ?? "—"}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-2.5">
                  <MemoryStick size={15} className="mx-auto mb-1 text-violet-500" />
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("deviceMemory")}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {facts?.memory ? `${facts.memory} GB` : `4 GB ${tr("memoryNullHint")}`}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-2.5">
                  <Wifi size={15} className="mx-auto mb-1 text-emerald-500" />
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("deviceNetwork")}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{facts?.network || "—"}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-2.5">
                  <Smartphone size={15} className="mx-auto mb-1 text-amber-500" />
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("deviceScreen")}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{facts?.dpr ? `${facts.dpr}x` : "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* موثوقية التحليل */}
          {confidence != null && confidenceInfo && (
            <div
              className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border mb-3 ${
                confidenceInfo.level === "high"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60"
                  : confidenceInfo.level === "medium"
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60"
                    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/60"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Activity size={17} className={`shrink-0 mt-0.5 ${
                  confidenceInfo.level === "high" ? "text-emerald-500" : confidenceInfo.level === "medium" ? "text-amber-500" : "text-red-500"
                }`} />
                <div className="min-w-0">
                  <p className="font-black text-xs text-slate-800 dark:text-slate-100">
                    {tr("confidence")}: {confidence}%
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {confidenceInfo[isRtl ? "ar" : "fr"]}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white shrink-0">{confidence}%</span>
            </div>
          )}

          {/* تفصيل العوامل المرجّحة */}
          {factors.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                {tr("factorsTitle")}
              </p>
              <div className="flex flex-col gap-2">
                {factors.map((f) => {
                  const fColor = f.score < 45 ? "from-red-500 to-rose-500" : f.score <= 70 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500";
                  return (
                    <div key={f.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 truncate">
                            {f.label[isRtl ? "ar" : "fr"]}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                              f.measured
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {f.measured ? tr("measured") : tr("estimated")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">{Math.round(f.weight * 100)}%</span>
                          <span className="text-[12px] font-black text-slate-900 dark:text-white w-7 text-end">{f.score}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${fColor} transition-all duration-700`}
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 truncate" dir="auto">
                        {f.detail[isRtl ? "ar" : "fr"]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Batterie + économies */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {battery?.charging ? (
                  <BatteryCharging size={18} className="text-emerald-500" />
                ) : (
                  <Battery size={18} className="text-slate-500 dark:text-slate-400" />
                )}
                <span className="font-black text-sm text-slate-800 dark:text-slate-100">
                  {battery
                    ? `${Math.round(battery.level * 100)}% · ${battery.charging ? tr("batteryCharging") : tr("batteryOn")}`
                    : "—"}
                </span>
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                +{batterySavings.pct}% {tr("batterySaving")}
              </span>
            </div>
            {battery && (
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                  style={{ width: `${Math.round(battery.level * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Suggestion quand le mode performance aiderait */}
          {suggestPerformance && (
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl mb-3 border border-amber-300/70 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-start gap-2.5">
                <Zap size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 leading-relaxed">{tr("recommendationHint")}</p>
              </div>
              <button
                onClick={applyRecommendation}
                className="shrink-0 text-[11px] font-black px-3 py-2 rounded-xl bg-amber-500 text-white shadow-sm hover:brightness-110 active:scale-[0.97] transition-all"
              >
                {tr("applyRecommendation")}
              </button>
            </div>
          )}

          {/* Recommandations applicatives */}
          <div className="mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              {tr("recommendationsTitle")}
            </p>
            <ul className="grid grid-cols-1 gap-1.5">
              {recommendations.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-center gap-2.5 text-[12px] font-bold rounded-xl px-3 py-2 border ${
                    r.suggested
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-800/60 text-blue-700 dark:text-blue-300"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Check size={13} className={`shrink-0 ${r.suggested ? "text-blue-500" : "text-slate-400"}`} />
                  {r[isRtl ? "ar" : "fr"]}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <Clock size={12} />
            {tr("lastDetected")}: {fmtAgo(deviceDetectedAt)}
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mt-4">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className={`${autoOptimize ? "text-blue-500" : "text-slate-400"} shrink-0 mt-0.5`} />
              <div>
                <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("autoOptimize")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("autoOptimizeDesc")}</p>
              </div>
            </div>
            <Toggle checked={autoOptimize} onChange={setAutoOptimize} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button
              onClick={reDetect}
              disabled={analyzing}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {analyzing ? tr("analyzing") : tr("detectAgain")}
            </button>
            <button
              onClick={applyRecommendation}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Zap size={15} />
              {tr("applyRecommendation")}
            </button>
          </div>
        </SectionCard>

        {/* Performance */}
        <SectionCard
          icon={Gauge}
          title={tr("settingsPerformance")}
          desc={tr("settingsPerformanceDesc")}
          iconClass="bg-gradient-to-tr from-emerald-500 to-teal-600"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Zap size={20} className={`${performanceMode ? "text-emerald-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("performanceMode")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("performanceModeDesc")}</p>
                </div>
              </div>
              <Toggle checked={performanceMode} onChange={setPerformanceMode} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Sparkles size={20} className={`${animationsEnabled ? "text-purple-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("animationsEnabled")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("animationsEnabledDesc")}</p>
                </div>
              </div>
              <Toggle checked={animationsEnabled} onChange={setAnimationsEnabled} />
            </div>
          </div>
        </SectionCard>

        {/* Display & comfort */}
        <SectionCard
          icon={Droplets}
          title={tr("displayTitle")}
          desc={tr("displayDesc")}
          iconClass="bg-gradient-to-tr from-sky-500 to-cyan-600"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Sparkles size={20} className={`${backgroundEffects ? "text-sky-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("backgroundEffects")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("backgroundEffectsDesc")}</p>
                </div>
              </div>
              <Toggle checked={backgroundEffects} onChange={setBackgroundEffects} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Droplets size={20} className={`${reduceBlur ? "text-cyan-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("reduceBlur")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("reduceBlurDesc")}</p>
                </div>
              </div>
              <Toggle checked={reduceBlur} onChange={setReduceBlur} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Eye size={20} className={`${keepAwake ? "text-cyan-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("keepAwake")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("keepAwakeDesc")}</p>
                </div>
              </div>
              <Toggle checked={keepAwake} onChange={setKeepAwake} />
            </div>
          </div>
        </SectionCard>

        {/* Sensations */}
        <SectionCard
          icon={Bell}
          title={isRtl ? "الأحاسيس" : "Sensations"}
          desc={isRtl ? "الإشعارات والاهتزازات" : "Notifications et vibrations"}
          iconClass="bg-gradient-to-tr from-rose-500 to-pink-600"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Bell size={20} className={`${notificationsEnabled ? "text-rose-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("pushNotifications")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("pushNotificationsDesc")}</p>
                </div>
              </div>
              <Toggle checked={notificationsEnabled} onChange={handleNotificationToggle} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Vibrate size={20} className={`${hapticFeedback ? "text-pink-500" : "text-slate-400"} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">{tr("hapticFeedback")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr("hapticFeedbackDesc")}</p>
                </div>
              </div>
              <Toggle checked={hapticFeedback} onChange={setHapticFeedback} />
            </div>
          </div>
        </SectionCard>

        {/* Font size */}
        <SectionCard
          icon={TypeIcon}
          title={tr("settingsFontSize")}
          desc={tr("settingsFontSizeDesc")}
          iconClass="bg-gradient-to-tr from-purple-500 to-fuchsia-600"
        >
          <div className="grid grid-cols-4 gap-2.5">
            {fontSizes.map(({ value, label, px }) => {
              const active = fontSize === value;
              return (
                <button
                  key={value}
                  onClick={() => setFontSize(value)}
                  className={`relative flex flex-col items-center gap-1.5 py-3.5 min-h-[76px] rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    active
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg shadow-purple-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="font-black text-slate-800 dark:text-white" style={{ fontSize: px }}>أ</span>
                  <span className={`text-[10px] font-black ${active ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {label}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center"
                    >
                      <Check size={11} strokeWidth={3} />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Updates */}
        <SectionCard
          icon={Rocket}
          title={tr("updateTitle")}
          desc={tr("updateDesc")}
          iconClass="bg-gradient-to-tr from-indigo-500 to-purple-600"
        >
          <div className="flex items-center justify-between gap-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("currentVersion")}</p>
                <p className="font-black text-slate-900 dark:text-white text-sm">{APP_VERSION}</p>
              </div>
            </div>
            <button
              onClick={handleCheckUpdates}
              disabled={checkingUpdate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {checkingUpdate ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {checkingUpdate ? tr("checkingForUpdates") : tr("checkForUpdates")}
            </button>
          </div>

          {changelogEntry && (
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2">
                {tr("newFeatures")}
              </p>
              <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {(changelogEntry.features[isRtl ? "ar" : "fr"] as string[]).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-300">
                    <Check size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {updating && (
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Loader2 size={14} className="animate-spin" />
              {isRtl ? "جارٍ التحديث وإعادة التحميل…" : "Mise à jour et rechargement…"}
            </div>
          )}
        </SectionCard>

        {/* Installation */}
        <SectionCard
          icon={Smartphone}
          title={tr("installTitle")}
          desc={tr("installDesc")}
          iconClass="bg-gradient-to-tr from-blue-500 to-cyan-500"
        >
          <div className="flex items-center justify-between gap-4 mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                  appInstalled
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                }`}
              >
                {appInstalled ? <CheckCircle2 size={18} /> : <Download size={18} />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("installStatusLabel")}</p>
                <p
                  className={`font-black text-sm ${
                    appInstalled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {appInstalled ? tr("installStatusInstalled") : tr("installStatusNotInstalled")}
                </p>
              </div>
            </div>
            {appInstalled && <Check size={16} className="text-emerald-500 shrink-0" />}
          </div>

          {appInstalled ? (
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 text-center">
              {tr("installLaunchHint")}
            </p>
          ) : (
            <button
              onClick={handleInstallApp}
              disabled={installingApp}
              className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {installingApp ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Download size={17} />
              )}
              {installingApp ? tr("installingApp") : tr("installButton")}
            </button>
          )}
        </SectionCard>

        {/* Application native (Android / iOS) */}
        {isNative() && (
          <SectionCard
            icon={Fingerprint}
            title={tr("nativeAppTitle")}
            desc={tr("nativeAppDesc")}
            iconClass="bg-gradient-to-tr from-slate-800 to-indigo-800"
          >
            <div className="flex items-center justify-between gap-3 mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{tr("nativePlatformLabel")}</p>
                  <p className="font-black text-sm text-slate-900 dark:text-white uppercase">
                    {getNativePlatform() === "ios" ? "iOS" : "Android"}
                  </p>
                </div>
              </div>
              {nativeInfo?.version && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  v{nativeInfo.version}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {biometricAvailable && (
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Fingerprint size={18} className="text-accent shrink-0" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white">{tr("biometricLockTitle")}</p>
                      <p className="text-[10px] font-bold text-slate-400">{tr("biometricLockDesc")}</p>
                    </div>
                  </div>
                  <Toggle checked={biometricLock} onChange={handleToggleBiometricLock} />
                </div>
              )}

              <button
                onClick={handleShareNativeApp}
                disabled={sharingApp}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-accent text-white font-black text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {sharingApp ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                {tr("nativeShareApp")}
              </button>
            </div>
          </SectionCard>
        )}

        {/* قفل التطبيق والأمان */}
        <SectionCard
          icon={ShieldCheck}
          title={tr("lockSecurityTitle")}
          desc={tr("lockSecurityDesc")}
          iconClass="bg-gradient-to-tr from-violet-600 to-indigo-700"
        >
          {/* الحالة + القفل الفوري */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                !lock.pinSet
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  : lock.isLocked
                    ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              }`}>
                <Lock size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">{tr("lockStatusTitle")}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {!lock.pinSet
                    ? tr("lockInactive")
                    : lock.isLocked
                      ? tr("locked")
                      : tr("unlocked")}
                </p>
              </div>
            </div>
            {lock.pinSet && !lock.isLocked && (
              <button
                onClick={() => lock.lock()}
                className="text-[11px] font-black px-4 py-2 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:brightness-95 active:scale-95 transition-all"
              >
                {tr("lockNow")}
              </button>
            )}
          </div>

          {/* رمز PIN */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-3">
              <KeyRound size={18} className="text-violet-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">{tr("lockPinTitle")}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {lock.pinSet ? tr("lockPinEnabled") : tr("lockPinDisabled")}
                </p>
              </div>
            </div>
            {lock.pinSet ? (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setVerifyAction("change");
                    setVerifyOpen(true);
                  }}
                  className="text-[11px] font-black px-3.5 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:brightness-95 active:scale-95 transition-all"
                >
                  {tr("lockPinChange")}
                </button>
                <button
                  onClick={() => {
                    setVerifyAction("disable");
                    setVerifyOpen(true);
                  }}
                  className="text-[11px] font-black px-3.5 py-2 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:brightness-95 active:scale-95 transition-all"
                >
                  {tr("lockPinDisable")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPinSetupOpen(true)}
                className="text-[11px] font-black px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0"
              >
                {tr("lockPinEnable")}
              </button>
            )}
          </div>

          {/* وضع القفل */}
          {lock.pinSet && (
            <>
              <div className="flex items-center gap-2 px-1 mb-2">
                <Timer size={14} className="text-slate-400" />
                <p className="text-xs font-black text-slate-700 dark:text-slate-300">{tr("lockModeTitle")}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {([
                  { value: "off" as LockMode, label: tr("lockModeOff") },
                  { value: "launch" as LockMode, label: tr("lockModeLaunch") },
                  { value: "background" as LockMode, label: tr("lockModeBackground") },
                  { value: "timeout" as LockMode, label: tr("lockModeTimeout") },
                ]).map((m) => (
                  <button
                    key={m.value}
                    onClick={() => lock.setMode(m.value)}
                    className={`px-1 py-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${
                      lock.mode === m.value
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {lock.mode === "timeout" && (
                <>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <Clock size={14} className="text-slate-400" />
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">{tr("lockTimeoutTitle")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[0.5, 1, 2, 5, 10].map((min) => {
                      const label =
                        min === 0.5
                          ? tr("lockTimeout30")
                          : `${min} ${isRtl ? "دقيقة" : "min"}`;
                      return (
                        <button
                          key={min}
                          onClick={() => lock.setTimeoutMinutes(min)}
                          className={`px-3.5 py-2 rounded-xl text-[11px] font-black border transition-all active:scale-95 ${
                            lock.timeoutMinutes === min
                              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-md"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* البصمة/الوجه */}
          {isNative() && biometricAvailable && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-3">
                <Fingerprint size={18} className="text-violet-500 shrink-0" />
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">{tr("biometricLockTitle")}</p>
                  <p className="text-[10px] font-bold text-slate-400">{tr("biometricLockDesc")}</p>
                </div>
              </div>
              <Toggle
                checked={lock.biometricEnabled}
                onChange={lock.setBiometric}
                disabled={!lock.pinSet}
              />
            </div>
          )}

          {/* منع التصوير والخصوصية */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <EyeOff size={18} className="text-violet-500 shrink-0" />
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">{tr("lockPrivacyTitle")}</p>
                <p className="text-[10px] font-bold text-slate-400">{tr("lockPrivacyDesc")}</p>
              </div>
            </div>
            <Toggle checked={lock.privacyEnabled} onChange={lock.setPrivacy} disabled={!lock.pinSet} />
          </div>
        </SectionCard>

        <PinSetupSheet
          open={pinSetupOpen}
          onClose={() => setPinSetupOpen(false)}
          onDone={() => toast.success(tr("lockPinDone"))}
          isRtl={isRtl}
        />
        <VerifyPinSheet
          open={verifyOpen}
          onClose={() => setVerifyOpen(false)}
          isRtl={isRtl}
          onSuccess={() => {
            if (verifyAction === "change") {
              setPinSetupOpen(true);
            } else if (verifyAction === "disable") {
              lock.removePin();
              toast.success(tr("lockPinRemoved"));
            }
            setVerifyAction(null);
          }}
        />

        {/* Storage & data */}
        <SectionCard
          icon={HardDrive}
          title={tr("storageTitle")}
          desc={tr("storageDesc")}
          iconClass="bg-gradient-to-tr from-slate-600 to-slate-800"
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <HardDrive size={18} className="text-slate-500 shrink-0" />
                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{tr("storageUsed")}</span>
              </div>
              <span className="font-black text-sm text-slate-900 dark:text-white">{fmtBytes(storage.local + storage.cache)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">{tr("cachedData")}</p>
                <p className="font-black text-sm text-slate-900 dark:text-white">{fmtBytes(storage.cache)}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">{tr("localData")}</p>
                <p className="font-black text-sm text-slate-900 dark:text-white">{fmtBytes(storage.local)}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 font-black text-sm hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {clearing ? tr("clearingData") : tr("clearCache")}
          </button>
        </SectionCard>

        {/* Reset */}
        <Reveal direction="up" className="w-full">
          <button
            onClick={() => {
              resetSettings();
              setTheme("system");
              toast.success(tr("settingsResetDone"));
            }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-3xl border-2 border-dashed border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 font-black text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:scale-[0.98]"
          >
            <RotateCcw size={18} />
            {tr("settingsReset")}
          </button>
        </Reveal>
      </div>
    </div>
  );
}
