"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Printer, Box, User, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { triggerHapticFeedback } from "@/lib/utils";

interface NavItem {
  icon: typeof Home;
  label: string;
  href: string;
  badge?: number;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { language } = useAppStore();
  const isRtl = language === "ar";
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const { unreadCount } = useNotifications({ limitCount: 30, toastOnNew: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
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
  }, [prefersReducedMotion]);

  const navItems: NavItem[] = [
    { icon: Home, label: isRtl ? "الرئيسية" : "Accueil", href: "/" },
    { icon: Printer, label: isRtl ? "خدماتنا" : "Services", href: "/services" },
    { icon: Box, label: isRtl ? "المعرض" : "Showroom", href: "/showroom" },
    { icon: User, label: isRtl ? "حسابي" : "Profil", href: "/profile", badge: unreadCount },
  ];

  const handleTap = useCallback(() => {
    try { triggerHapticFeedback("light"); } catch {}
  }, []);

  if (!mounted) return null;

  return (
    <motion.nav
      initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
      animate={{ y: hidden ? 100 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      dir={isRtl ? "rtl" : "ltr"}
      role="navigation"
      aria-label={isRtl ? "التنقل الرئيسي" : "Navigation principale"}
      className="md:hidden fixed z-50 left-0 right-0 mx-auto w-fit
        bottom-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass-bottom-nav flex items-center gap-1 px-2 py-1.5 rounded-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const hasBadge = typeof item.badge === "number" && item.badge > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.label}${hasBadge ? ` — ${item.badge} ${isRtl ? "جديد" : "nouveau"}` : ""}`}
              onClick={handleTap}
              className="relative flex flex-col items-center justify-center min-w-[3.25rem] h-12 px-2 rounded-full transition-colors duration-200 active:scale-95 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="glass-bottom-nav-active-pill absolute inset-0 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                whileTap={prefersReducedMotion ? undefined : { scale: 0.82 }}
                animate={isActive ? { y: -1 } : { y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={`relative z-10 flex flex-col items-center justify-center gap-px ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <span className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[8px] font-black rounded-full shadow-md ring-1.5 ring-white dark:ring-slate-900 animate-pulse">
                      {item.badge! > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-none font-semibold transition-opacity duration-200 ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}

        <div className="w-px h-7 bg-gradient-to-b from-transparent via-slate-900/10 to-transparent dark:via-white/10" />

        <motion.button
          whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
          aria-label={isRtl ? "طلب جديد" : "Nouvelle commande"}
          onClick={handleTap}
          className="glass-bottom-nav-fab flex items-center justify-center w-10 h-10 rounded-full select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent shrink-0"
        >
          <Plus size={20} strokeWidth={2.8} className="text-white relative z-10" />
        </motion.button>
      </div>
    </motion.nav>
  );
}
