"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import ProductCard from "@/components/ProductCard";
import { HeartOff, ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FavoritesPage() {
  // ✅ التعديل هنا: جلب الخصائص والدوال بشكل منفصل (Selectors) لتفادي أخطاء جلب الحالة في Production
  const favorites = useAppStore((state) => state.favorites);
  const language = useAppStore((state) => state.language);
  const clearFavorites = useAppStore((state) => state.clearFavorites);
  
  const [mounted, setMounted] = useState(false);

  // منع مشاكل التوافق بين السيرفر والمتصفح (Hydration)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isRtl = language === 'ar';

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 animate-fadeIn ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 mt-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 group"
          >
            <ArrowLeft size={24} className={`transition-transform ${isRtl ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {isRtl ? "المفضلة" : "Mes Favoris"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
              {favorites.length} {isRtl ? "منتجات محفوظة" : "articles sauvegardés"}
            </p>
          </div>
        </div>

        {/* زر إفراغ المفضلة دفعة واحدة */}
        {favorites.length > 0 && (
          <button
            onClick={clearFavorites}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl font-bold transition-all shadow-sm hover:shadow"
          >
            <Trash2 size={20} />
            {isRtl ? "إفراغ المفضلة" : "Tout vider"}
          </button>
        )}
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        {favorites.length === 0 ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-32 premium-glass rounded-[3rem] border border-white/60 dark:border-white/10 shadow-2xl"
          >
            <div className="relative inline-block mb-6">
              <HeartOff size={80} className="text-slate-200 dark:text-slate-800" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 p-2 bg-red-500 rounded-full text-white shadow-lg"
              >
                <ShoppingBag size={20} />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-4">
              {isRtl ? "قائمة المفضلة فارغة" : "Votre liste est vide"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-10 leading-relaxed">
              {isRtl 
                ? "لم تقم بإضافة أي خدمات إلى مفضلتك بعد. تصفح خدماتنا وقم بتمييز ما يعجبك!" 
                : "Explorez nos services et ajoutez vos coups de cœur ici pour les retrouver plus tard."}
            </p>
            <Link 
              href="/services" 
              className="px-10 py-4 bg-slate-900 dark:bg-accent text-white rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all inline-block"
            >
              {isRtl ? "اكتشف خدماتنا" : "Découvrir nos services"}
            </Link>
          </motion.div>
        ) : (
          <motion.div 
            key="grid-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {favorites.map((product) => (
              <motion.div 
                key={product.id} 
                layout 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
