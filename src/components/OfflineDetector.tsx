"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";

export default function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);
  const { language } = useAppStore();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-xl shadow-red-500/30 font-bold text-sm"
        >
          <WifiOff size={18} className="animate-pulse" />
          {language === 'ar' ? "أنت غير متصل بالإنترنت" : "Vous êtes hors ligne"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

