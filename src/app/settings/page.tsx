"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Languages, Palette, Gauge, Type as TypeIcon, RotateCcw, Check, Sun, Moon,
  Monitor, Smartphone, Sparkles, ChevronRight, ArrowLeft, Zap
} from "lucide-react";
import { useAppStore, type ThemeMode, type FontSizeMode } from "@/lib/store";
import { useTheme } from "next-themes";
import { TRANSLATIONS, normalizeLanguage } from "@/lib/translations";
import Reveal from "@/components/Reveal";

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

export default function SettingsPage() {
  const {
    language, setLanguage,
    theme, setTheme,
    performanceMode, setPerformanceMode,
    animationsEnabled, setAnimationsEnabled,
    fontSize, setFontSize,
    resetSettings,
  } = useAppStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [wasAutoDetected, setWasAutoDetected] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (performanceMode && !animationsEnabled) {
      setWasAutoDetected(true);
    } else {
      setWasAutoDetected(false);
    }
  }, [performanceMode, animationsEnabled, mounted]);

  if (!mounted) return null;

  const isRtl = language === "ar";
  const t = TRANSLATIONS[normalizeLanguage(language)] as Record<string, string>;
  const tr = (key: string, fallback?: string) => (t as any)[key] ?? fallback ?? key;

  const themes: { value: ThemeMode; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { value: "light", label: tr("themeLight"), icon: Sun },
    { value: "dark", label: tr("themeDark"), icon: Moon },
    { value: "system", label: tr("themeSystem"), icon: Monitor },
  ];

  const fontSizes: { value: FontSizeMode; label: string; px: string }[] = [
    { value: "sm", label: tr("fontSizeSmall"), px: "90%" },
    { value: "md", label: tr("fontSizeMedium"), px: "100%" },
    { value: "lg", label: tr("fontSizeLarge"), px: "112%" },
    { value: "xl", label: tr("fontSizeXl"), px: "125%" },
  ];

  const activeTheme = theme;
  const isDarkNow = resolvedTheme === "dark";

  return (
    <div className="min-h-dvh pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 mb-6 shadow-xl">
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
              { code: "ar" as const, label: tr("langAr"), flag: "🇩🇿", dir: "rtl" },
              { code: "fr" as const, label: tr("langFr"), flag: "🇫🇷", dir: "ltr" },
            ].map((lang) => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`relative flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
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
              const active = activeTheme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`relative flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 transition-all ${
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

        {/* Performance */}
        <SectionCard
          icon={Gauge}
          title={tr("settingsPerformance")}
          desc={tr("settingsPerformanceDesc")}
          iconClass="bg-gradient-to-tr from-emerald-500 to-teal-600"
        >
          {wasAutoDetected && (
            <div className="mb-4 flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <Smartphone size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">{tr("settingsDetected")}</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">{tr("settingsDetectedDesc")}</p>
              </div>
            </div>
          )}
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
                  className={`relative flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all ${
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

        {/* Reset */}
        <Reveal direction="up" className="w-full">
          <button
            onClick={() => {
              resetSettings();
              setTheme("system");
              toast.success(tr("settingsResetDone"));
            }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-3xl border-2 border-dashed border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 font-black text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <RotateCcw size={18} />
            {tr("settingsReset")}
          </button>
        </Reveal>
      </div>
    </div>
  );
}
