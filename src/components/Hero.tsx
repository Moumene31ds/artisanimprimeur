"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { Sparkles, ArrowRight, ArrowLeft, Truck, HandCoins, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Hero() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // عرض هيكل فارغ مؤقت لمنع أخطاء الـ Hydration في Next.js
    return <div className="h-[60vh] w-full bg-slate-100 animate-pulse rounded-3xl"></div>;
  }

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";

  const trustItems = [
    { icon: Truck, text: isRtl ? "توصيل سريع" : "Livraison rapide" },
    { icon: HandCoins, text: isRtl ? "الدفع عند الاستلام" : "Paiement à la livraison" },
    { icon: BadgeCheck, text: isRtl ? "جودة مضمونة" : "Qualité garantie" },
  ];

  return (
    <section className="relative w-full overflow-hidden rounded-[2.5rem] min-h-[62vh] flex flex-col items-center justify-center px-5 py-14 sm:py-20 mb-2 bg-slate-950">
      {/* طبقة Aurora المتحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
      <div className="absolute -top-24 -left-16 w-80 h-80 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-aurora"></div>
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-35 animate-aurora-2"></div>
      <div className="absolute -bottom-28 left-1/4 w-80 h-80 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-aurora" style={{ animationDelay: "3s" }}></div>

      {/* شبكة نقاط خفيفة */}
      <div className="absolute inset-0 pattern-dots opacity-[0.12]"></div>
      {/* خط توهج علوي */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"></div>

      {/* بطاقات زخرفية عائمة (شاشات أكبر) */}
      <div className="hidden lg:block absolute top-16 right-14 glass-dark-chip animate-float-y pointer-events-none select-none">
        <span className="text-3xl">🖨️</span>
      </div>
      <div className="hidden lg:block absolute bottom-20 left-12 glass-dark-chip animate-float-y-delayed pointer-events-none select-none">
        <span className="text-3xl">✨</span>
      </div>
      <div className="hidden lg:block absolute top-1/3 left-1/4 glass-dark-chip animate-float-y-delayed pointer-events-none select-none">
        <span className="text-3xl">💎</span>
      </div>

      {/* المحتوى */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full animate-slideUp">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-xs sm:text-sm font-semibold mb-6 backdrop-blur-md border border-white/15 shadow-lg shadow-black/20">
          <Sparkles size={15} className="text-amber-300" />
          <span>{t.heroSubtitle}</span>
        </div>

        <h1 className="text-[2.6rem] sm:text-6xl font-black text-white mb-4 leading-[1.15] tracking-tight">
          {t.heroTitle}
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 drop-shadow-[0_0_25px_rgba(59,130,246,0.35)]">
            {t.appTitle}
          </span>
        </h1>

        <p className="text-white/70 font-medium text-sm sm:text-base max-w-xl leading-relaxed mb-8">
          {isRtl
            ? "بطاقات أعمال، ملصقات، أكواب، قمصان والمزيد — صمّم بنفسك واستلم في غضون أيام."
            : "Cartes de visite, stickers, mugs, t-shirts et plus — personnalisez et recevez en quelques jours."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <Link
            href="#products"
            className="btn-glow w-full sm:w-auto px-9 py-4 bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-black text-sm transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30"
          >
            <span>{t.orderNow}</span>
            {isRtl ? <ArrowLeft size={19} /> : <ArrowRight size={19} />}
          </Link>
          <Link
            href="/services"
            className="w-full sm:w-auto px-9 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm transition-all backdrop-blur-md border border-white/15 active:scale-95 flex items-center justify-center"
          >
            {t.exploreServices}
          </Link>
        </div>

        {/* شريط الثقة (Trust Strip) */}
        <div className="mt-10 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {trustItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md"
            >
              <item.icon size={15} className="text-emerald-300" />
              <span className="text-[11px] sm:text-xs font-bold text-white/85">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
