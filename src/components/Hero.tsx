"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
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

  return (
    <div className="relative w-full rounded-3xl overflow-hidden min-h-[60vh] flex items-center justify-center p-6 sm:p-12 mb-12 bg-slate-900">
      {/* تأثيرات الخلفية المتحركة (Blobs) */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{ animationDelay: "2s" }}></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{ animationDelay: "4s" }}></div>

      {/* المحتوى الزجاجي */}
      <div className="relative z-10 ios-glass-dark p-8 sm:p-12 rounded-2xl max-w-3xl w-full text-center animate-slideUp border border-white/10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-semibold mb-6 backdrop-blur-md border border-white/20">
          <Sparkles size={16} className="text-yellow-400" />
          <span>{t.heroSubtitle}</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 leading-tight">
          {t.heroTitle} <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            {t.appTitle}
          </span>
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link 
            href="#products" 
            className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-blue-600 text-white rounded-xl font-bold transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
          >
            <span>{t.orderNow}</span>
            {isRtl ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
          </Link>
          <Link 
            href="/services" 
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all backdrop-blur-md flex items-center justify-center active:scale-95"
          >
            {t.services}
          </Link>
        </div>
      </div>
    </div>
  );
}

