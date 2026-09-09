// src/components/SettingsManager.tsx
"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { detectDevice, watchDeviceChanges } from "@/lib/device";
import { setHapticsEnabled } from "@/lib/utils";

/**
 * يطبّق إعدادات التطبيق عالمياً على مستوى <html>:
 * - لغة المستند (lang)
 * - السمة (فاتح/داكن/تلقائي) عبر next-themes
 * - وضع الأداء للهواتف الضعيفة (data-perf)
 * - تفعيل/تعطيل الحركات (data-animations)
 * - حجم الخط (data-font-size)
 * - الاهتزازات
 *
 * الكشف الذكي عن الجهاز (أول تشغيل أو عند إعادة الفحص):
 * يجمع إشارات متعددة (CPU، RAM، الشبكة، الشاشة، توفير البيانات) ويحسب
 * نقاط أداء (0-100). عند التصنيف "ضعيف" والتحسين التلقائي مفعّل، يفعّل
 * وضع الأداء ويعطّل الحركات. كما يحترم إعداد "تقليل الحركة" في النظام
 * و "توفير البيانات" في المتصفح.
 */
export default function SettingsManager() {
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const performanceMode = useAppStore((s) => s.performanceMode);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const fontSize = useAppStore((s) => s.fontSize);
  const settingsConfigured = useAppStore((s) => s.settingsConfigured);
  const autoOptimize = useAppStore((s) => s.autoOptimize);
  const hapticFeedback = useAppStore((s) => s.hapticFeedback);
  const backgroundEffects = useAppStore((s) => s.backgroundEffects);
  const reduceBlur = useAppStore((s) => s.reduceBlur);
  const keepAwake = useAppStore((s) => s.keepAwake);
  const setSettingsConfigured = useAppStore((s) => s.setSettingsConfigured);
  const setPerformanceMode = useAppStore((s) => s.setPerformanceMode);
  const setAnimationsEnabled = useAppStore((s) => s.setAnimationsEnabled);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);
  const setBackgroundEffects = useAppStore((s) => s.setBackgroundEffects);

  const { setTheme } = useTheme();

  // الكشف الذكي عن الجهاز عند أول تشغيل
  useEffect(() => {
    if (typeof window === "undefined" || settingsConfigured) return;
    (async () => {
      const signals = await detectDevice({ full: true });
      setDeviceInfo(signals.score, signals.tier, signals);

      // احترام إعداد النظام "تقليل الحركة"
      if (signals.reducedMotion) {
        setAnimationsEnabled(false);
      }
      // وضع الأداء للجهاز الضعيف — فقط إذا كان التحسين الذكي مفعّلاً
      if (signals.tier === "weak" && autoOptimize) {
        setPerformanceMode(true);
        setAnimationsEnabled(false);
      }
      setSettingsConfigured(true);
    })();
  }, [
    settingsConfigured,
    autoOptimize,
    setDeviceInfo,
    setSettingsConfigured,
    setAnimationsEnabled,
    setPerformanceMode,
  ]);

  // إعادة الفحص التلقائي: عند تغيّر الشبكة/الإنترنت/العودة للتبويب + كل 5 دقائق
  // يحدّث النقاط والتصنيف، ويفعّل وضع الأداء إذا تدهور الجهاز إلى "ضعيف".
  useEffect(() => {
    if (typeof window === "undefined" || !settingsConfigured) return;
    let disposed = false;
    const run = async () => {
      const signals = await detectDevice({ prev: useAppStore.getState().deviceDetail });
      if (disposed) return;
      const prevTier = useAppStore.getState().deviceTier;
      setDeviceInfo(signals.score, signals.tier, signals);
      // تدهور واضح → نفعّل وضع الأداء تلقائياً دون لمس إعدادات المستخدم عند التحسن
      if (autoOptimize && signals.tier === "weak" && prevTier !== "weak") {
        setPerformanceMode(true);
        setAnimationsEnabled(false);
        setBackgroundEffects(false);
      }
    };
    return watchDeviceChanges(() => {
      run();
    });
  }, [
    settingsConfigured,
    autoOptimize,
    setDeviceInfo,
    setPerformanceMode,
    setAnimationsEnabled,
    setBackgroundEffects,
  ]);

  // مزامنة الاهتزازات
  useEffect(() => {
    setHapticsEnabled(hapticFeedback);
  }, [hapticFeedback]);

  // تطبيق اللغة واتجاه الكتابة على مستوى المستند (دعم RTL كامل).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  // تطبيق السمة
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // تطبيق وضع الأداء والحركات وحجم الخط
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-perf", performanceMode ? "true" : "false");
    root.setAttribute("data-animations", animationsEnabled ? "on" : "off");
    root.setAttribute("data-font-size", fontSize);
  }, [performanceMode, animationsEnabled, fontSize]);

  // التأثيرات الزخرفية (فقاعات + ضجيج) وتقليل التمويه
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-effects", backgroundEffects ? "on" : "off");
    root.setAttribute("data-blur", reduceBlur ? "off" : "on");
  }, [backgroundEffects, reduceBlur]);

  // إبقاء الشاشة مضاءة (Wake Lock)
  useEffect(() => {
    if (!keepAwake || typeof window === "undefined") return;
    let sentinel: any = null;
    let cancelled = false;
    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (!wl) return;
        sentinel = await wl.request("screen");
      } catch {
        /* غير مدعوم أو رفض */
      }
    };
    request();
    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release?.().catch(() => {});
    };
  }, [keepAwake]);

  return null;
}
