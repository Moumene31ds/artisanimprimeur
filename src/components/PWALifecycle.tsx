"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  registerServiceWorker,
  onServiceWorkerUpdate,
  applyServiceWorkerUpdate,
  registerPeriodicSync,
  triggerSyncNow,
  isOnline,
} from "@/lib/pwa";

// -----------------------------------------------
// PWALifecycle — دورة حياة التطبيق (PWA)
// -----------------------------------------------
// 1) تسجيل السيرفس ووركر عند بدء التطبيق (كل الزوار) — أوفلاين + إشعارات.
// 2) كشف التحديثات الجديدة وعرض "تحديث الآن" ثم إعادة التحميل.
// 3) كشف الاتصال بالإنترنت: شريط "غير متصل" أعلى الشاشة + إعادة مزامنة عند عودة الشبكة.
// 4) تفعيل المزامنة الدورية (Periodic Background Sync).

export default function PWALifecycle() {
  const { language } = useAppStore();
  const isRtl = language === "ar";
  const [offline, setOffline] = useState(false);
  const [pendingReload, setPendingReload] = useState(false);

  useEffect(() => {
    // 1) تسجيل السيرفس ووركر
    registerServiceWorker().then((reg) => {
      if (reg) {
        registerPeriodicSync();
      }
    });

    // 2) مراقبة التحديثات
    const unsubscribeUpdate = onServiceWorkerUpdate((hasUpdate) => {
      if (!hasUpdate) return;
      toast.info(isRtl ? "تحديث جديد متاح" : "Mise à jour disponible", {
        description: isRtl
          ? "نسخة محسّنة من التطبيق جاهزة."
          : "Une nouvelle version de l'application est prête.",
        duration: 15000,
        action: {
          label: isRtl ? "تحديث الآن" : "Mettre à jour",
          onClick: async () => {
            setPendingReload(true);
            await applyServiceWorkerUpdate();
            setTimeout(() => window.location.reload(), 350);
          },
        },
      });
    });

    // 3) حالة الاتصال
    const applyStatus = () => setOffline(!isOnline());
    applyStatus();
    window.addEventListener("online", applyStatus);
    window.addEventListener("offline", applyStatus);

    // عند عودة الشبكة: أعد مزامنة البيانات مع الخادم.
    const onReconnect = () => {
      if (isOnline()) {
        triggerSyncNow("home").catch(() => {});
      }
    };
    window.addEventListener("online", onReconnect);

    return () => {
      unsubscribeUpdate();
      window.removeEventListener("online", applyStatus);
      window.removeEventListener("offline", applyStatus);
      window.removeEventListener("online", onReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* شريط "غير متصل" */}
      <AnimatePresence>
        {offline && !pendingReload && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-center py-2 px-4 text-[11px] font-black shadow-lg flex items-center justify-center gap-2"
            role="status"
          >
            <CloudOff size={14} className="shrink-0" />
            {isRtl
              ? "أنت غير متصل بالإنترنت — التطبيق يعمل حالياً من النسخة المحفوظة."
              : "Hors-ligne — l'application fonctionne avec les données en cache."}
            <Wifi size={14} className="shrink-0 opacity-60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* مؤشر جارٍ التحديث */}
      <AnimatePresence>
        {pendingReload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3 text-white">
              <RefreshCw size={28} className="animate-spin text-accent" />
              <p className="text-xs font-black">{isRtl ? "جارٍ التحديث…" : "Mise à jour…"}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
