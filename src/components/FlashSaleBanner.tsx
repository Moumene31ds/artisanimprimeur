"use client";

// Flash sale banner for L'Artisan Imprimeur
// Shows a live countdown + discount code under the navbar.
// Reads config from Firestore `settings/marketing` with a safe fallback.

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Copy, Check, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  getMarketingConfig,
  isFlashSaleLive,
  getFlashSaleWindow,
  trackMarketingEvent,
  type FlashSale,
} from "@/lib/marketing-engine";

export default function FlashSaleBanner() {
  const language = useAppStore((s) => s.language);
  const pathname = usePathname();
  const isRtl = language === "ar";

  const [flash, setFlash] = useState<FlashSale | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isSensitivePage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/payment");

  useEffect(() => {
    let mounted = true;
    getMarketingConfig().then((cfg) => {
      if (mounted) setFlash(cfg.flash);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Tick every second for the countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const copyCode = useCallback(async () => {
    if (!flash) return;
    try {
      await navigator.clipboard.writeText(flash.code);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackMarketingEvent("flash_sale_code_copied", { code: flash.code });
  }, [flash]);

  if (isSensitivePage || dismissed || !flash) return null;
  if (!isFlashSaleLive(flash)) return null;

  const { end } = getFlashSaleWindow(flash);
  const diff = Math.max(0, Math.floor((end - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="relative z-[98] overflow-hidden border-b border-white/10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="relative bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-[length:300%_auto] animate-[gradient_6s_linear_infinite]">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 1.5 }}
            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
          />

          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping opacity-75" />
                <div className="p-1.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-white">
                  <Zap size={14} className="animate-pulse" />
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white text-xs sm:text-sm font-black truncate">
                  {isRtl ? flash.titleAr : flash.titleFr}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-black text-[11px] border border-white/20">
                  <Clock size={10} />
                  {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:
                  {s.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile countdown */}
              <span className="sm:hidden px-2 py-1 rounded-lg bg-white/20 text-white font-mono font-black text-[11px]">
                {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:
                {s.toString().padStart(2, "0")}
              </span>

              {/* Code + copy */}
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-rose-600 font-black text-xs hover:bg-rose-50 transition-colors"
                title={isRtl ? "انسخ الكود" : "Copier le code"}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span className="font-mono tracking-widest">{flash.code}</span>
              </button>

              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
