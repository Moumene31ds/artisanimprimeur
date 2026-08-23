"use client";

// ---------------------------------------------------------------------------
// OutboxManager — إدارة طابور الإجراءات غير المتصلة في الواجهة
// ---------------------------------------------------------------------------
// - يعيد إرسال الإجراءات المخزّنة أثناء الأوفلاين فور عودة الاتصال.
// - يسجّل Background Sync (outbox-sync) ليتمت المزامنة حتى لو أُغلق التطبيق.
// - يعرض شارة عائمة بعدد الإجراءات المنتظرة + Toast تأكيد عند اكتمالها.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  getPendingCount,
  getPendingEntries,
  replayOutbox,
  registerBackgroundSync,
  onOutboxCountChange,
} from "@/lib/outbox";

export default function OutboxManager() {
  const language = useAppStore((s) => s.language);
  const isRtl = language === "ar";

  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const replayingRef = useRef(false);

  /** تحديث العدد + تسجيل مزامنة خلفية عند وجود إجراءات. */
  const refresh = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPending(count);
      if (count > 0) await registerBackgroundSync();
    } catch {
      /* ignore */
    }
  }, []);

  /** إعادة المحاولة الفعلية (مع منع التزامن). */
  const tryReplay = useCallback(async () => {
    if (replayingRef.current) return;
    try {
      const count = await getPendingCount();
      if (count === 0) return;
      replayingRef.current = true;
      setSyncing(true);
      const { sent, remaining } = await replayOutbox();
      setPending(remaining);
      if (sent > 0 && remaining === 0) {
        toast.success(
          isRtl
            ? `تم إرسال ${sent} إجراء كان منتظراً الاتصال ✓`
            : `${sent} action(s) en attente envoyée(s) ✓`,
          { duration: 3500 }
        );
      }
    } catch {
      /* ignore */
    } finally {
      replayingRef.current = false;
      setSyncing(false);
    }
  }, [isRtl]);

  useEffect(() => {
    refresh();

    // عودة الاتصال → أعد الإرسال فوراً.
    const onOnline = () => tryReplay();
    window.addEventListener("online", onOnline);

    // رجوع التطبيق للواجهة → إن كانت هناك إجراءات وشبكة متاحة أعد الإرسال.
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) tryReplay();
    };
    document.addEventListener("visibilitychange", onVisible);

    // السيرفس ووركر أنهى مزامنة الخلفية → حدّث الحالة.
    let unsubMsg: (() => void) | undefined;
    if ("serviceWorker" in navigator) {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === "OUTBOX_SYNCED") {
          getPendingEntries().then((entries) => setPending(entries.length));
          if (event.data.sent > 0) {
            toast.success(
              isRtl ? "تمت مزامنة إجراءاتك المتأخرة ✓" : "Vos actions en attente sont synchronisées ✓",
              { duration: 3000 }
            );
          }
        }
      };
      navigator.serviceWorker.addEventListener("message", handler);
      unsubMsg = () => navigator.serviceWorker.removeEventListener("message", handler);
    }

    // أي تغيير محلي على الطابور → حدّث الشارة.
    const unsubCount = onOutboxCountChange(() => {
      getPendingEntries().then((entries) => setPending(entries.length));
    });

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      unsubMsg?.();
      unsubCount();
    };
  }, [refresh, tryReplay]);

  // شارة عائمة صغيرة أسفل يسار الشاشة عند وجود إجراءات منتظرة.
  return (
    <AnimatePresence>
      {pending > 0 && !syncing && (
        <motion.button
          key="outbox-badge"
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          onClick={tryReplay}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] start-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500/95 text-white shadow-lg shadow-amber-500/30 backdrop-blur text-[11px] font-black"
          aria-label={isRtl ? "إجراءات بانتظار الاتصال" : "Actions en attente de connexion"}
        >
          <CloudUpload size={14} className="shrink-0" />
          {isRtl
            ? `${pending} إجراء بانتظار الاتصال`
            : `${pending} action(s) en attente`}
        </motion.button>
      )}
      {syncing && (
        <motion.div
          key="outbox-syncing"
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] start-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-600/95 text-white shadow-lg shadow-blue-500/30 backdrop-blur text-[11px] font-black"
          role="status"
        >
          <Loader2 size={14} className="shrink-0 animate-spin" />
          {isRtl ? "جارٍ مزامنة إجراءاتك…" : "Synchronisation…"}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
