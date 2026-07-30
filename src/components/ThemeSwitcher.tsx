// src/components/ThemeSwitcher.tsx

"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion"; // <-- إضافة Framer Motion

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }} // <-- تأثير عند الضغط
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:text-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative flex items-center justify-center"
      aria-label="Toggle theme"
    >
      <Sun 
        className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" 
        aria-hidden={theme === 'dark'}
      />
      <Moon 
        className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" 
        aria-hidden={theme === 'light'}
      />
    </motion.button>
  );
}

