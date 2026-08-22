"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import ProductCard from "@/components/ProductCard";
import { Search, Grid, CreditCard, FileText, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { getCatalogProducts, type CatalogProduct } from "@/lib/catalog";

export default function ServicesPage() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    getCatalogProducts()
      .then((list) => {
        if (alive) setProducts(list);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!mounted) return null;

  const t = TRANSLATIONS[language];
  const isRtl = language === "ar";

  const categories = [
    { id: 'all', name: t.all, icon: Grid },
    { id: 'Cartes', name: t.catCards, icon: CreditCard },
    { id: 'Flyers', name: t.catFlyers, icon: FileText },
    { id: 'Goodies', name: t.catGoodies, icon: Gift }
  ];

  // تصفية المنتجات بناءً على البحث والتصنيف
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`animate-fadeIn pb-24 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-black text-slate-900 mb-6">{t.services}</h1>

      {/* شريط البحث */}
      <div className="relative mb-6">
        <input 
          type="text" 
          placeholder={t.search} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 pl-12 ios-glass rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-400 border border-white/60 transition-all font-medium"
        />
        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
      </div>

      {/* شريط التصنيفات */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar mb-8 pb-2">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shadow-sm backdrop-blur-md border ${
                isActive 
                  ? 'bg-blue-600/90 text-white border-blue-500 shadow-blue-600/30' 
                  : 'bg-white/60 text-slate-600 border-white/50 hover:bg-white/80 hover:scale-[1.02]'
              }`}
            >
              <Icon size={18} /> {cat.name}
            </button>
          );
        })}
      </div>

      {/* شبكة المنتجات */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ios-glass rounded-3xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="ios-glass p-12 rounded-3xl text-center border border-white/60 mt-8">
          <Search size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            {isRtl ? "لا توجد نتائج" : "Aucun résultat"}
          </h3>
          <p className="text-slate-500">
            {isRtl
              ? "لم نتمكن من العثور على منتجات تطابق بحثك."
              : "Aucun produit ne correspond à votre recherche."}
          </p>
        </div>
      )}
    </div>
  );
}

