"use client";

import { useAppStore } from "@/lib/store";
import { createTranslator, getLanguageDirection, normalizeLanguage } from "@/lib/translations";
import { 
  Printer, ArrowRight, ArrowLeft, Star, Clock, Truck, Sparkles, 
  TrendingUp, ShieldCheck, Zap, Layers, Award, CheckCircle2, Gift, MapPin, Calculator
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

export default function LandingPage() {
  const { language, setLanguage } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Marketing Campaign ROI Calculator States
  const [selectedProduct, setSelectedProduct] = useState("flyers");
  const [printQuantity, setPrintQuantity] = useState(1000);
  const [targetAudience, setTargetAudience] = useState("b2b");

  // Wheel of Fortune States
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [wonPrize, setWonPrize] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [hasSpun, setHasSpun] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const spun = localStorage.getItem("landing_wheel_spun");
      if (spun === "true") setHasSpun(true);
    }
  }, []);

  if (!mounted) return null;

  const normalizedLanguage = normalizeLanguage(language);
  const t = createTranslator(normalizedLanguage);
  const isRtl = getLanguageDirection(normalizedLanguage) === "rtl";

  const toggleLang = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  const marketingPrizes = [
    { text: "خصم 15%", textFr: "15% DE RÉDUC", value: 15, code: "MARKET15" },
    { text: "شحن مجاني", textFr: "LIVRAISON GRATUITE", value: 100, code: "FREESHIP" },
    { text: "خصم 500 دج", textFr: "500 DA OFFERTS", value: 500, code: "BONUS500" },
    { text: "تصميم مجاني", textFr: "DESIGN GRATUIT", value: 0, code: "FREEDESIGN" },
    { text: "خصم 10%", textFr: "10% DE RÉDUC", value: 10, code: "MARKET10" },
    { text: "خصم 1000 دج", textFr: "1000 DA OFFERTS", value: 1000, code: "BONUS1000" },
  ];

  const spinWheel = async () => {
    if (isSpinning || hasSpun) return;
    setIsSpinning(true);
    const prizeIdx = Math.floor(Math.random() * marketingPrizes.length);
    const prize = marketingPrizes[prizeIdx];
    const newDegree = 360 * 5 - (prizeIdx * 60) - 30;
    setRotationDegree(newDegree);

    setTimeout(async () => {
      setIsSpinning(false);
      setHasSpun(true);
      setWonPrize(isRtl ? prize.text : prize.textFr);
      localStorage.setItem("landing_wheel_spun", "true");

      const generatedCode = `${prize.code}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setPromoCode(generatedCode);

      try {
        await setDoc(doc(db, "promoCodes", generatedCode), {
          code: generatedCode,
          discountType: prize.value > 100 ? "fixed" : "percent",
          discountValue: prize.value,
          description: `Offre Marketing Landing : ${prize.textFr}`,
          active: true,
          oneTimeUse: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: serverTimestamp(),
        });
        toast.success(isRtl ? "مبارك! تم توليد كود الخصم في حسابك." : "Félicitations ! Code créé.");
      } catch (err) {
        console.error("Error saving promo code:", err);
      }
    }, 5200);
  };

  // ROI Calculator Math
  const getUnitCost = () => {
    if (selectedProduct === "cards") return printQuantity >= 1000 ? 12 : 25;
    if (selectedProduct === "flyers") return printQuantity >= 1000 ? 4.5 : 9;
    if (selectedProduct === "stickers") return printQuantity >= 1000 ? 8 : 15;
    return 35;
  };
  const unitCost = getUnitCost();
  const totalCampaignCost = Math.round(unitCost * printQuantity);
  const estimatedReach = Math.round(printQuantity * (targetAudience === "b2b" ? 3.5 : 2.2));
  const estimatedLeads = Math.round(estimatedReach * 0.08);

  const features = [
    { icon: Star, title: isRtl ? 'جودة استثنائية CMYK' : 'Qualité Premium CMYK', desc: isRtl ? 'ورق فاخر 350g وطباعة عالية الدقة' : 'Papier de luxe 350g & impression HD', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Clock, title: isRtl ? 'إنجاز وسرعة قياسية' : 'Service Rapide 24/48h', desc: isRtl ? 'تسليم وسرعة تنفيذ مبهرة' : 'Respect total des délais engagés', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Truck, title: isRtl ? 'توصيل لـ 58 ولاية' : 'Livraison 58 Wilayas', desc: isRtl ? 'شحن آمن ومباشر حتى بابك' : 'Livraison rapide vers toute l\'Algérie', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: ShieldCheck, title: isRtl ? 'ضمان رضا 100%' : 'Garantie Satisfait 100%', desc: isRtl ? 'إعادة الطباعة مجاناً في حال وجود أي خطأ' : 'Réimpression gratuite en cas de défaut', color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ];

  return (
    <div className={`min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#020617] flex flex-col ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background Animated Blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-pulse pointer-events-none"></div>
      <div className="absolute top-1/3 -right-4 w-[30rem] h-[30rem] bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[140px] opacity-70 animate-pulse pointer-events-none" style={{animationDelay: '2s'}}></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-[120px] opacity-70 animate-pulse pointer-events-none" style={{animationDelay: '4s'}}></div>

      {/* Header Bar */}
      <header className="ios-glass-nav p-4 sticky top-0 z-50 border-b border-white/20 dark:border-slate-800">
        <div className="container mx-auto flex justify-between items-center max-w-6xl">
          <Link href="/" className="flex items-center gap-3 font-black text-lg text-slate-900 dark:text-white">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-500/30">
              <Printer size={22}/>
            </div>
            <div className="leading-tight">
              <span className="block text-[17px] font-black tracking-tight">{t('appTitle')}</span>
              <span className="text-blue-500 text-[10px] font-bold uppercase tracking-wider">{t('appSubtitle')}</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="text-xs font-black bg-white/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full hover:bg-white dark:hover:bg-slate-700 transition shadow-sm backdrop-blur-md text-slate-700 dark:text-slate-200">
              {isRtl ? 'Français' : 'العربية'}
            </button>
            <Link href="/login" className="px-5 py-2.5 bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold rounded-full hover:scale-105 transition shadow-md">
              {t('login')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Marketing Section */}
      <div className="flex-1 container mx-auto px-6 py-16 z-10 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="flex-1 text-center lg:text-start flex flex-col items-center lg:items-start animate-slideUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full ios-glass text-blue-600 dark:text-blue-400 font-bold text-xs mb-6 border border-white/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              {t('landingBadge')}
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-6 leading-[1.1]">
              {t('landingHeroTitle')}
            </h1>
            
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg lg:text-xl max-w-xl mb-8 font-medium leading-relaxed">
              {t('landingHeroSubtitle')}
            </p>
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link href="/login" className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group">
                {t('landingCta')} 
                {isRtl ? <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20}/> : <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20}/>}
              </Link>
              
              <Link href="/services" className="px-6 py-4 bg-white/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-2xl font-bold text-sm hover:bg-white dark:hover:bg-slate-800 transition shadow-sm">
                {isRtl ? "تصفح خدمات الطباعة" : "Découvrir le catalogue"}
              </Link>
            </div>
          </div>

          {/* Interactive Floating 3D Showcase Card */}
          <div className="flex-1 relative w-full h-[380px] lg:h-[480px] flex items-center justify-center">
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute z-20 w-72 sm:w-80 h-48 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-6 shadow-2xl border border-white/20 transform -rotate-6 hover:rotate-0 transition-all duration-500 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Printer size={24} className="text-blue-400" />
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Impression Premium 350g
                </span>
              </div>
              <div>
                <h3 className="font-black text-lg text-white mb-1">L'Artisan Imprimeur DZ</h3>
                <p className="text-xs text-slate-400">{isRtl ? "بطاقات أعمال وطباعة إعلانية فاخرة" : "Cartes de visite & Print B2B"}</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute z-10 w-72 sm:w-80 h-48 bg-gradient-to-br from-blue-600 to-emerald-600 text-white rounded-3xl p-6 shadow-2xl border border-white/20 transform rotate-6 hover:rotate-0 transition-all duration-500 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <Sparkles size={24} className="text-white" />
                <span className="text-xs font-mono text-white/80 font-bold">58 Wilayas</span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/70">{isRtl ? "شحن سريع وحصري" : "Livraison Express"}</p>
                <h4 className="text-xl font-black text-white mt-1">{isRtl ? "خصومات خاصة للشركات" : "Offres Entreprises"}</h4>
              </div>
            </motion.div>
          </div>

        </div>

        {/* Marketing Campaign ROI & Reach Calculator */}
        <section className="mt-20 premium-glass p-8 sm:p-12 rounded-[3rem] border border-blue-500/20 relative overflow-hidden shadow-2xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
              <Calculator size={14} />
              {isRtl ? "حاسبة العائد التسويقي المباشر" : "Simulateur d'Impact Marketing"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {isRtl ? "احسب تأثير وحجم وصول حملتك المطبوعة!" : "Estimez l'impact & le coût de votre campagne !"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-2">
              {isRtl ? "اختر المنتج والكمية لمعرفة التكلفة الإجمالية والوصول المتوقع لجمهورك في الجزائر." : "Sélectionnez votre produit et volume pour calculer vos vues et retours."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Inputs Block */}
            <div className="space-y-5 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-white/20 dark:border-slate-800">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {isRtl ? "1. نوع المنتج التسويقي:" : "1. Type de support :"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "cards", label: isRtl ? "بطاقات عمل" : "Cartes de Visite" },
                    { id: "flyers", label: isRtl ? "منشورات Flyers A5" : "Flyers A5" },
                    { id: "stickers", label: isRtl ? "ملصقات Stickers" : "Stickers Deco" },
                    { id: "posters", label: isRtl ? "بوستر أفيش A3" : "Affiches A3" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p.id)}
                      className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                        selectedProduct === p.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-black text-slate-600 dark:text-slate-300 mb-2">
                  <span>{isRtl ? "2. الكمية المطلوبة:" : "2. Volume d'impression :"}</span>
                  <span className="text-blue-500 font-mono">{printQuantity.toLocaleString()} {isRtl ? "نسخة" : "ex"}</span>
                </div>
                <input 
                  type="range" 
                  min="250" 
                  max="10000" 
                  step="250" 
                  value={printQuantity} 
                  onChange={(e) => setPrintQuantity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  {isRtl ? "3. الجمهور المستهدف:" : "3. Cible principale :"}
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTargetAudience("b2b")}
                    className={`flex-1 p-3 rounded-xl text-xs font-bold transition-all border ${targetAudience === "b2b" ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                  >
                    {isRtl ? "الشركات والأعمال (B2B)" : "Professionnels (B2B)"}
                  </button>
                  <button 
                    onClick={() => setTargetAudience("b2c")}
                    className={`flex-1 p-3 rounded-xl text-xs font-bold transition-all border ${targetAudience === "b2c" ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                  >
                    {isRtl ? "الأفراد والمستهلكون (B2C)" : "Grand Public (B2C)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Block */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 block mb-1">
                  {isRtl ? "التكلفة الإجمالية المقدرة" : "Budget Estime total"}
                </span>
                <div className="text-4xl font-black text-white flex items-baseline gap-2">
                  {totalCampaignCost.toLocaleString()} <span className="text-lg font-bold text-slate-400">DA</span>
                </div>
                <p className="text-xs text-emerald-400 font-bold mt-1">
                  ~{unitCost} DA {isRtl ? "سعر القطعة الواحدة" : "par unité"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">{isRtl ? "الوصول المتوقع" : "Portée estimée"}</span>
                  <span className="text-2xl font-black text-indigo-300 font-mono mt-1 block">+{estimatedReach.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">{isRtl ? "مشاهدة وانطباع" : "impressions"}</span>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">{isRtl ? "العملاء المحتملون" : "Leads estimés"}</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">~{estimatedLeads.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">{isRtl ? "تفاعل وتواصل" : "contacts"}</span>
                </div>
              </div>

              <Link 
                href="/login" 
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
              >
                <span>{isRtl ? "ابدأ هذه الحملة الآن" : "Lancer ma commande"}</span>
                <ArrowRight size={16} className={isRtl ? 'rotate-180' : ''} />
              </Link>
            </div>
          </div>
        </section>

        {/* Spin & Win Wheel of Discounts */}
        <section className="mt-20 text-center">
          <div className="max-w-xl mx-auto mb-8">
            <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
              <Gift size={14} />
              {isRtl ? "عجلة العروض والجوائز اليومية" : "Roue de la Fortune Marketing"}
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {isRtl ? "أدر العجلة واكسب كود خصم فوري!" : "Tournez la roue et gagnez un coupon !"}
            </h2>
          </div>

          <div className="relative w-72 h-72 mx-auto mb-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-6 h-8 bg-red-500 clip-triangle shadow-lg"></div>
            
            <motion.div 
              animate={{ rotate: rotationDegree }}
              transition={{ duration: 5, ease: "easeOut" }}
              className="w-full h-full rounded-full border-8 border-slate-900 bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 shadow-2xl flex items-center justify-center overflow-hidden relative"
            >
              <div className="text-center text-white font-black text-sm p-4 backdrop-blur-md bg-black/20 rounded-full border border-white/20">
                {wonPrize ? (
                  <div className="space-y-1">
                    <p className="text-xs text-amber-300 font-bold">{isRtl ? "مبروك ربحت!" : "Gagné !"}</p>
                    <p className="text-base">{wonPrize}</p>
                    <p className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded">{promoCode}</p>
                  </div>
                ) : (
                  <span>L'Artisan<br/>Wheel</span>
                )}
              </div>
            </motion.div>
          </div>

          {!hasSpun && (
            <button 
              onClick={spinWheel} 
              disabled={isSpinning}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-base rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSpinning ? (isRtl ? "جاري التدوير..." : "Tirage en cours...") : (isRtl ? "أدر العجلة الآن 🎲" : "Tourner la Roue 🎲")}
            </button>
          )}
        </section>

        {/* Core Features Grid */}
        <div className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 z-10 mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/60 ${f.bg} ${f.color}`}>
                  <f.icon size={22} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{f.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
