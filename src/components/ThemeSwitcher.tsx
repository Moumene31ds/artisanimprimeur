// src/components/ThemeSwitcher.tsx

"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion"; // <-- إضافة Framer Motion
import { useAppStore } from "@/lib/store";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const setStoreTheme = useAppStore((s) => s.setTheme);
  const isDark = theme === "dark";

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.08 }}
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        setStoreTheme(next);
      }}
      className="p-2 rounded-full relative flex items-center justify-center
        bg-gradient-to-br from-amber-100 to-orange-200
        dark:from-slate-800 dark:to-indigo-950
        border border-amber-200/60 dark:border-slate-700/60
        shadow-sm dark:shadow-[0_0_12px_rgba(99,102,241,0.25)]
        transition-colors duration-300"
      aria-label="Toggle theme"
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: isDark ? -90 : 90, scale: 0.3, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        {isDark ? (
          <Moon className="h-5 w-5 text-indigo-300" />
        ) : (
          <Sun className="h-5 w-5 text-amber-500" />
        )}
      </motion.div>
    </motion.button>
  );
}
