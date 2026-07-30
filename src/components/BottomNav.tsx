"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Heart, User } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useAppStore();
  const isRtl = language === 'ar';

  const navItems = [
    { icon: Home, label: isRtl ? "الرئيسية" : "Accueil", href: "/" },
    { icon: LayoutGrid, label: isRtl ? "خدماتنا" : "Services", href: "/services" },
    { icon: Heart, label: isRtl ? "المفضلة" : "Favoris", href: "/favorites" },
    { icon: ShoppingBag, label: isRtl ? "السلة" : "Panier", href: "/cart" },
    { icon: User, label: isRtl ? "بروفيلي" : "Profil", href: "/profile" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 premium-glass h-[76px] pb-safe border-t border-white/20 dark:border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-full px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center w-full h-full group">
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute top-0 w-12 h-1 bg-accent rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.5)]"
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? "text-accent bg-accent/10 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] mt-1 font-bold transition-colors ${isActive ? "text-accent" : "text-slate-400 dark:text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
