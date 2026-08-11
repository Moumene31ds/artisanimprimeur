"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ShoppingCart, Heart, Eye, Check, Plus, Minus, Layers, Share2 } from "lucide-react";
import { useAppStore, Product } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import BottomSheet from "@/components/BottomSheet";
import { triggerHapticFeedback } from "@/lib/utils"; // افتراض أنك أنشأت هذه الدالة، وإلا يمكنك إزالتها
import { nativeShare } from "@/lib/native";

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { language, addToCart, toggleFavorite, isFavorite } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  // حالات التخصيص
  const [finition, setFinition] = useState("Standard"); // خيار نوع الورق
  const [isOptionsOpen, setIsOptionsOpen] = useState(false); // لفتح قائمة الخيارات
  const [qty, setQty] = useState(1);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const favorite = isFavorite(product.id);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  const handleAddToCart = (quantity: number = 1, selectedFinition: string = "Standard") => {
    try {
      triggerHapticFeedback('light'); // تأثير اهتزاز خفيف للموبايل
    } catch (e) {}

    setIsAdding(true);
    addToCart({ 
      ...product, 
      quantity, 
      selectedOptions: { finition: selectedFinition } // حفظ التخصيص في السلة
    });
    
    toast.success(isRtl ? `تمت الإضافة (${selectedFinition})` : `Ajouté (${selectedFinition})`);
    
    setTimeout(() => setIsAdding(false), 1500);
    setIsQuickViewOpen(false);
    setIsOptionsOpen(false);
  };

  const handleShare = async () => {
    try {
      triggerHapticFeedback('light');
    } catch (e) {}
    const url = `https://artisanimprimeur.vercel.app/services?product=${encodeURIComponent(product.id)}`;
    const ok = await nativeShare({
      title: product.name,
      text: product.name,
      url,
    });
    if (!ok) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(isRtl ? "تم نسخ رابط المنتج" : "Lien du produit copié");
      } catch (e) {
        toast.error(isRtl ? "تعذر المشاركة" : "Partage impossible");
      }
    }
  };

  return (
    <>
      {/* --- بطاقة المنتج الرئيسية --- */}
      <motion.div 
        whileHover={{ y: -8 }}
        className="premium-glass rounded-[2rem] overflow-hidden group flex flex-col h-full shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/60 dark:border-white/5 relative"
      >
        <div className="relative h-72 sm:h-64 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            priority={priority}
            fetchPriority={priority ? "high" : "auto"}
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* أزرار hover للشاشات الكبيرة (ماوس) */}
          <div className="absolute inset-0 bg-brand/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => handleAddToCart(1, finition)}
              className="p-4 bg-accent text-white rounded-2xl shadow-xl flex items-center justify-center"
            >
              {isAdding ? <Check size={22} /> : <ShoppingCart size={22} />}
            </motion.button>
            <motion.button 
               whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
               onClick={() => setIsQuickViewOpen(true)}
               className="p-4 bg-white text-slate-900 rounded-2xl shadow-xl flex items-center justify-center"
            >
              <Eye size={22} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="p-4 bg-white/90 text-slate-900 rounded-2xl shadow-xl flex items-center justify-center"
            >
              <Share2 size={22} />
            </motion.button>
          </div>

          {/* زر إضافة سريع دائم على الموبايل (لا يوجد hover باللمس) */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => handleAddToCart(1, finition)}
            aria-label={isRtl ? "أضف إلى السلة" : "Ajouter au panier"}
            className={`absolute bottom-3 ${isRtl ? 'right-3' : 'left-3'} p-3.5 md:hidden rounded-2xl bg-accent text-white shadow-xl shadow-blue-500/40 flex items-center justify-center z-10 border border-white/20`}
          >
            <motion.span
              key={isAdding ? "check" : "cart"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="flex items-center justify-center"
            >
              {isAdding ? <Check size={20} /> : <ShoppingCart size={20} />}
            </motion.span>
          </motion.button>

          <button 
            onClick={() => toggleFavorite(product)}
            className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} p-3 rounded-2xl backdrop-blur-xl transition-all shadow-lg z-10 ${
              favorite ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/40"
            }`}
          >
            <Heart size={18} fill={favorite ? "currentColor" : "none"} className={favorite ? "animate-pulse" : ""} />
          </button>

          {/* زر مشاركة المنتج (ورقة المشاركة الأصلية في التطبيق) */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleShare}
            aria-label={isRtl ? "مشاركة المنتج" : "Partager"}
            className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} p-3 md:hidden rounded-2xl backdrop-blur-xl bg-white/20 text-white hover:bg-white/40 transition-all shadow-lg z-10 border border-white/10`}
          >
            <Share2 size={18} />
          </motion.button>
        </div>

        <div className="p-6 flex-grow flex flex-col justify-between bg-white/40 dark:bg-transparent">
          <div>
            <span className="text-[10px] font-black text-accent dark:text-blue-400 tracking-[0.2em] uppercase mb-2 block">
              {product.category || "Impression"}
            </span>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight mb-4">{product.name}</h3>
          </div>
          
          {/* --- قسم اختيار التشطيبات (Finition) السريع --- */}
          <AnimatePresence>
            {isOptionsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{isRtl ? "نوع الورق / التغليف:" : "Finition :"}</p>
                </div>
                <div className="flex gap-2">
                  {['Standard', 'Matte', 'Brillante'].map(opt => (
                    <button 
                      key={opt} onClick={() => setFinition(opt)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        finition === opt 
                          ? 'bg-accent text-white shadow-md' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{isRtl ? "سعر البداية" : "À partir de"}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{product.price}</span>
                <span className="text-sm font-bold text-slate-400">{t.currency}</span>
              </div>
            </div>
            
            {/* زر التخصيص أو الإضافة السريعة */}
            {isOptionsOpen ? (
              <button onClick={() => handleAddToCart(1, finition)} className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                <ShoppingCart size={18} />
              </button>
            ) : (
              <button onClick={() => setIsOptionsOpen(true)} className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center hover:scale-110 transition-transform shadow-md">
                <PlusIcon size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* --- نافذة المعاينة السريعة (Quick View) — BottomSheet على الموبايل / Modale على الديسكتوب --- */}
      <BottomSheet
        open={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        isRtl={isRtl}
        title={product.name}
      >
        <div className="flex flex-col md:flex-row gap-0 md:gap-8 pb-2">
          <div className="w-full md:w-1/2 h-56 sm:h-72 md:h-[420px] relative overflow-hidden bg-slate-900 flex items-center justify-center rounded-3xl md:rounded-[2rem] shrink-0">
            <style>{`
              @keyframes shimmer-gloss {
                0% { transform: translateX(-100%) rotate(30deg); }
                100% { transform: translateX(150%) rotate(30deg); }
              }
              .glossy-sheen-overlay {
                position: absolute;
                inset: -100px;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0.05) 20%,
                  rgba(255, 255, 255, 0.55) 50%,
                  rgba(255, 255, 255, 0.05) 80%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shimmer-gloss 3.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                z-index: 10;
                mix-blend-mode: overlay;
              }
              .matte-velvet-overlay {
                position: absolute;
                inset: 0;
                backdrop-filter: contrast(0.95) saturate(1.05) brightness(1.02);
                background-image: radial-gradient(rgba(0,0,0,0.15) 0.5px, transparent 0);
                background-size: 3px 3px;
                opacity: 0.25;
                pointer-events: none;
                z-index: 10;
              }
            `}</style>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-cover transition-all duration-700 ${
                finition === "Matte" ? "filter brightness-[0.98] contrast-[0.97] saturate-[1.02]" : ""
              }`}
            />

            {/* Visual Finish Overlay */}
            {finition === "Brillante" && <div className="glossy-sheen-overlay" />}
            {finition === "Matte" && <div className="matte-velvet-overlay" />}

            {/* Curated Interactive Finish Badge */}
            <div className="absolute bottom-4 right-4 z-25 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5">
              {finition === "Brillante" && <><span>💎</span> {isRtl ? "لامع برّاق" : "Ultra Glossy"}</>}
              {finition === "Matte" && <><span>🌓</span> {isRtl ? "مطفأ مخملي" : "Satin Matte"}</>}
              {finition === "Standard" && <><span>📄</span> {isRtl ? "ورق قياسي" : "Standard"}</>}
            </div>
          </div>

          <div className="w-full md:w-1/2 py-5 md:py-2 flex flex-col justify-center">
            <span className="text-xs font-black text-accent uppercase tracking-widest mb-2 hidden md:block">{product.category}</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3">{product.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-sm">
              {isRtl ? "تصميم احترافي وجودة طباعة عالية لضمان أفضل صورة لعلامتك التجارية. مثالي للاستخدام الشخصي والتجاري. يمكنك رفع ملف التصميم الخاص بك في السلة." : "Design professionnel et impression de haute qualité pour garantir la meilleure image de votre marque. Vous pourrez uploader votre design dans le panier."}
            </p>

            {/* خيارات النافذة المنبثقة */}
            <div className="mb-6 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-500" />
                {isRtl ? "اختر نوع وتغليف الورق (معاينة حية في الصورة):" : "Type de Papier & Finition (Aperçu en direct):"}
              </p>
              <div className="flex gap-2">
                {[
                  { id: 'Standard', label: isRtl ? "📄 قياسي" : "📄 Standard" },
                  { id: 'Matte', label: isRtl ? "🌓 مطفأ فاخر" : "🌓 Soft Matte" },
                  { id: 'Brillante', label: isRtl ? "💎 لامع برّاق" : "💎 High Gloss" }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setFinition(opt.id);
                      try { triggerHapticFeedback('light'); } catch(e){}
                    }}
                    className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase transition-all border active:scale-[0.97] ${
                      finition === opt.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg scale-[1.03]'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Finish description card */}
              <motion.div
                key={finition}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-slate-800/40 border border-indigo-100/50 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed"
              >
                {finition === "Standard" && (
                  <p>{isRtl ? "✨ ورق كوشيه متين 350غ بلمسة طبيعية خفيفة ومناسبة لجميع أنواع بطاقات الأعمال والمطبوعات الإعلانية اليومية." : "✨ Papier couché 350g solide avec un toucher naturel, idéal pour tous les types de cartes de visite et imprimés publicitaires."}</p>
                )}
                {finition === "Matte" && (
                  <p>{isRtl ? "🌓 طبقة ناعمة ومخملية مضادة للخدش والانعكاسات، تضفي لمسة هادئة وراقية للغاية، وهي المفضلة للشركات الكبرى والأطباء." : "🌓 Finition veloutée antireflet et anti-rayures, offrant un aspect sobre et très haut de gamme, privilégié par les grandes marques."}</p>
                )}
                {finition === "Brillante" && (
                  <p>{isRtl ? "💎 طبقة لامعة ونابضة بالحياة تعكس الضوء وتجعل الألوان والصور تظهر ببريق استثنائي وتباين مذهل للملصقات والمجلات." : "💎 Couche ultra-brillante protectrice qui ravive les couleurs et magnifie vos visuels avec un contraste éclatant, parfait pour les stickers."}</p>
                )}
              </motion.div>
            </div>

            <div className="text-3xl font-black text-accent mb-6 border-t border-slate-100 dark:border-slate-800 pt-5">
              {product.price} <span className="text-lg text-slate-500">{t.currency}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sticky sm:static bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md py-3 -mx-6 px-6 sm:p-0 sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none sm:-mx-0 sm:px-0 sm:rounded-none">
              <div className="flex items-center w-full sm:w-auto bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 border border-slate-200 dark:border-slate-700">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"><Minus size={18}/></button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-3 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"><Plus size={18}/></button>
              </div>

              <button onClick={() => handleAddToCart(qty, finition)} className="w-full py-4 sm:py-5 bg-slate-900 dark:bg-accent text-white rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-3">
                <ShoppingCart size={20} /> {isRtl ? "أضف إلى السلة" : "Ajouter au panier"}
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

// أيقونة مبسطة ومخصصة
function PlusIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
}
