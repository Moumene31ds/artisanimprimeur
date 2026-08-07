"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, Wifi, Sparkles, Rocket, X, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  registerServiceWorker,
  onServiceWorkerUpdate,
  watchControllerChange,
  onServiceWorkerMessage,
  applyServiceWorkerUpdate,
  checkForUpdates,
  pollForUpdates,
  getBuildInfo,
  getLastSeenBuild,
  markBuildSeen,
  registerPeriodicSync,
  triggerSyncNow,
  isOnline,
  SHOW_UPDATE_EVENT,
  type BuildInfo,
} from "@/lib/pwa";

// -----------------------------------------------
// PWALifecycle — دورة حياة التطبيق الفائقة (PWA)
// -----------------------------------------------
// - شاشة التحديث تظهر **فقط** عند وجود تحديث حقيقي:
//   1) اكتشف السيرفس ووركر نسخة جديدة (updatefound/installed).
//   2) قارن نسخة الخادم (build-info) مع آخر نسخة شاهدها المستخدم
//      (localStorage) — إن كانت نفسها نمرّر ولا نزعج المستخدم.
//   3) اعرض اللوحة مع الميزات الجديدة لهذا الإصدار (عربية/فرنسية).
//   4) "تحديث الآن" → تطبيق فوري + شاشة إعادة تحميل متدرجة.
//   5) "لاحقاً" → نُخزّن الإصدار ولا نعاود العرض لنفس الإصدار،
//      مع تحديث تلقائي صامت عند العودة للتطبيق (إن لم يُرفض صراحة).
// -----------------------------------------------

const AUTO_UPDATE_AFTER_MS = 45 * 1000;
const RELOADED_FLAG = "pwa-updated-reloaded";

interface UpdateInfo {
  buildId: string;
  release: string;
  features: { ar: string[]; fr: string[] };
}

export default function PWALifecycle() {
  const { language } = useAppStore();
  const isRtl = language === "ar";

  const [offline, setOffline] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [reloading, setReloading] = useState(false);
  const [reloadStage, setReloadStage] = useState(0);

  const updateInfoRef = useRef<UpdateInfo | null>(null);
  const pendingSinceRef = useRef(0);
  const dismissedRef = useRef(false);
  const requestedReloadRef = useRef(false);
  const reloadingRef = useRef(false);

  const applyUpdate = useCallback(() => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    setReloading(true);
    setReloadStage(0);
    requestedReloadRef.current = true;
    if (updateInfoRef.current) markBuildSeen(updateInfoRef.current.buildId);
    applyServiceWorkerUpdate().catch(() => {});
    // خطة احتياطية: إن لم يعمل controllerchange، أعد التحميل بعد مهلة.
    setTimeout(() => {
      if (requestedReloadRef.current) {
        try {
          sessionStorage.setItem(RELOADED_FLAG, "1");
        } catch {
          /* ignore */
        }
        window.location.reload();
      }
    }, 4000);
  }, []);

  const applyUpdateRef = useRef(applyUpdate);
  applyUpdateRef.current = applyUpdate;

  // إشعار "تم التحديث" عند الوصول بعد إعادة تحميل من التحديث.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(RELOADED_FLAG)) {
        sessionStorage.removeItem(RELOADED_FLAG);
        const t = setTimeout(() => {
          toast.success(
            isRtl ? "تم تحديث التطبيق إلى أحدث إصدار ✓" : "Application mise à jour ✓",
            { duration: 3000 }
          );
        }, 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 1) التسجيل + المزامنة الدورية
    registerServiceWorker().then((reg) => {
      if (reg) registerPeriodicSync();
    });

    // 2) كشف تحديث حقيقي: قارن نسخة الخادم مع آخر نسخة شوهدت.
    const handleUpdateDetected = async () => {
      const info = await getBuildInfo();
      if (!info?.version) return;
      const lastSeen = getLastSeenBuild();
      // نفس النسخة شوهدت/طبّقت/رُفضت سابقاً → لا إزعاج.
      if (lastSeen === info.version) return;

      const next: UpdateInfo = {
        buildId: info.version,
        release: info.release || info.version,
        features: info.features || { ar: [], fr: [] },
      };
      pendingSinceRef.current = Date.now();
      dismissedRef.current = false;
      updateInfoRef.current = next;
      setUpdateInfo(next);
    };

    const unsubUpdate = onServiceWorkerUpdate(() => {
      handleUpdateDetected();
    });

    // 3) عند سيطرة نسخة جديدة (بعد SKIP_WAITING أو تحديث خارجي)
    const unsubController = watchControllerChange(() => {
      if (requestedReloadRef.current) {
        requestedReloadRef.current = false;
        reloadingRef.current = false;
        window.location.reload();
        return;
      }
      // تحديث خارجي (نافذة أخرى) → إعادة تحميل تلقائية.
      try {
        sessionStorage.setItem(RELOADED_FLAG, "1");
      } catch {
        /* ignore */
      }
      window.location.reload();
    });

    // 4) استقبال رسائل السيرفس ووركر
    const unsubMessage = onServiceWorkerMessage((data) => {
      if (data?.type === "NEW_VERSION_ACTIVATED") {
        setUpdateInfo(null);
        setReloading(false);
        reloadingRef.current = false;
      }
    });

    // 5) فحص دوري آلي + فحص عند عودة الصفحة للواجهة
    const stopPoll = pollForUpdates(5 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      checkForUpdates().catch(() => {});
      // تحديث تلقائي صامت بعد مهلة — فقط إن لم يرفضه المستخدم صراحةً.
      const pending = updateInfoRef.current;
      if (
        pending &&
        !dismissedRef.current &&
        pendingSinceRef.current > 0 &&
        Date.now() - pendingSinceRef.current > AUTO_UPDATE_AFTER_MS
      ) {
        applyUpdateRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 6) حالة الاتصال + إعادة المزامنة عند العودة
    const applyStatus = () => setOffline(!isOnline());
    applyStatus();
    window.addEventListener("online", applyStatus);
    window.addEventListener("offline", applyStatus);

    const onReconnect = () => {
      if (isOnline()) {
        triggerSyncNow("home").catch(() => {});
        checkForUpdates().catch(() => {});
      }
    };
    window.addEventListener("online", onReconnect);

    return () => {
      unsubUpdate();
      unsubController();
      unsubMessage();
      stopPoll();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", applyStatus);
      window.removeEventListener("offline", applyStatus);
      window.removeEventListener("online", onReconnect);
    };
  }, []);

  const dismissUpdate = () => {
    dismissedRef.current = true;
    if (updateInfoRef.current) markBuildSeen(updateInfoRef.current.buildId);
    updateInfoRef.current = null;
    setUpdateInfo(null);
  };

  // إظهار فوري لواجهة التحديث (من التحقق اليدوي في الإعدادات أو أي مصدر آخر).
  useEffect(() => {
    const onShow = (event: Event) => {
      const detail = (event as CustomEvent).detail as BuildInfo | undefined;
      if (!detail?.version) return;
      if (updateInfoRef.current?.buildId === detail.version) return;
      const next: UpdateInfo = {
        buildId: detail.version,
        release: detail.release || detail.version,
        features: detail.features || { ar: [], fr: [] },
      };
      pendingSinceRef.current = Date.now();
      dismissedRef.current = false;
      updateInfoRef.current = next;
      setUpdateInfo(next);
    };
    window.addEventListener(SHOW_UPDATE_EVENT, onShow);
    return () => window.removeEventListener(SHOW_UPDATE_EVENT, onShow);
  }, []);

  const features = updateInfo ? (isRtl ? updateInfo.features.ar : updateInfo.features.fr) : [];

  // تقدم شريط إعادة التحميل (محاكاة مراحل سلسة).
  useEffect(() => {
    if (!reloading) return;
    const interval = setInterval(() => {
      setReloadStage((s) => (s < 100 ? s + 8 : 100));
    }, 120);
    return () => clearInterval(interval);
  }, [reloading]);

  return (
    <>
      {/* شريط "غير متصل" — مع احترام منطقة الأمان العلوية */}
      <AnimatePresence>
        {offline && !reloading && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -48, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-center py-2 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] text-[11px] font-black shadow-lg flex items-center justify-center gap-2"
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

      {/* لوحة "نسخة جديدة متاحة" — تظهر فقط عند وجود تحديث حقيقي */}
      <AnimatePresence>
        {updateInfo && !reloading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={dismissUpdate}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 shadow-2xl border border-white/40 dark:border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ترويسة متدرجة متحركة */}
              <div className="relative h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
                <div className="absolute inset-0 opacity-30 animate-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.6),transparent_50%)]" />
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
                  className="absolute top-5 right-5 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center"
                >
                  <Sparkles size={30} className="text-amber-300" />
                </motion.div>
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
                    {isRtl ? "تحديث التطبيق" : "Mise à jour"}
                  </p>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {isRtl ? "نسخة جديدة محسّنة جاهزة 🚀" : "Une nouvelle version est prête 🚀"}
                  </h3>
                </div>
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/25 backdrop-blur px-2.5 py-1 rounded-full">
                  <Rocket size={11} className="text-cyan-300" />
                  <span className="text-[10px] font-black text-white">
                    v{updateInfo.release}
                  </span>
                </div>
              </div>

              <button
                onClick={dismissUpdate}
                className="absolute top-3 left-3 z-10 p-1.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-full transition-colors"
                aria-label={isRtl ? "إغلاق" : "Fermer"}
              >
                <X size={14} className="text-white" />
              </button>

              <div className="p-5">
                {/* الميزات الجديدة لهذا الإصدار */}
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500 dark:text-blue-400 mb-2">
                  {isRtl ? "✨ الميزات الجديدة" : "✨ Nouveautés"}
                </p>
                <div className="space-y-2 mb-5 max-h-40 overflow-y-auto">
                  {(features.length
                    ? features
                    : [
                        isRtl
                          ? "أداء محسّن وميزات جديدة"
                          : "Performances améliorées et nouveautés",
                        isRtl
                          ? "إصلاح الأخطاء وثبات أكبر"
                          : "Corrections de bugs et stabilité",
                      ]
                  ).map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                      className="flex items-center gap-3 text-[12px] font-bold text-slate-700 dark:text-slate-300"
                    >
                      <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        {i === 0 ? <Zap size={15} /> : <Check size={15} />}
                      </span>
                      {f}
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={applyUpdate}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    <Rocket size={16} />
                    {isRtl ? "تحديث الآن" : "Mettre à jour maintenant"}
                  </motion.button>
                  <button
                    onClick={dismissUpdate}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isRtl ? "لاحقاً" : "Plus tard"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شاشة إعادة التحميل المتدرجة */}
      <AnimatePresence>
        {reloading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-md flex items-center justify-center"
            role="status"
          >
            <div className="flex flex-col items-center gap-5 max-w-xs text-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500 to-purple-500 animate-pulse opacity-70 blur-md" />
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl">
                  <Sparkles size={34} className="text-white" />
                </div>
              </div>
              <p className="text-sm font-black text-white">
                {isRtl ? "جارٍ تحديث التطبيق…" : "Mise à jour de l'application…"}
              </p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${reloadStage}%` }}
                  transition={{ ease: "easeOut", duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-full"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400">
                {isRtl ? "ثوانٍ معدودة وسنعود فوراً ✨" : "Quelques secondes, on revient ✨"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
