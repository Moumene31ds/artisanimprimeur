"use client";
// src/components/CartReminder.tsx
// تذكير مجاني بالسلة المتروكة: إشعار محلي بعد 30 دقيقة من ترك التبويب
// بمنتجات في السلة — مرة واحدة كل 24 ساعة كحد أقصى.
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // فحص كل 5 دقائق
const ABANDON_THRESHOLD_MS = 30 * 60 * 1000; // سلة "متروكة" بعد 30 دقيقة إخفاء
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // مرة واحدة يومياً كحد أقصى

const LAST_KEY = "artisan_cart_reminder_last";
const HIDE_KEY = "artisan_cart_hidden_since";

export default function CartReminder() {
  useEffect(() => {
    // لا فائدة بدون إذن الإشعارات (يُطلب فقط من تدفقات Push الموجودة أصلاً)
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
        const cart = useAppStore.getState().cart;
        if (!cart?.length) return;

        const now = Date.now();
        const last = Number(localStorage.getItem(LAST_KEY) || 0);
        if (now - last < COOLDOWN_MS) return;

        const hiddenSince = Number(sessionStorage.getItem(HIDE_KEY) || 0);
        if (!hiddenSince || now - hiddenSince < ABANDON_THRESHOLD_MS) return;

        const count = cart.reduce((n, i: any) => n + (Number(i.quantity) || 1), 0);
        new Notification("🛒 سلتك تنتظرك!", {
          body: `لديك ${count} منتج في سلتك — أكمل طلبك الآن قبل نفاد الكمية.`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "cart-reminder", // يستبدل بدل التراكم
          data: { url: "/cart" },
        });
        localStorage.setItem(LAST_KEY, String(now));
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
