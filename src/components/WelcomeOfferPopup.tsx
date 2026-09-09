"use client";

// Welcome offer popup for L'Artisan Imprimeur
// Shows a timed + exit-intent discount offer with a live countdown.
// Gated to once per session / once per day via the marketing engine.

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Copy, Check, ArrowRight, Clock, Tag } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  getMarketingConfig,
  shouldShowWelcomeOffer,
  markWelcomeOfferSeen,
  applyWelcomeCodeLocally,
  trackMarketingEvent,
  type WelcomeOffer,
} from "@/lib/marketing-engine";
import confetti from "canvas-confetti";

const POPUP_DELAY = 5000; // show after 5s on idle users
const EXIT_THRESHOLD = 40; // mouse near top edge triggers exit-intent

export default function WelcomeOfferPopup() {
  const language = useAppStore((s) => s.language);
  const pathname = usePathname();
  const isRtl = language === "ar";

  const [config, setConfig] = useState<WelcomeOffer | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const dismissed = useRef(false);
  const shownOnce = useRef(false);

  // Hide on sensitive pages
  const isSensitivePage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/payment");

  const loadConfig = useCallback(async () => {
    if (dismissed.current || shownOnce.current) return;
    const { welcome } = await getMarketingConfig();
    if (!welcome.enabled) return;
    setConfig(welcome);
    setTimeLeft(welcome.expiresInMinutes * 60);
  }, []);

  useEffect(() => {
    if (!isSensitivePage) loadConfig();
  }, [isSensitivePage, loadConfig]);

  const show = useCallback(() => {
    if (dismissed.current || shownOnce.current || isSensitivePage) return;
    if (!shouldShowWelcomeOffer()) return;
    shownOnce.current = true;
    markWelcomeOfferSeen();
    setVisible(true);
    trackMarketingEvent("welcome_offer_shown");
    // Confetti burst for delight
    setTimeout(() => {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, zIndex: 100000 });
    }, 300);
  }, [isSensitivePage]);

  // Timed trigger
  useEffect(() => {
    if (isSensitivePage) return;
    const t = setTimeout(show, POPUP_DELAY);
    return () => clearTimeout(t);
  }, [show, isSensitivePage]);

  // Exit-intent trigger
  useEffect(() => {
    if (isSensitivePage) return;
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= EXIT_THRESHOLD) show();
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [show, isSensitivePage]);

  // Countdown
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setVisible(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible]);

  const close = useCallback(() => {
    dismissed.current = true;
    setVisible(false);
  }, []);

  const copyCode = useCallback(async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config.code);
      applyWelcomeCodeLocally(config.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackMarketingEvent("welcome_offer_copied", { code: config.code });
    } catch {
      // Fallback for older browsers
      applyWelcomeCodeLocally(config.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [config]);

  if (!config || !visible) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        onClick={close}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <motion.div
          initial={{ scale: 0.8, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 shadow-2xl"
          style={{
            background: "linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          {/* Animated gradient top band */}
          <div className="relative h-24 overflow-hidden bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 bg-[length:300%_auto] animate-[gradient_5s_linear_infinite]">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 rounded-full border-4 border-white/30"
              />
              <div className="absolute w-16 h-16 bg-white/90 rounded-2xl shadow-xl flex items-center justify-center rotate-6">
                <Gift className="text-violet-600" size={28} />
              </div>
            </div>
            <button
              onClick={close}
              className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 sm:p-7 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-black uppercase tracking-wider">
              <Tag size={12} />
              {isRtl ? "هدية خاصة" : "Offre exclusive"}
            </span>

            <h2 className="mt-3 text-2xl font-black text-slate-900 leading-tight">
              {isRtl ? config.headlineAr : config.headlineFr}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {isRtl ? config.subheadAr : config.subheadFr}
            </p>

            {/* Discount code */}
            <div className="mt-5 flex items-stretch justify-center gap-2">
              <div className="relative">
                <span className="inline-flex items-center justify-center h-14 px-6 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-50 font-mono font-black text-lg tracking-[0.2em] text-violet-700">
                  {config.code}
                </span>
                <span className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-black uppercase">
                  -{config.discountLabel}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="h-14 px-4 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-black text-sm flex items-center gap-2 transition-colors"
              >
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                {copied ? (isRtl ? "تم النسخ" : "Copié") : (isRtl ? "نسخ" : "Copier")}
              </button>
            </div>

            <p className="mt-2.5 text-[11px] font-bold text-slate-400">
              {isRtl ? "أدخل الكود عند الدفع" : "Saisissez le code au moment du paiement"}
            </p>

            {/* Countdown */}
            <div className="mt-5 flex items-center justify-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <div className="flex items-center gap-1.5 font-mono font-black text-amber-600">
                <span className="px-2 py-1 rounded-lg bg-amber-100 min-w-[34px] text-center">{minutes}</span>
                <span>:</span>
                <span className="px-2 py-1 rounded-lg bg-amber-100 min-w-[34px] text-center">
                  {seconds.toString().padStart(2, "0")}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mr-1">
                  {isRtl ? "دقيقة : ثانية" : "min : sec"}
                </span>
              </div>
            </div>

            <a
              href="/"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black shadow-lg shadow-violet-600/25 hover:scale-[1.02] active:scale-95 transition-transform"
            >
              {isRtl ? "تسوق الآن" : "J'en profite"}
              <ArrowRight size={18} className={isRtl ? "rotate-180" : ""} />
            </a>

            <p className="mt-3 text-[10px] font-bold text-slate-400">
              {isRtl
                ? `قيمة الطلب الأدنى: ${config.minAmount} دج • لا تتراكم مع عروض أخرى`
                : `Commande min. ${config.minAmount} DA • Non cumulable`}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
