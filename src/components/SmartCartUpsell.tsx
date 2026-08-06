"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Gift, TrendingUp, ShoppingCart, Check, Package,
  Zap, Award, Truck, Star, Lightbulb
} from "lucide-react";
import { useAppStore, Product } from "@/lib/store";
import { PRICING_TIERS } from "@/lib/pricing";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { auth } from "@/lib/firebase";

const POINTS_PER_100_DA = 1;

interface AiRecommendation extends Product {}

const AI_EMPTY = [] as AiRecommendation[];

const RECOMMENDED_PRODUCTS: Product[] = [
  {
    id: "rec-porte-cartes",
    name: "Porte-cartes Premium",
    price: 1800,
    image: "https://img.magnific.com/psd-gratuit/modele-conception-carte-visite-professionnelle_47987-19617.jpg?semt=ais_hybrid&w=740&q=80",
    category: "Goodies",
  },
  {
    id: "rec-flyers",
    name: "Flyers Publicitaires (A4)",
    price: 4500,
    image: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&q=80&w=800",
    category: "Flyers",
  },
  {
    id: "rec-affiches",
    name: "Affiches (A3) Grand Format",
    price: 3000,
    image: "https://www.procopy.fr/media/products/02-08-affiche-a3-imprimee.jpg",
    category: "Flyers",
  },
  {
    id: "rec-stickers",
    name: "Stickers Personnalisés",
    price: 1200,
    image: "https://lesgommettesfrancaises.com/wp-content/uploads/2024/01/GF506-stickers-joyeux-anniversaire-personnalise-gommettes-francaises.jpg",
    category: "Goodies",
  },
  {
    id: "rec-rollup",
    name: "Roll-up Stand XXL",
    price: 6500,
    image: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800",
    category: "Flyers",
  },
  {
    id: "rec-invitations",
    name: "Invitations Mariage Luxe",
    price: 5000,
    image: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800",
    category: "Cartes",
  },
];

const KEYWORD_MAP: Record<string, string[]> = {
  "carte": ["rec-porte-cartes", "rec-flyers"],
  "flyer": ["rec-affiches", "rec-stickers"],
  "sticker": ["rec-flyers", "rec-rollup"],
  "affiche": ["rec-flyers", "rec-stickers"],
  "invitation": ["rec-flyers", "rec-stickers"],
  "porte-carte": ["rec-flyers", "rec-invitations"],
};

const CATEGORY_MAP: Record<string, string[]> = {
  "Cartes": ["rec-flyers", "rec-stickers"],
  "Flyers": ["rec-affiches", "rec-stickers"],
  "Goodies": ["rec-flyers", "rec-rollup"],
};

interface BundleDeal {
  id: string;
  titleKey: string;
  descriptionKey: string;
  items: string[];
  savingsPercent: number;
  icon: typeof Gift;
}

const BUNDLE_DEALS: BundleDeal[] = [
  {
    id: "bundle-cartes-flyers",
    titleKey: "bundleCardsFlyers",
    descriptionKey: "bundleCardsFlyersDesc",
    items: ["rec-porte-cartes", "rec-flyers"],
    savingsPercent: 10,
    icon: Gift,
  },
  {
    id: "bundle-flyers-affiches",
    titleKey: "bundleFlyersAffiches",
    descriptionKey: "bundleFlyersAffichesDesc",
    items: ["rec-affiches", "rec-stickers"],
    savingsPercent: 12,
    icon: Package,
  },
  {
    id: "bundle-complete",
    titleKey: "bundleComplete",
    descriptionKey: "bundleCompleteDesc",
    items: ["rec-flyers", "rec-stickers", "rec-rollup"],
    savingsPercent: 15,
    icon: Zap,
  },
];

function findMatchingKeywords(name: string): string[] {
  const lower = name.toLowerCase();
  const found: string[] = [];
  for (const [keyword, ids] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      found.push(...ids);
    }
  }
  return found;
}

function getRecommendationIds(cart: Product[]): string[] {
  const idSet = new Set<string>();
  const cartIds = new Set(cart.map((c) => String(c.id)));

  for (const item of cart) {
    const keywordRecs = findMatchingKeywords(item.name);
    for (const id of keywordRecs) {
      if (!cartIds.has(id) && !idSet.has(id)) {
        idSet.add(id);
      }
    }

    const cat = item.category || "";
    const catRecs = CATEGORY_MAP[cat] || [];
    for (const id of catRecs) {
      if (!cartIds.has(id) && !idSet.has(id) && idSet.size < 4) {
        idSet.add(id);
      }
    }
  }

  return Array.from(idSet).slice(0, 4);
}

function getActiveBundles(cart: Product[], dismissed: string[]): BundleDeal[] {
  const cartNames = new Set(cart.map((i) => i.name.toLowerCase()));
  const cartCategories = new Set(cart.map((i) => i.category?.toLowerCase() || ""));

  return BUNDLE_DEALS.filter((b) => {
    if (dismissed.includes(b.id)) return false;
    const hasCartes = cartCategories.has("cartes") || cartNames.has("carte");
    const hasFlyers = cartCategories.has("flyers") || [...cartNames].some((n) => n.includes("flyer"));
    const hasAffiches = [...cartNames].some((n) => n.includes("affiche"));

    if (b.id === "bundle-cartes-flyers" && hasCartes) return true;
    if (b.id === "bundle-flyers-affiches" && (hasFlyers || hasAffiches)) return true;
    if (b.id === "bundle-complete" && hasFlyers) return true;

    return false;
  });
}

function getNextTierInfo(currentTotalQty: number): {
  nextQty: number;
  nextDiscount: number;
  needed: number;
} | null {
  const sorted = [...PRICING_TIERS].sort((a, b) => a.minQty - b.minQty);
  const next = sorted.find((t) => t.minQty > currentTotalQty);
  if (!next) return null;
  return {
    nextQty: next.minQty,
    nextDiscount: next.discountPercent,
    needed: next.minQty - currentTotalQty,
  };
}

function getBundleTranslations(isRtl: boolean) {
  if (isRtl) {
    return {
      recommendationsTitle: "توصيات ذكية",
      recommendationsSub: "أضف منتجات مكملة لطلبك",
      addToCart: "أضف",
      added: "تمت الإضافة ✓",
      bundleTitle: "عروض الحزمة",
      bundleSub: "أكمل مجموعتك ووفر أكثر",
      bundleSave: "توفير",
      bundleAdd: "أضف الحزمة",
      bundleAdded: "تمت الإضافة ✓",
      qtyTitle: "نصائح الكمية الذكية",
      qtySub: "وفر أكثر بزيادة الكمية",
      qtyTip: "هل تعلم؟",
      qtyMessage: "زيادة الكمية إلى",
      qtySave: "ستوفر",
      pointsTitle: "نقاط الولاء",
      pointsSub: "النقاط المكتسبة من هذا الطلب",
      pointsLabel: "نقطة",
      earnMore: "اكسب المزيد",
      pickupTitle: "استلام من المطبعة",
      pickupSub: "حيّ العقيد لطفي، وهران",
      pickupFree: "مجاني",
      pickupComingSoon: "التوصيل إلى المنزل قريباً",
      summaryTitle: "ملخص الطلب الذكي",
      nextTierTitle: "الخصم التالي",
      nextTierDesc: "اشترِ",
      nextTierDesc2: "قطعة إضافية للحصول على خصم",
      noRecommendations: "تصفح جميع خدماتنا",
      currency: "د.ج",
      bundleCardsFlyers: "بطاقات + مطبوعات",
      bundleCardsFlyersDesc: "احصل على بطاقات عمل مع منشورات إعلانية بسعر مخفض",
      bundleFlyersAffiches: "إعلانات متكاملة",
      bundleFlyersAffichesDesc: "منشورات + ملصقات إعلانية بتصميم متناسق",
      bundleComplete: "حزمة التسويق الكاملة",
      bundleCompleteDesc: "منشورات + ملصقات + رول أب لكل احتياجاتك الدعائية",
    };
  }
  return {
    recommendationsTitle: "Recommandations IA",
    recommendationsSub: "Ajoutez des produits complémentaires",
    addToCart: "Ajouter",
    added: "Ajouté ✓",
    bundleTitle: "Offres Groupées",
    bundleSub: "Complétez votre set et économisez",
    bundleSave: "Économisez",
    bundleAdd: "Ajouter le pack",
    bundleAdded: "Ajouté ✓",
    qtyTitle: "Astuces Quantité",
    qtySub: "Économisez en augmentant la quantité",
    qtyTip: "Le saviez-vous ?",
    qtyMessage: "Passez à",
    qtySave: "vous économisez",
    pointsTitle: "Points Fidélité",
    pointsSub: "Points gagnés avec cette commande",
    pointsLabel: "pts",
    earnMore: "Gagnez plus",
    pickupTitle: "Retrait à l'atelier",
    pickupSub: "Cité Akid Lotfi, Oran",
    pickupFree: "Gratuit",
    pickupComingSoon: "Livraison à domicile bientôt",
    summaryTitle: "Résumé Intelligent",
    nextTierTitle: "Paller suivant",
    nextTierDesc: "Ajoutez",
    nextTierDesc2: "pièce(s) pour",
    noRecommendations: "Voir tous nos services",
    currency: "DA",
    bundleCardsFlyers: "Cartes + Flyers",
    bundleCardsFlyersDesc: "Cartes de visite + Flyers publicitaires à prix réduit",
    bundleFlyersAffiches: "Pub Complète",
    bundleFlyersAffichesDesc: "Flyers + Affiches publicitaires coordonnées",
    bundleComplete: "Pack Marketing Complet",
    bundleCompleteDesc: "Flyers + Affiches + Roll-up pour tous vos besoins promo",
  };
}

function getCartSummary(cart: Product[]) {
  const totalQty = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const subtotal = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const points = Math.floor(subtotal / 100) * POINTS_PER_100_DA;
  const nextTier = getNextTierInfo(totalQty);
  return { subtotal, points, nextTier, totalQty };
}

export default function SmartCartUpsell({ cart }: { cart: Product[] }) {
  const language = useAppStore((state) => state.language);
  const addToCart = useAppStore((state) => state.addToCart);
  const [dismissedDeals, setDismissedDeals] = useState<string[]>([]);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [aiRecs, setAiRecs] = useState<AiRecommendation[]>(AI_EMPTY);
  const [aiSource, setAiSource] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const isRtl = language === "ar";
  const t = getBundleTranslations(isRtl);

  // جلب توصيات الذكاء الاصطناعي (Ollama → OpenRouter) بتأخير قصير مع حماية
  // من التكرار؛ وأي فشل لا يكسر الصفحة — تبقى التوصيات الكلاسيكية تعمل.
  useEffect(() => {
    if (cart.length === 0) {
      setAiRecs(AI_EMPTY);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setAiLoading(true);
      try {
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : undefined;
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart: cart.map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category,
              quantity: c.quantity || 1,
            })),
            lang: isRtl ? "ar" : "fr",
            token,
          }),
        });
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.recommendations)) {
          setAiRecs(
            data.recommendations.map((r: any) => ({
              id: String(r.id),
              name: r.name || "Produit",
              price: Number(r.price) || 0,
              image: r.image || "",
              category: r.category || "",
            }))
          );
          setAiSource(data.source === "ai");
        }
      } catch {
        /* الحفاظ على التوصيات الكلاسيكية عند أي خطأ */
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [cart, isRtl]);

  const recommendationIds = useMemo(() => getRecommendationIds(cart), [cart]);
  const staticRecommendations = useMemo(
    () => RECOMMENDED_PRODUCTS.filter((p) => recommendationIds.includes(String(p.id))),
    [recommendationIds]
  );
  // توصيات AI أولاً، ثم كلاسيكية غير مكررة — حتى 4 إجمالاً
  const recommendations = useMemo(() => {
    const merged: Product[] = [];
    const seen = new Set<string>();
    for (const r of aiRecs) {
      if (!seen.has(String(r.id))) {
        seen.add(String(r.id));
        merged.push(r);
      }
    }
    for (const p of staticRecommendations) {
      if (!seen.has(String(p.id)) && merged.length < 4) {
        seen.add(String(p.id));
        merged.push(p);
      }
    }
    return merged.slice(0, 4);
  }, [aiRecs, staticRecommendations]);
  const activeBundles = useMemo(
    () => getActiveBundles(cart, dismissedDeals),
    [cart, dismissedDeals]
  );
  const summary = useMemo(() => getCartSummary(cart), [cart]);

  const handleAddRecommendation = (product: Product) => {
    addToCart({ ...product, quantity: 1 });
    setAddingIds((prev) => new Set(prev).add(String(product.id)));
    toast.success(isRtl ? `تمت إضافة ${product.name}` : `${product.name} ajouté`);
    setTimeout(() => {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(String(product.id));
        return next;
      });
    }, 2000);
  };

  const handleAddBundle = (bundle: BundleDeal) => {
    bundle.items.forEach((id) => {
      const product = RECOMMENDED_PRODUCTS.find((p) => p.id === id);
      if (product) {
        addToCart({ ...product, quantity: 1 });
      }
    });
    setDismissedDeals((prev) => [...prev, bundle.id]);
    toast.success(isRtl ? "تمت إضافة الحزمة بنجاح!" : "Pack ajouté avec succès !");
  };

  if (cart.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 mb-6"
    >
      {/* Points & Retrait Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-white/10"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Award size={16} />
          </div>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {t.summaryTitle}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Star size={12} className="text-amber-500" fill="currentColor" />
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {t.pointsTitle}
              </span>
            </div>
            <p className="text-lg font-black text-amber-700 dark:text-amber-300">
              +{summary.points}{" "}
              <span className="text-xs font-bold opacity-75">{t.pointsLabel}</span>
            </p>
            <p className="text-[9px] text-amber-500/70 font-semibold mt-0.5">{t.pointsSub}</p>
          </div>

          <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck size={12} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {t.pickupTitle}
              </span>
            </div>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
              {t.pickupFree}
            </p>
            <p className="text-[9px] text-emerald-500/70 font-semibold mt-0.5">{t.pickupSub}</p>
          </div>
        </div>

        <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-800/30 rounded-2xl flex items-center gap-2">
          <Zap size={14} className="text-cyan-500 shrink-0" />
          <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 leading-relaxed">
            {t.pickupComingSoon} 🚀
          </p>
        </div>

        {summary.nextTier && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-2xl flex items-center gap-2"
          >
            <TrendingUp size={14} className="text-indigo-500 shrink-0" />
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed">
              {isRtl
                ? `${t.nextTierDesc} ${summary.nextTier.needed} ${t.nextTierDesc2} ${summary.nextTier.nextDiscount}%!`
                : `${t.nextTierDesc} ${summary.nextTier.needed} ${t.nextTierDesc2} ${summary.nextTier.nextDiscount}% de réduction !`}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* AI Recommendations */}
      <AnimatePresence>
        {recommendations.length > 0 && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-white/10"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-accent/10 text-accent rounded-xl">
                <Sparkles size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  {t.recommendationsTitle}
                  {aiLoading ? (
                    <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded-md animate-pulse">
                      IA…
                    </span>
                  ) : aiSource ? (
                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">
                      IA
                    </span>
                  ) : null}
                </h4>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  {t.recommendationsSub}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {recommendations.map((product, idx) => {
                const isAdding = addingIds.has(String(product.id));
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-center gap-3 p-2.5 bg-white/50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-accent/30 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-[11px] font-black text-accent mt-0.5">
                        {product.price} {t.currency}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddRecommendation(product)}
                      disabled={isAdding}
                      className={`shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        isAdding
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-900 dark:bg-accent text-white hover:shadow-lg"
                      }`}
                    >
                      {isAdding ? (
                        <span className="flex items-center gap-1">
                          <Check size={12} /> {t.added}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ShoppingCart size={12} /> {t.addToCart}
                        </span>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bundle Deals */}
      <AnimatePresence>
        {activeBundles.length > 0 && (
          <motion.div
            key="bundles"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="premium-glass p-5 rounded-[2rem] border border-white/60 dark:border-white/10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/5 to-transparent rounded-bl-[100%] pointer-events-none" />

            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                <Gift size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
                  {t.bundleTitle}
                </h4>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  {t.bundleSub}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {activeBundles.map((bundle) => {
                const BundleIcon = bundle.icon;
                const bundleProducts = bundle.items
                  .map((id) => RECOMMENDED_PRODUCTS.find((p) => p.id === id))
                  .filter(Boolean) as Product[];
                const totalWithoutDiscount = bundleProducts.reduce(
                  (s, p) => s + p.price,
                  0
                );
                const savings = Math.round(
                  (totalWithoutDiscount * bundle.savingsPercent) / 100
                );

                return (
                  <motion.div
                    key={bundle.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/10 rounded-2xl border border-purple-200/50 dark:border-purple-800/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                        <BundleIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white">
                          {t[bundle.titleKey as keyof typeof t]}
                        </p>
                        <p className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                          {t[bundle.descriptionKey as keyof typeof t]}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {bundleProducts.map((p) => (
                            <div
                              key={p.id}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700"
                            >
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          <span className="text-[10px] font-bold text-slate-400 mx-1">+</span>
                          <span className="text-[10px] font-black text-purple-600 dark:text-purple-400">
                            {totalWithoutDiscount - savings} {t.currency}
                          </span>
                          <span className="text-[9px] text-slate-400 line-through">
                            {totalWithoutDiscount} {t.currency}
                          </span>
                          <span className="text-[8px] font-black bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md">
                            -{bundle.savingsPercent}%
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddBundle(bundle)}
                        className="shrink-0 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
                      >
                        <span className="flex items-center gap-1">
                          <Check size={11} /> {t.bundleAdd}
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Quantity Suggestions */}
      {summary.nextTier && summary.nextTier.needed <= 50 && summary.nextTier.needed > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="premium-glass p-4 rounded-[2rem] border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/5"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Lightbulb size={16} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                  {t.qtyTip}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                {isRtl
                  ? `${t.qtyMessage} ${summary.nextTier.nextQty} قطعة → خصم ${summary.nextTier.nextDiscount}%! ${t.qtySave} ${(summary.subtotal * summary.nextTier.nextDiscount) / 100} ${t.currency}`
                  : `${t.qtyMessage} ${summary.nextTier.nextQty} pièces → ${summary.nextTier.nextDiscount}% de réduction ! ${t.qtySave} ${Math.round((summary.subtotal * summary.nextTier.nextDiscount) / 100)} ${t.currency}`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-amber-200 dark:bg-amber-800/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${Math.min(100, (summary.totalQty / summary.nextTier.nextQty) * 100)}%`,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  />
                </div>
                <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {summary.totalQty}/{summary.nextTier.nextQty}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
