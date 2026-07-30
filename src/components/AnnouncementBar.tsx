"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAppStore } from "@/lib/store";
import { Sparkles, Megaphone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AnnouncementBar() {
  const language = useAppStore((state) => state.language);
  const [uiConfig, setUiConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // اتصال حي وفوري بقاعدة البيانات
    const unsub = onSnapshot(doc(db, "settings", "ui"), (docSnap) => {
      if (docSnap.exists()) {
        setUiConfig(docSnap.data());
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading || !uiConfig || !uiConfig.showAnnouncement || !isVisible) return null;

  const message = language === "ar" ? uiConfig.announcementAr : uiConfig.announcementFr;
  if (!message) return null;

  const isRtl = language === "ar";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0, y: -20 }}
        animate={{ height: "auto", opacity: 1, y: 0 }}
        exit={{ height: 0, opacity: 0, y: -20 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full relative overflow-hidden z-[99] select-none shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-b border-white/10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* 1. تأثير الخلفية اللوني المتحرك (Premium Moving Gradient) */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 via-purple-600 via-pink-600 to-violet-600 bg-[length:300%_auto] animate-[gradient_6s_linear_infinite]" />

        {/* 2. خط بريق الليزر الذي يمر عبر الشريط (Laser Shimmer Effect) */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 2 }}
          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
        />

        {/* الحاوية الداخلية للشريط */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between relative z-10">
          
          {/* عنصر زينة جانبي مخفي في الشاشات الصغيرة لإعطاء توازن */}
          <div className="hidden md:flex items-center gap-1 text-white/40 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={10} className="text-amber-300 animate-pulse" />
            {isRtl ? "عرض خاص" : "Exclusive"}
          </div>

          {/* محتوى الإعلان الرئيسي */}
          <div className="flex items-center justify-center gap-3 mx-auto text-center">
            {/* أيقونة الميكروفون المحاطة بـ موجة نبض هولوغرامية */}
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 animate-ping opacity-75"></span>
              <div className="p-1.5 bg-white/10 dark:bg-black/20 rounded-xl backdrop-blur-md border border-white/20 text-white shadow-inner">
                <Megaphone size={13} className="animate-[bounce_2s_infinite]" />
              </div>
            </div>

            {/* النص الفاخر مع تأثير توهج خفيف للخط */}
            <motion.p 
              initial={{ filter: "drop-shadow(0px 0px 0px rgba(255,255,255,0))" }}
              animate={{ filter: ["drop-shadow(0px 0px 2px rgba(255,255,255,0.6))", "drop-shadow(0px 0px 0px rgba(255,255,255,0))"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-white text-xs font-black tracking-wide leading-none drop-shadow-md selection:bg-white selection:text-indigo-600"
            >
              {message}
            </motion.p>

            {/* أيقونة زينة ثانية */}
            <Sparkles size={14} className="text-amber-300 animate-spin-slow hidden sm:inline" />
          </div>

          {/* زر الإغلاق الذكي الأنيق */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg backdrop-blur-md border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95 group"
            title={isRtl ? "إغلاق" : "Fermer"}
          >
            <X size={12} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* كود حقن تأثير حركة التدرج اللوني مباشرة داخل المكون بدون تعديل ملف Config */}
        <style jsx global>{`
          @keyframes gradient {
            0% { bg-position: 0% 50%; }
            50% { bg-position: 100% 50%; }
            100% { bg-position: 0% 50%; }
          }
          .animate-spin-slow {
            animation: spin 6s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
