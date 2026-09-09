"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { SHOWCASE_TEMPLATES, DesignerTemplate } from "@/lib/marketplace-service";
import DesignersComingSoon from "@/components/designers/DesignersComingSoon";
import { 
  Palette, Sparkles, Coins, Upload, Star, CheckCircle, 
  TrendingUp, Users, ArrowRight, ShoppingCart, Eye, DollarSign 
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

export default function DesignersMarketplacePage() {
  const { language, addToCart } = useAppStore();
  const { user, isLoggedIn, isAdmin } = useAuth();
  const isRtl = language === "ar";

  const [designersEnabled, setDesignersEnabled] = useState<boolean | null>(null);
  const [adminPreview, setAdminPreview] = useState(false);

  const [activeTab, setActiveTab] = useState<"browse" | "submit">("browse");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ui"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDesignersEnabled(data.designersEnabled === true);
      } else {
        setDesignersEnabled(false);
      }
    });
    return () => unsub();
  }, []);

  // Submission form states
  const [newTitle, setNewTitle] = useState("");
  const [newTitleAr, setNewTitleAr] = useState("");
  const [newCategory, setNewCategory] = useState<DesignerTemplate["category"]>("cartes");
  const [newRoyalty, setNewRoyalty] = useState(500);
  const [newPreviewUrl, setNewPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTemplates = SHOWCASE_TEMPLATES.filter(
    (t) => selectedCategory === "all" || t.category === selectedCategory
  );

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error(isRtl ? "يرجى كتابة عنوان التصميم" : "Veuillez renseigner le titre");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(
        isRtl
          ? "تم إرسال قالبك للمراجعة! سيتم نشره وإيداع عمولتك عند كل طلب طباعة."
          : "Modèle soumis pour validation ! Vous recevrez vos redevances à chaque impression."
      );
      setNewTitle("");
      setNewTitleAr("");
      setActiveTab("browse");
    }, 1200);
  };

  const handleOrderWithTemplate = (tpl: DesignerTemplate) => {
    try {
      triggerHapticFeedback("medium");
    } catch {}

    const basePrintPrice = 3500;
    const finalPrice = basePrintPrice + tpl.royaltyFeeDZD;

    addToCart({
      id: `mkt-tpl-${tpl.id}-${Date.now()}`,
      name: isRtl ? `${tpl.titleAr} (تصميم: ${tpl.designerName})` : `${tpl.title} (Par ${tpl.designerName})`,
      price: finalPrice,
      quantity: 1,
      category: "Cartes",
      image: tpl.previewImageUrl,
      selectedOptions: {
        designerName: tpl.designerName,
        designerRoyalty: `${tpl.royaltyFeeDZD} DA`,
        format: "350g Couché Mat Soft-Touch",
      },
    });

    toast.success(
      isRtl ? "تمت إضافة التصميم للطباعة مع دعم المصمم!" : "Modèle ajouté au panier avec rémunération du créateur !"
    );
  };

  if (designersEnabled === false && !adminPreview) {
    return (
      <DesignersComingSoon
        isRtl={isRtl}
        isAdmin={isAdmin}
        onPreviewFullMarketplace={() => setAdminPreview(true)}
      />
    );
  }

  return (
    <div
      className={`animate-fadeIn pb-24 max-w-7xl mx-auto px-4 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Admin Preview Mode Notice Banner */}
      {adminPreview && (
        <div className="mb-4 mt-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm">
          <span>{isRtl ? "⚠️ أنت الآن في وضع معاينة المشرف (سوق المصممين في حالة 'قريباً' للجمهور)" : "⚠️ Mode Aperçu Admin actif (La Marketplace Designers est fermée au public)"}</span>
          <button
            onClick={() => setAdminPreview(false)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs cursor-pointer active:scale-95 transition-all"
          >
            {isRtl ? "العودة لواجهة قريباً" : "Quitter l'aperçu"}
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden premium-glass rounded-[2.5rem] p-6 sm:p-12 border border-white/60 dark:border-white/10 shadow-2xl mb-10 mt-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black uppercase tracking-wider mb-4">
          <Palette size={14} />
          {isRtl ? "سوق المصممين الجزائريين المستقلين" : "Marketplace Designers Graphiques"}
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-3 max-w-3xl mx-auto leading-tight">
          {isRtl ? "اربح عمولة مستمرة على كل طلب يُطبع من تصاميمك" : "Monétisez vos Designs à Chaque Impression"}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8">
          {isRtl
            ? "منصة تشاركية للمصممين المبدعين: ارفع قوالبك للمطبوعات الفاخرة، واكسب عائداً مادياً يُودع في محفظتك الرقمية عند كل عملية طباعة."
            : "Rejoignez notre réseau de créateurs : publiez vos gabarits et touchez des royalties automatiques sur chaque commande d'impression."}
        </p>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white block">+35</span>
            <span className="text-[11px] text-slate-400">{isRtl ? "مصمم نشط" : "Designers Pro"}</span>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">+1,400</span>
            <span className="text-[11px] text-slate-400">{isRtl ? "طلب مطبوع بالقوالب" : "Impressions réalisées"}</span>
          </div>
          <div>
            <span className="text-2xl font-black text-amber-600 block">500 DA</span>
            <span className="text-[11px] text-slate-400">{isRtl ? "متوسط العمولة / طلب" : "Royalty moyen"}</span>
          </div>
          <div>
            <span className="text-2xl font-black text-blue-600 block">24h</span>
            <span className="text-[11px] text-slate-400">{isRtl ? "تحويل الأرباح للمحفظة" : "Paiement rapide"}</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/50 dark:border-slate-700/50 shadow-inner">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "browse"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {isRtl ? "تصفح قوالب المصممين" : "Parcourir les Créations"}
          </button>
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              activeTab === "submit"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Upload size={15} />
            {isRtl ? "انضم كمصمم وارفع قالباً" : "Déposer un Modèle (+Gain)"}
          </button>
        </div>
      </div>

      {activeTab === "browse" ? (
        <div className="space-y-6">
          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="premium-glass rounded-[2rem] overflow-hidden border border-white/60 dark:border-white/10 shadow-lg flex flex-col justify-between hover:shadow-2xl transition-all"
              >
                <div className="relative h-56 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <Image
                    src={tpl.previewImageUrl}
                    alt={tpl.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-white text-[11px] font-black flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    {tpl.rating}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                      {isRtl ? tpl.titleAr : tpl.title}
                    </h3>

                    {/* Author line */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">{tpl.designerName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        {tpl.totalSalesCount} {isRtl ? "طبعة" : "tirages"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {isRtl ? "عمولة المصمم المضمنة" : "Gain Créateur"}
                      </span>
                      <span className="font-black text-amber-600 text-sm">
                        +{tpl.royaltyFeeDZD} DA
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOrderWithTemplate(tpl)}
                      className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
                    >
                      <ShoppingCart size={14} />
                      {isRtl ? "طلب وطباعة" : "Imprimer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Designer Submission Tab */
        <div className="max-w-2xl mx-auto ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isRtl ? "تقديم قالب جديد لسوق المصممين" : "Soumettre un Nouveau Modèle Graphique"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isRtl
                ? "حدد عمولتك المطلوبة لكل طلب طباعة. سيقوم فريق التدقيق بفحص جودة الملف ونشره خلال 24 ساعة."
                : "Fixez votre redevance par tirage. Notre équipe valide les résolutions sous 24 heures."}
            </p>
          </div>

          <form onSubmit={handleSubmitTemplate} className="space-y-4 text-xs font-bold">
            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1">
                {isRtl ? "عنوان التصميم (فرنسي أو إنجليزي)" : "Titre du Design (Français/Anglais)"}
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Carte Minimaliste Dorée Restaurant"
                className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-600 dark:text-slate-400 block mb-1">
                {isRtl ? "عنوان التصميم بالعربية" : "Titre en Arabe"}
              </label>
              <input
                type="text"
                value={newTitleAr}
                onChange={(e) => setNewTitleAr(e.target.value)}
                placeholder="مثال: بطاقة أعمال ذهبية راقية للمطاعم"
                className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">
                  {isRtl ? "التصنيف" : "Catégorie"}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none"
                >
                  <option value="cartes">Cartes de Visite (بطاقات عمل)</option>
                  <option value="flyers">Flyers & Dépliants (منشورات)</option>
                  <option value="stickers">Stickers & Étiquettes (ملصقات)</option>
                  <option value="packaging">Packaging & Boîtes (علب وتغليف)</option>
                  <option value="affiches">Affiches & Posters (بوسترات)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">
                  {isRtl ? "عمولتك المرغوبة لكل طلب (DA)" : "Votre Redevance par Tirage (DA)"}
                </label>
                <input
                  type="number"
                  min="200"
                  max="3000"
                  step="50"
                  value={newRoyalty}
                  onChange={(e) => setNewRoyalty(Number(e.target.value))}
                  className="w-full p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 outline-none font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-black block">{isRtl ? "💡 كيف تحصل على أرباحك؟" : "💡 Comment fonctionne la rémunération ?"}</span>
              <p className="text-[11px] leading-relaxed">
                {isRtl
                  ? "تُضاف العمولات تلقائياً إلى محفظتك الرقمية في الموقع فور تأكيد وطباعة الطلب، ويمكنك سحبها نقداً عبر بريدي موب أو استخدامها في طباعة أعمالك مجاناً."
                  : "Vos gains sont crédités automatiquement sur votre solde portefeuille et transférables via BaridiMob."}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-amber-600/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>{isRtl ? "جاري الإرسال..." : "Envoi en cours..."}</span>
              ) : (
                <>
                  <Upload size={16} />
                  <span>{isRtl ? "إرسال القالب للاعتماد والربح" : "Soumettre le Gabarit"}</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
