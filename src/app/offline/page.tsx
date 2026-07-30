"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WifiOff, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { createTranslator } from "@/lib/translations";

export default function OfflinePage() {
  const { language } = useAppStore();
  const t = createTranslator(language);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25 }}
        className="text-center max-w-md mx-auto p-8"
      >
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center">
          <WifiOff size={48} className="text-amber-500" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
          {language === "ar" ? "أنت غير متصل" : "Vous êtes hors ligne"}
        </h1>

        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          {language === "ar"
            ? "لا تقلق! يمكنك تصفح المنتجات التي قمت بزيارتها سابقاً. بعض الميزات قد لا تعمل بدون إنترنت."
            : "Ne vous inquiétez pas ! Vous pouvez toujours consulter les produits que vous avez visités. Certaines fonctionnalités peuvent ne pas fonctionner hors ligne."}
        </p>

        <div className="space-y-4">
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 text-amber-500 text-sm font-bold mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {language === "ar" ? "حاول إعادة الاتصال" : "Tentez de vous reconnecter"}
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            {language === "ar" ? "إعادة المحاولة" : "Réessayer"}
          </button>

          <Link
            href="/"
            className="block w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowLeft size={18} />
              {language === "ar" ? "العودة للرئيسية" : "Retour à l'accueil"}
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
