"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

// -----------------------------------------------
// PullToRefresh — اسحب للتحديث (نمط تطبيقات الجوال)
// -----------------------------------------------
// يعمل فقط على الشاشات اللمسية. عند سحب الصفحة للأسفل من أعلى نقطة
// يتم عرض مؤشر التحديث، وبمجرد تجاوز العتبة يُستدعى onRefresh.

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  language?: "ar" | "fr";
}

const THRESHOLD = 72; // px

export default function PullToRefresh({ onRefresh, children, language = "ar" }: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isTouch = useRef(false);

  const isRtl = language === "ar";
  const label = refreshing
    ? (isRtl ? "جاري التحديث…" : "Actualisation…")
    : (isRtl ? "اسحب لتحديث الصفحة" : "Tirez pour actualiser");

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isTouch.current = true;
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (refreshing || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      const resistance = Math.min(delta * 0.5, THRESHOLD + 40);
      setPullDistance(resistance);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (startY.current === null) return;
    startY.current = null;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      const result = onRefresh();
      Promise.resolve(result).finally(() => {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
        }, 400);
      });
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  // إعادة ضبط المسافة عند تبديل الصفحة.
  useEffect(() => {
    setPullDistance(0);
    setRefreshing(false);
  }, []);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-full"
    >
      {/* مؤشر السحب */}
      <AnimatePresence>
        {(pullDistance > 8 || refreshing) && isTouch.current && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: pullDistance > 10 ? Math.min(pullDistance, 60) : 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full flex items-center justify-center overflow-hidden"
            style={{ height: refreshing ? 52 : undefined }}
          >
            <div
              className="flex flex-col items-center gap-1 transition-transform duration-100"
              style={{ transform: `translateY(${Math.max(0, Math.min(pullDistance, 60) - 44)}px)` }}
            >
              <motion.div
                animate={{ rotate: refreshing ? 360 : 0 }}
                transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0.2 }}
              >
                <RefreshCw
                  size={18}
                  className={pullDistance >= THRESHOLD || refreshing ? "text-accent" : "text-slate-400"}
                />
              </motion.div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}
