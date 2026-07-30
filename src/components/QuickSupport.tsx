"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Phone, Clock, MapPin, X } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function QuickSupport() {
  // ✅ استخدام الـ Selector بدلاً من التفكيك المباشر
  const language = useAppStore((state) => state.language);
  
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isRtl = language === "ar";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`fixed bottom-40 ${isRtl ? "right-6" : "left-6"} z-50`} dir={isRtl ? "rtl" : "ltr"}>
      <div
        className={`absolute bottom-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-64 md:w-72 space-y-4 mb-2 transition-all duration-300 ease-in-out transform ${
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-black text-sm text-slate-800 dark:text-white">
            {isRtl ? "المساعدة السريعة" : "Support info"}
          </h4>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg"><Phone size={14} /></div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? "الهاتف التجاري" : "Téléphone"}</p>
              <a href="tel:+213549179000" className="font-mono text-slate-500 hover:text-accent">+213 549 17 90 00</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg"><Clock size={14} /></div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? "ساعات العمل" : "Heures de travail"}</p>
              <p className="text-slate-500 font-medium">08:00 - 17:00 (Sam - Jeu)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg"><MapPin size={14} /></div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300">{isRtl ? "المقر الرئيسي" : "Atelier"}</p>
              <p className="text-slate-500 font-medium">{isRtl ? "وهران، الجزائر" : "Oran, Algérie"}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-slate-900 dark:bg-slate-800 hover:bg-accent dark:hover:bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all group"
        title={isRtl ? "معلومات الدعم" : "Infos support"}
      >
        <HelpCircle size={22} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}
