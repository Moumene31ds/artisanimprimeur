"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { calculateTierPrice } from "@/lib/pricing";

// -----------------------------------------------
// StickyCartBar — شريط سلة ثابت أسفل الشاشة
// -----------------------------------------------
// يظهر على جميع الصفحات (باستثناء صفحات السلة والدفع) عندما تحتوي السلة
// على منتجات، مع ملخص فوري (عدد القطع + المجموع) وزر انتقال سريع للطلب.
// يعلو شريط التنقل السفلي على الموبايل مع احترام منطقة الأمان (safe-area).

const HIDDEN_PATHS = ["/cart", "/success", "/payment-verify", "/offline"];

export default function StickyCartBar() {
  const cart = useAppStore((state) => state.cart);
  const language = useAppStore((state) => state.language);
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isRtl = language === "ar";
  const hidden = HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    setMounted(true);
  }, []);

  // إظهار الشريط فقط بعد تمرير طفيف حتى لا يزاحم المحتوى الأول للصفحة.
  useEffect(() => {
    if (!mounted || hidden) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const diff = window.scrollY - lastY;
      if (window.scrollY < 80) {
        setIsVisible(false);
      } else if (diff > 4) {
        setIsVisible(true);
      } else if (diff < -8 && window.scrollY > 160) {
        setIsVisible(false);
      }
      lastY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted, hidden]);

  if (!mounted) return null;
  if (hidden || cart.length === 0) return null;

  const totalCount = cart.reduce((n, i) => n + (i.quantity || 1), 0);
  const totalAmount = cart.reduce((sum, i) => {
    const info = calculateTierPrice(Number(i.price) || 0, i.quantity || 1);
    return sum + info.totalItemPrice;
  }, 0);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="fixed left-3 right-3 z-40 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:max-w-md"
        >
          <button
            onClick={() => router.push("/cart")}
            className="w-full flex items-center justify-between gap-4 premium-glass rounded-[1.75rem] px-5 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-white/60 dark:border-white/10 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-accent dark:to-indigo-600 text-white flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900">
                  {totalCount}
                </span>
              </div>
              <div className="text-start min-w-0">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                  {isRtl ? "السلة جاهزة للطلب" : "Panier prêt"}
                </p>
                <p className="font-black text-slate-900 dark:text-white text-lg leading-tight truncate">
                  {totalAmount.toLocaleString()} <span className="text-xs text-slate-400">{language === "ar" ? "د.ج" : "DA"}</span>
                </p>
              </div>
            </div>

            <span className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-accent text-white text-xs font-black shadow-lg active:scale-95 transition-transform">
              {isRtl ? "أكمل الطلب" : "Commander"}
              <ArrowRight size={16} className={isRtl ? "rotate-180" : ""} />
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
