"use client";
// src/components/CartReminder.tsx
// تذكير ذكي مجاني بالسلة المتروكة: إشعار نظامي بعد 30 دقيقة من ترك التبويب
// بمنتجات في السلة — مرة واحدة كل 24 ساعة، مع احترام مركز الإشعارات
// (المفتاح الرئيسي + ساعات السكون) وتصعيد تدريجي للنص.
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { isQuietNow } from "@/lib/notification-engine";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // فحص كل 5 دقائق
const ABANDON_THRESHOLD_MS = 30 * 60 * 1000; // سلة "متروكة" بعد 30 دقيقة إخفاء
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // مرة واحدة يومياً كحد أقصى

const LAST_KEY = "artisan_cart_reminder_last";
const HIDE_KEY = "artisan_cart_hidden_since";
const STREAK_KEY = "artisan_cart_reminder_streak"; // عدد التذكيرات السابقة للسلة نفسها

export default function CartReminder() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    let timer: number | undefined;

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        try {
          sessionStorage.setItem(HIDE_KEY, String(Date.now()));
        } catch {}
      }
    };

    const maybeNotify = () => {
      try {
        if (document.visibilityState !== "hidden") return;

        const state = useAppStore.getState();
        if (!state.notificationsEnabled) return;
        // ساعات السكون: لا إشعارات نظامية مزعجة ليلاً.
        if (isQuietNow(state.notificationPrefs)) return;

        const cart = state.cart;
        if (!cart?.length) return;

        const now = Date.now();
        const last = Number(localStorage.getItem(LAST_KEY) || 0);
        if (now - last < COOLDOWN_MS) return;

        const hiddenSince = Number(sessionStorage.getItem(HIDE_KEY) || 0);
        if (!hiddenSince || now - hiddenSince < ABANDON_THRESHOLD_MS) return;

        const count = cart.reduce((n, i: any) => n + (Number(i.quantity) || 1), 0);
        const total = cart.reduce(
          (sum, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
          0
        );

        // تصعيد لطيف: الرسالة تتغير حسب عدد مرات التذكير السابقة.
        const streak = Number(localStorage.getItem(STREAK_KEY) || 0);
        const bodies = [
          `لديك ${count} منتج في سلتك بقيمة ${total.toLocaleString()} دج — أكمل طلبك الآن.`,
          `تصميماتك ما زالت محفوظة في السلة (${total.toLocaleString()} دج) — الكميات المخصصة سريعة النفاد!`,
          `آخر تذكير 🕊️ سلتك جاهزة للإتمام — الدفع يستغرق أقل من دقيقة.`,
        ];
        const body = bodies[Math.min(streak, bodies.length - 1)];

        new Notification(streak >= 2 ? "🕊️ سلتك ما زالت تنتظرك" : "🛒 سلتك تنتظرك!", {
          body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon.svg",
          tag: "cart-reminder", // يستبدل بدل التراكم
          data: { url: "/cart" },
        });
        localStorage.setItem(LAST_KEY, String(now));
        localStorage.setItem(STREAK_KEY, String(Math.min(streak + 1, 2)));
      } catch {
        // تجاهل أي فشل بيئي
      }
    };

    document.addEventListener("visibilitychange", onHide);
    timer = window.setInterval(maybeNotify, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return null;
}
