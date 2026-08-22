"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Heart, User, Bell } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { triggerHapticFeedback } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useAppStore();
  const isRtl = language === 'ar';
  const { unreadCount } = useNotifications({ limitCount: 30, toastOnNew: false });
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setHidden((prev) => {
          const next = y > lastScrollY.current && y > 120;
          return next !== prev ? next : prev;
        });
        lastScrollY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { icon: Home, label: isRtl ? "الرئيسية" : "Accueil", href: "/" },
    { icon: LayoutGrid, label: isRtl ? "خدماتنا" : "Services", href: "/services" },
    { icon: Heart, label: isRtl ? "المفضلة" : "Favoris", href: "/favorites" },
    { icon: Bell, label: isRtl ? "الإشعارات" : "Notifications", href: "/notifications", badge: unreadCount },
    { icon: ShoppingBag, label: isRtl ? "السلة" : "Panier", href: "/cart" },
    { icon: User, label: isRtl ? "بروفيلي" : "Profil", href: "/profile" },
  ];

  return (
    <motion.div
      animate={{ y: hidden ? 110 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 premium-glass h-[76px] pb-safe border-t border-white/20 dark:border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
    >
      <div className="flex justify-around items-center h-full px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onClick={() => { try { triggerHapticFeedback('light'); } catch (e) {} }}
              className="relative flex flex-col items-center justify-center w-full h-full group"
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute top-0 w-12 h-1 bg-accent rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.5)]"
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.82 }}
                animate={isActive ? { y: -2 } : { y: 0 }}
                className={`relative p-2 rounded-2xl transition-colors duration-300 ${isActive ? "text-accent bg-accent/10" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </motion.div>
              <span className={`text-[10px] mt-1 font-bold transition-colors ${isActive ? "text-accent" : "text-slate-400 dark:text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
