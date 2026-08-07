// src/components/SettingsManager.tsx
"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";

/**
 * يطبّق إعدادات التطبيق عالمياً على مستوى <html>:
 * - لغة المستند (lang) + اتجاه RTL/LTR
 * - السمة (فاتح/داكن/تلقائي) عبر next-themes
 * - وضع الأداء للهواتف الضعيفة (data-perf)
 * - تفعيل/تعطيل الحركات (data-animations)
 * - حجم الخط (data-font-size)
 * ويقوم بالكشف التلقائي عن الأجهزة الضعيفة عند أول تشغيل.
 */
export default function SettingsManager() {
  const theme = useAppStore((s) => s.theme);
  const language = useAppStore((s) => s.language);
  const performanceMode = useAppStore((s) => s.performanceMode);
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const fontSize = useAppStore((s) => s.fontSize);
  const settingsConfigured = useAppStore((s) => s.settingsConfigured);
  const setSettingsConfigured = useAppStore((s) => s.setSettingsConfigured);
  const setPerformanceMode = useAppStore((s) => s.setPerformanceMode);
  const setAnimationsEnabled = useAppStore((s) => s.setAnimationsEnabled);

  const { setTheme } = useTheme();

  // الكشف التلقائي عن الأجهزة الضعيفة عند أول تشغيل
  useEffect(() => {
    if (typeof window === "undefined" || settingsConfigured) return;
    try {
      const nav = navigator as Navigator & {
        deviceMemory?: number;
        hardwareConcurrency?: number;
      };
      const weakCore = (nav.hardwareConcurrency ?? 8) <= 4;
      const weakMemory = (nav.deviceMemory ?? 8) <= 4;
      if (weakCore || weakMemory) {
        setPerformanceMode(true);
        setAnimationsEnabled(false);
      }
    } catch {
      // تجاهل أي خطأ في الكشف
    }
    setSettingsConfigured(true);
  }, [settingsConfigured, setPerformanceMode, setAnimationsEnabled, setSettingsConfigured]);

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
