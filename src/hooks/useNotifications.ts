"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useAppStore } from "@/lib/store";
import { triggerHapticFeedback, playNotificationSound } from "@/lib/utils";
import { toast } from "sonner";

// -----------------------------------------------
// useNotifications — إشعارات فورية حية (Realtime)
// -----------------------------------------------
// هوك مشترك يجمع إشعارات المستخدم لحظياً من Firestore (users/{uid}/notifications)
// مع: عدّاد غير مقروء، إشعار فوري (toast) + صوت + اهتزاز عند وصول إشعار جديد،
// وأدوات markAsRead / markAllAsRead. يُستخدم في Navbar و BottomNav و الصفحات.

export interface LiveNotification {
  id: string;
  title?: string | { ar: string; fr: string };
  message?: string | { ar: string; fr: string };
  category?: string;
  type?: string;
  read?: boolean;
  date?: unknown;
  orderId?: string;
  invoiceId?: string;
  link?: string;
}

/** ترجمة حقل ثنائي اللغة (string أو {ar, fr}) حسب لغة الواجهة. */
export function resolveText(
  value: string | { ar: string; fr: string } | undefined,
  language: "ar" | "fr",
  fallback: string
): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[language] || value.ar || value.fr || fallback;
}

interface UseNotificationsOptions {
  /** عدد الإشعارات المسحوبة لحظياً (الافتراضي 50). */
  limitCount?: number;
  /** إظهار toast عند وصول إشعار جديد (الافتراضي true). */
  toastOnNew?: boolean;
  /** تشغيل الصوت والاهتزاز عند وصول إشعار جديد (الافتراضي true). */
  alertOnNew?: boolean;
  /** تنقل مخصص عند الضغط على "عرض" في الـ toast. */
  onNavigate?: (n: LiveNotification) => void;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { user, isLoggedIn } = useAuth();
  const language = useAppStore((s) => s.language);

  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const optsRef = useRef(options);
  optsRef.current = options;

  const languageRef = useRef(language);
  languageRef.current = language;

  const knownIdsRef = useRef(new Set<string>());
  const announcedIdsRef = useRef(new Set<string>());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      knownIdsRef.current = new Set();
      announcedIdsRef.current = new Set();
      firstLoadRef.current = true;
      return;
    }

    knownIdsRef.current = new Set();
    announcedIdsRef.current = new Set();
    firstLoadRef.current = true;
    setLoading(true);

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("date", "desc"),
      limit(options.limitCount ?? 50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as LiveNotification[];
        const prevIds = knownIdsRef.current;
        knownIdsRef.current = new Set(list.map((n) => n.id));
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
        setLoading(false);

        const isFirst = firstLoadRef.current;
        firstLoadRef.current = false;
        if (isFirst) return;

        const freshUnread = list.filter(
          (n) => !n.read && !prevIds.has(n.id) && !announcedIdsRef.current.has(n.id)
        );
        if (freshUnread.length === 0) return;

        const lang = languageRef.current;
        const isRtl = lang === "ar";

        freshUnread.forEach((n) => {
          announcedIdsRef.current.add(n.id);
          const title = resolveText(n.title, lang, isRtl ? "إشعار جديد" : "Nouvelle notification");
          const message = resolveText(n.message, lang, "");
          const hasAction = Boolean(n.orderId || n.invoiceId || n.link);

          toast.info(title, {
            description: message || undefined,
            action: hasAction
              ? {
                  label: isRtl ? "عرض" : "Voir",
                  onClick: () => {
                    if (optsRef.current.onNavigate) {
                      optsRef.current.onNavigate(n);
                    } else if (n.category === "orders" && n.orderId) {
                      window.location.assign("/orders");
                    } else if (n.category === "billing" && (n.invoiceId || n.orderId)) {
                      window.open(`/invoice/${n.invoiceId || n.orderId}`, "_blank");
                    } else if (n.link) {
                      window.location.assign(n.link);
                    }
                  },
                }
              : undefined,
            duration: 6000,
          });
        });

        if (optsRef.current.alertOnNew !== false) {
          playNotificationSound();
          triggerHapticFeedback("light");
        }
      },
      (error) => {
        console.error("Error subscribing to notifications:", error);
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isLoggedIn]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, "users", user.uid, "notifications", id), { read: true });
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    },
    [user?.uid]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true });
      });
      await batch.commit();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, [user?.uid, notifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
