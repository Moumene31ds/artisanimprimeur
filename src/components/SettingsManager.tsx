// src/components/SettingsManager.tsx
"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { detectDevice } from "@/lib/device";
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
  const setSettingsConfigured = useAppStore((s) => s.setSettingsConfigured);
  const setPerformanceMode = useAppStore((s) => s.setPerformanceMode);
  const setAnimationsEnabled = useAppStore((s) => s.setAnimationsEnabled);
  const setDeviceInfo = useAppStore((s) => s.setDeviceInfo);

  const { setTheme } = useTheme();

  // الكشف الذكي عن الجهاز عند أول تشغيل
  useEffect(() => {
    if (typeof window === "undefined" || settingsConfigured) return;
    (async () => {
      const signals = await detectDevice();
      setDeviceInfo(signals.score, signals.tier);
      setSettingsConfigured(true);

      // احترام إعداد النظام "تقليل الحركة"
      if (signals.reducedMotion) {
        setAnimationsEnabled(false);
      }
      // وضع الأداء للجهاز الضعيف — فقط إذا كان التحسين الذكي مفعّلاً
      if (signals.tier === "weak" && autoOptimize) {
        setPerformanceMode(true);
        setAnimationsEnabled(false);
      }
    })();
  }, [
    settingsConfigured,
    autoOptimize,
    setDeviceInfo,
    setSettingsConfigured,
    setAnimationsEnabled,
    setPerformanceMode,
  ]);

  // مزامنة الاهتزازات
  useEffect(() => {
    setHapticsEnabled(hapticFeedback);
  }, [hapticFeedback]);

  // تطبيق اللغة على مستوى المستند
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
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

  return null;
}
