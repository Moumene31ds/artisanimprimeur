"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin, CheckCircle, Sparkles } from "lucide-react";

export default function LiveSales() {
  const language = useAppStore((state) => state.language);
  const [latestOrder, setLatestOrder] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const isInitialLoad = useRef(true); // حارس لمنع ظهور الطلبات القديمة عند إنعاش الصفحة

  useEffect(() => {
    // الاستماع لآخر طلب يدخل قاعدة البيانات — فقط عند الحاجة:
    // - لا نبدأ الاستماع إلا بعد خمول الصفحة (لا يعيق التحميل الأول).
    // - نوقف الاستماع عندما تكون النافذة مخفية (خلفية) لتوفير الموارد.
    let unsubscribe: (() => void) | null = null;
    let scheduled = false;

    const subscribe = () => {
      if (unsubscribe || document.visibilityState !== "visible") return;
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) return;

          const orderData = snapshot.docs[0].data();
          const orderId = snapshot.docs[0].id;

          // إذا كان هذا التحميل الأول للموقع، تجاهل الطلب القديم ولا تزعج الزائر
          if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
          }

          setLatestOrder({ id: orderId, ...orderData });
          setShowNotification(true);

          // إخفاء الإشعار تلقائياً بعد 6 ثوانٍ من ظهوره
          setTimeout(() => setShowNotification(false), 6000);
        },
        (err) => {
          console.debug("LiveSales order listener restricted by security rules.", err.message);
        }
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        subscribe();
      } else {
        unsubscribe?.();
        unsubscribe = null;
      }
    };

    // نؤجل بدء الاستماع حتى خمول المتصفح حتى لا يعبّئ تحميل الصفحة الأولى.
    const scheduleStart = () => {
      if (scheduled) return;
      scheduled = true;
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => subscribe());
      } else {
        setTimeout(subscribe, 2000);
      }
    };
    scheduleStart();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe?.();
    };
  }, []);

  if (!latestOrder || !showNotification) return null;

  const isRtl = language === "ar";

  // دالة ذكية لتشفير الاسم لحماية خصوصية العميل (مثال: أحمد ب.)
  const formatName = (fullName: string) => {
    if (!fullName) return isRtl ? "شخص ما" : "Un client";
    const parts = fullName.trim().split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0];
  };

  // جلب اسم أول منتج تم شراؤه للعرض في الإشعار
  const firstItemName = latestOrder.items?.[0]?.name || (isRtl ? "منتج مميز" : "Un produit");
  const itemsCount = latestOrder.items?.length || 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`fixed bottom-[76px] md:bottom-6 ${
          isRtl ? "left-4" : "right-4"
        } z-[999] max-w-sm w-[calc(100dvw-2rem)] ios-glass border border-white/40 dark:border-white/10 rounded-[2rem] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-4`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* تأثير التوهج النيون الخلفي الصغير */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-[2rem] blur-xl -z-10 animate-pulse" />

        {/* أيقونة الحقيبة المتفاعلة بنبضات خضراء */}
        <div className="relative flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/30 animate-ping opacity-75"></span>
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShoppingBag size={20} className="animate-pulse" />
          </div>
        </div>

        {/* تفاصيل الطلب الاحترافية */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-black text-slate-800 dark:text-white truncate">
              {formatName(latestOrder.customerName)}
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
              <CheckCircle size={10} /> {isRtl ? "طلب مؤكد" : "Confirmé"}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
            {isRtl ? "قام بشراء: " : "A acheté: "}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {firstItemName} {itemsCount > 1 ? `(+${itemsCount - 1})` : ""}
            </span>
          </p>

          {/* موقع الزبون والتوقيت الحيوّي */}
          <div className="flex items-center justify-between mt-1.5 text-[9px] font-bold text-slate-400">
            <span className="flex items-center gap-0.5 text-blue-500 dark:text-blue-400">
              <MapPin size={10} /> {latestOrder.wilaya}
            </span>
            <span className="flex items-center gap-0.5 font-mono text-emerald-500 animate-pulse">
              <Sparkles size={8} /> {isRtl ? "الآن" : "À l'instant"}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
