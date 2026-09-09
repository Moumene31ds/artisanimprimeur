"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import ProductCard from "@/components/ProductCard";
import LargeFormatCalculator from "@/components/LargeFormatCalculator";
import { getCatalogProducts, CatalogProduct } from "@/lib/catalog";
import { Search, Grid, CreditCard, FileText, Gift, Maximize2, Package, Sparkles } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ServicesPage() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"catalog" | "calculator">("catalog");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    setMounted(true);
    const loadCatalog = async () => {
      try {
        const fetched = await getCatalogProducts();
        setProducts(fetched);
      } catch (e) {
        console.error("Error loading products:", e);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadCatalog();
  }, []);

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";

  const categories = useMemo(() => [
    { id: "all", name: t.all, icon: Grid },
    { id: "Cartes", name: t.catCards, icon: CreditCard },
    { id: "Flyers", name: t.catFlyers, icon: FileText },
    { id: "Goodies", name: t.catGoodies, icon: Gift },
    { id: "Impression", name: isRtl ? "مطبوعات وبوسترات" : "Impression & Affiches", icon: FileText },
  ], [t, isRtl]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === "all" || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  if (!mounted) return null;

  return (
    <div
      className={`animate-fadeIn pb-24 max-w-7xl mx-auto px-4 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pt-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            {isRtl ? "خدمات ومنتجات لارتيزان" : "Nos Services & Produits"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            {isRtl ? "كتالوج المطبوعات والتسعير" : "Catalogue & Devis en Ligne"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRtl
              ? "اختر من منتجاتنا المميزة أو استخدم الحاسبة الذكية لتسعير اللافتات بالمقاس الحر."
              : "Parcourez nos impressions ou configurez vos enseignes grand format sur-mesure."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300/50 dark:border-slate-700/50 self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "catalog"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Package size={16} />
            {isRtl ? "الكتالوج الجاهز" : "Catalogue Produits"}
          </button>
          <button
            onClick={() => setActiveTab("calculator")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "calculator"
                ? "bg-accent text-white shadow-md shadow-accent/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Maximize2 size={16} />
            {isRtl ? "حاسبة الطباعة الكبيرة" : "Grand Format Sur-Mesure"}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "catalog" ? (
          <motion.div
            key="catalog"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 pr-4 bg-white/70 dark:bg-slate-900/60 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-accent border border-slate-200/80 dark:border-slate-800 transition-all font-medium text-sm sm:text-base text-slate-900 dark:text-white"
              />
              <Search className={`absolute ${isRtl ? "right-4" : "left-4"} top-4 text-slate-400`} size={20} />
            </div>

            {/* Categories scrollbar */}
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all border ${
                      isActive
                        ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                        : "bg-white/60 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={16} /> {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            ) : (
              <div className="ios-glass p-12 rounded-3xl text-center border border-white/60 dark:border-white/10 mt-8">
                <Search size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {isRtl ? "لا توجد نتائج" : "Aucun produit trouvé"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {isRtl ? "لم نتمكن من العثور على منتجات تطابق بحثك." : "Essayez avec d'autres mots clés."}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="calculator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <LargeFormatCalculator />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
