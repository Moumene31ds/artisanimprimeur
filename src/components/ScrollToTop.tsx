"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { triggerHapticFeedback } from "@/lib/utils";

const SHOW_AFTER = 420; // يظهر بعد تمرير هذا العدد من البكسلات
const TICK = 0.55; // معامل تخفيف التمرير السلس

/**
 * ScrollToTop — زر عائم للعودة إلى أعلى الصفحة (الهواتف فقط).
 *
 * - يظهر بعد تمرير مريح ويختفي عند القمة (بلا إزعاج).
 * - مثبّت فوق شريط التنقل السفلي مباشرة في جهة النهاية المنطقية
 *   (يتوافق تلقائياً مع RTL/LTR عبر end-4) بعيداً عن أزرار الدعم.
 * - يستخدم kb-hide ليختفي عندما تفتح لوحة المفاتيح.
 * - يحترم prefers-reduced-motion: انتقال فوري بلا حركة.
 */
export default function ScrollToTop() {
  const { language } = useAppStore();
  const isRtl = language === "ar";
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => {
    try {
      triggerHapticFeedback("light");
    } catch {
      /* ignore */
    }
    if (reduceMotion || !("scrollBehavior" in document.documentElement.style)) {
      // تمرير سلس يدوي متدرج (متوافق حتى مع المتصفحات القديمة).
      let y = window.scrollY;
      const step = () => {
        y -= y * TICK + 24;
        if (y <= 0) {
          window.scrollTo(0, 0);
          return;
        }
        window.scrollTo(0, y);
        requestAnimationFrame(step);
      };
      step();
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          whileTap={reduceMotion ? undefined : { scale: 0.85 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          onClick={scrollTop}
          aria-label={isRtl ? "العودة إلى الأعلى" : "Retour en haut"}
          className="kb-hide md:hidden fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] end-4 z-40 w-11 h-11 rounded-2xl premium-glass text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-lg active:scale-95"
        >
          <ArrowUp size={19} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
