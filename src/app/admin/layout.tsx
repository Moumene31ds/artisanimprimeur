"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        setIsAuthorized(true);
      } else {
        // طرد المستخدمين غير المصرح لهم فوراً إلى الصفحة الرئيسية
        router.replace("/");
      }
    }
  }, [isAdmin, loading, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#020617] z-[999] fixed inset-0">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="flex flex-col items-center gap-4 text-slate-800 dark:text-white"
        >
          <ShieldAlert size={64} className="text-accent animate-pulse" />
          <h2 className="text-2xl font-black">Vérification de sécurité...</h2>
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </motion.div>
      </div>
    );
  }

  // إذا كان المستخدم هو attouabdelkarim2@gmail.com، اعرض لوحة التحكم
  return <>{children}</>;
}

