"use client";

import { useAppStore } from "@/lib/store";
import { TRANSLATIONS } from "@/lib/translations";
import ProductCard from "@/components/ProductCard";
import { Search, Grid, CreditCard, FileText, Gift } from "lucide-react";
import { useEffect, useState } from "react";

// نفس المنتجات الوهمية (يمكنك نقلها لملف بيانات منفصل لاحقاً أو جلبها من Firebase)
const ALL_PRODUCTS = [
  { id: "p1", name: "Cartes de Visite Premium(100)", price: 2500, image: "https://img.magnific.com/psd-gratuit/modele-conception-carte-visite-professionnelle_47987-19617.jpg?semt=ais_hybrid&w=740&q=80", category: "Cartes" },
  { id: "p2", name: "Flyers Publicitaires (A4)", price: 4500, image: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&q=80&w=800", category: "Flyers" },
  { id: "p3", name: "Stickers Personnalisés", price: 1200, image: "https://lesgommettesfrancaises.com/wp-content/uploads/2024/01/GF506-stickers-joyeux-anniversaire-personnalise-gommettes-francaises.jpg", category: "Goodies" },
  { id: "p4", name: "Affiches (A3)", price: 3000, image: "https://www.procopy.fr/media/products/02-08-affiche-a3-imprimee.jpg", category: "Flyers" },
  { id: "p6", name: "Invitations Mariage", price: 5000, image: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800", category: "Cartes" },
];

export default function ServicesPage() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    setMounted(true);
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
  const filteredProducts = ALL_PRODUCTS.filter(p => {
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
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="ios-glass p-12 rounded-3xl text-center border border-white/60 mt-8">
          <Search size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد نتائج</h3>
          <p className="text-slate-500">لم نتمكن من العثور على منتجات تطابق بحثك.</p>
        </div>
      )}
    </div>
  );
}

