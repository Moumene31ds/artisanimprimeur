"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useKeyboard } from "@/hooks/useKeyboard";

/**
 * MobileUXEnhancer — تحسينات صامتة لتجربة الهاتف ووضع PWA المثبّت:
 *
 * 1) مزامنة لون شريط المتصفح (theme-color) مع سمّة التطبيق الفعلية:
 *    الإعداد الافتراضي في layout يتبع تفضيل النظام فقط (media query)،
 *    لكن عندما يبدّل المستخدم السمة يدوياً من داخل التطبيق يبقى شريط
 *    المتصفح بلون قديم. هنا نزامن الوسم مع resolvedTheme (يشمل النظام
 *    والاختيار اليدوي) ونزيل شرط media ليطابق دائماً السمة المعروضة.
 *
 * 2) حالة لوحة المفاتيح: عبر useKeyboard — تضبط data-keyboard و--kb-offset
 *    على <html> (يستهلكهما CSS لإخفاء العناصر العائمة أسفل الشاشة).
 *
 * 3) جودة الشبكة: عند saveData أو 2g نضبط data-net="slow" على <html>
 *    فيتحول التطبيق تلقائياً للوضع الاقتصادي (بلا تأثيرات ثقيلة) حتى
 *    لو لم يفعّل المستخدم وضع الأداء يدوياً.
 */
export default function MobileUXEnhancer() {
  const { resolvedTheme } = useTheme();
  useKeyboard();

  // 1) theme-color يتبع السمة الفعلية (فاتح/داكن) وليس تفضيل النظام فقط.
  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === "dark" ? "#020617" : "#f8fafc";
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    metas.forEach((meta) => {
      meta.setAttribute("content", color);
      // إزالة media كي لا يتجاوزها المتصفح بتفضيل النظام.
      meta.removeAttribute("media");
    });
  }, [resolvedTheme]);

  // 3) مراقبة جودة الشبكة → وضع اقتصادي تلقائي.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const conn = (navigator as any).connection;

    const apply = () => {
      const eff = conn?.effectiveType || "";
      const slow = !!conn?.saveData || eff === "slow-2g" || eff === "2g";
      document.documentElement.dataset.net = slow ? "slow" : "fast";
    };

    apply();
    conn?.addEventListener?.("change", apply);
    return () => conn?.removeEventListener?.("change", apply);
  }, []);

  return null;
}
