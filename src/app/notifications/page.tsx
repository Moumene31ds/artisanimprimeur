"use client";

import { useAppStore } from "@/lib/store";
import { createTranslator, getLanguageDirection, normalizeLanguage } from "@/lib/translations";
import { 
  Bell, BellOff, CheckCircle2, Trash2, Filter, 
  ShoppingBag, CreditCard, Info, Layers, Sparkles, 
  Eye, CheckCheck, Search, Truck, ShieldCheck,
  RefreshCw, Square, CheckSquare, Clock, Inbox, X, ChevronDown, MailWarning
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit, writeBatch } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// تصنيفات الإشعارات المدعومة في النظام الحقيقي
type NotificationCategory = 'all' | 'unread' | 'orders' | 'billing' | 'system' | 'promo';

// دالة تحويل القيمة الزمنية من Firestore أو النص إلى كائن Date آمن
function toDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  try {
    if (dateVal.toDate) return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// عرض الوقت النسبي الذكي (الآن، منذ دقيقة، منذ ساعة...)
function timeAgo(dateVal: any, isRtl: boolean): string {
  const d = toDate(dateVal);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return isRtl ? "الآن" : "à l'instant";
  if (min < 60) return isRtl ? `منذ ${min} د` : `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isRtl ? `منذ ${hr} س` : `il y a ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return isRtl ? `منذ ${days} يوم` : `il y a ${days} j`;
  return d.toLocaleDateString(isRtl ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// تجميع الإشعارات حسب الفترة الزمنية (اليوم، أمس، هذا الأسبوع...)
function groupByDate(notifs: any[], isRtl: boolean) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: { key: string; label: string; items: any[] }[] = [
    { key: "today", label: isRtl ? "اليوم" : "Aujourd'hui", items: [] },
    { key: "yesterday", label: isRtl ? "أمس" : "Hier", items: [] },
    { key: "week", label: isRtl ? "هذا الأسبوع" : "Cette semaine", items: [] },
    { key: "month", label: isRtl ? "هذا الشهر" : "Ce mois-ci", items: [] },
    { key: "older", label: isRtl ? "الأقدم" : "Plus ancien", items: [] },
  ];

  notifs.forEach(n => {
    const d = toDate(n.date);
    let key = "older";
    if (d) {
      if (d >= startOfToday) key = "today";
      else if (d >= startOfYesterday) key = "yesterday";
      else if (d >= startOfWeek) key = "week";
      else if (d >= startOfMonth) key = "month";
    }
    groups.find(g => g.key === key)!.items.push(n);
  });

  return groups.filter(g => g.items.length > 0);
}

export default function NotificationsPage() {
  const { language } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // الاشتراك الحقيقي المباشر بقاعدة بيانات Firebase لإشعارات المستخدم الحالي
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, `users/${user.uid}/notifications`),
          orderBy("date", "desc"),
          limit(500)
        );

        const unsubscribeDb = onSnapshot(q, (snap) => {
          setNotifications(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
          setLoading(false);
        }, () => {
          setLoading(false);
        });

        return () => unsubscribeDb();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [refreshKey]);

  const normalizedLanguage = normalizeLanguage(language);
  const t = createTranslator(normalizedLanguage);
  const isRtl = getLanguageDirection(normalizedLanguage) === "rtl";

  // تحويل حالة الإشعار غير المقروء إلى مقروء عند النقر عليه
  const markAsRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return;
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
      } catch (error) {
        console.error("Error updating notification:", error);
      }
    }
  };

  // قراءة كافة الإشعارات دفعة واحدة (Batch Update) لتحسين الأداء
  const markAllAsRead = async () => {
    const user = auth.currentUser;
    const unreadNotifs = notifications.filter(n => !n.read);

    if (user && unreadNotifs.length > 0) {
      try {
        const batch = writeBatch(db);
        unreadNotifs.forEach(n => {
          const notifRef = doc(db, `users/${user.uid}/notifications`, n.id);
          batch.update(notifRef, { read: true });
        });
        await batch.commit();
        setSelectedIds(new Set());
        toast.success(isRtl ? "تم قراءة جميع الإشعارات بنجاح" : "Tout est marqué comme lu");
      } catch (error) {
        toast.error(isRtl ? "حدث خطأ أثناء تحديث البيانات" : "Une erreur est survenue");
      }
    }
  };

  // حذف الإشعار نهائياً من قاعدة البيانات
  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/notifications`, id));
        setSelectedIds(prev => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success(isRtl ? "تم حذف الإشعار" : "Notification supprimée");
      } catch (error) {
        toast.error(isRtl ? "فشل حذف الإشعار" : "Erreur lors de la suppression");
      }
    }
  };

  // حذف مجموعة مختارة من الإشعارات دفعة واحدة
  const deleteSelected = async () => {
    const user = auth.currentUser;
    if (!user || selectedIds.size === 0) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, `users/${user.uid}/notifications`, id));
      });
      await batch.commit();
      toast.success(isRtl ? `تم حذف ${selectedIds.size} إشعار بنجاح` : `${selectedIds.size} notification(s) supprimée(s)`);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      toast.error(isRtl ? "فشل حذف الإشعارات المحددة" : "Erreur lors de la suppression groupée");
    }
  };

  // حذف كافة الإشعارات نهائياً
  const clearAllNotifications = async () => {
    const user = auth.currentUser;
    if (!user || notifications.length === 0) return;
    if (!window.confirm(isRtl
      ? "هل أنت متأكد من حذف جميع الإشعارات نهائياً؟ لا يمكن التراجع عن هذه العملية."
      : "Supprimer définitivement toutes vos notifications ? Cette action est irréversible.")) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, `users/${user.uid}/notifications`, n.id));
      });
      await batch.commit();
      setSelectedIds(new Set());
      setSelectMode(false);
      toast.success(isRtl ? "تم حذف جميع الإشعارات" : "Toutes les notifications ont été supprimées");
    } catch (error) {
      toast.error(isRtl ? "فشل حذف جميع الإشعارات" : "Erreur lors de la suppression");
    }
  };

  // إعادة مزامنة القائمة مع قاعدة البيانات يدوياً
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  // معالجة التنقل الذكي بناءً على بيانات الإشعار الحقيقي
  const handleActionClick = (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    markAsRead(n.id, n.read);

    if (n.category === 'orders' && n.orderId) {
      router.push(`/orders`);
    } else if (n.category === 'billing' && (n.invoiceId || n.orderId)) {
      router.push(`/invoice/${n.invoiceId || n.orderId}`);
    } else if (n.link) {
      router.push(n.link);
    }
  };

  // تفعيل/إلغاء تحديد إشعار للعمليات الجماعية
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // تحديد الكل في القائمة الحالية المفلترة
  const selectAllVisible = (list: any[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = list.every(n => next.has(n.id));
      list.forEach(n => {
        if (allSelected) next.delete(n.id);
        else next.add(n.id);
      });
      return next;
    });
  };

  // محرك الفلترة والتصفية والبحث المتقدم
  const filteredNotifications = notifications.filter(n => {
    const titleText = (typeof n.title === 'object' ? n.title[language] : n.title || "").toLowerCase();
    const messageText = (typeof n.message === 'object' ? n.message[language] : n.message || "").toLowerCase();
    const matchesSearch = titleText.includes(searchQuery.toLowerCase()) || messageText.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'promo') return n.category === 'promo' || n.type === 'promo';
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // إحصاءات سريعة لكل تبويب في شريط الفلاتر
  const tabCounts: Record<NotificationCategory, number> = {
    all: notifications.length,
    unread: unreadCount,
    orders: notifications.filter(n => n.category === 'orders').length,
    billing: notifications.filter(n => n.category === 'billing').length,
    system: notifications.filter(n => n.category === 'system').length,
    promo: notifications.filter(n => n.category === 'promo' || n.type === 'promo').length,
  };

  // القائمة المرئية مع خاصية تحميل المزيد تدريجياً
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);
  const grouped = groupByDate(visibleNotifications, isRtl);

  // جلب الأيقونة المناسبة بشكل ديناميكي لكل نوع إشعار حقيقي
  const getCategoryIcon = (category: string, type: string, read: boolean) => {
    const size = 18;
    const iconColor = read ? "text-slate-400 dark:text-slate-500" : "text-white";

    switch (category) {
      case 'orders':
        return type === 'shipping' ? <Truck size={size} className={iconColor} /> : <ShoppingBag size={size} className={iconColor} />;
      case 'billing':
        return <CreditCard size={size} className={iconColor} />;
      case 'system':
        return type === 'promo' ? <Sparkles size={size} className={iconColor} /> : type === 'security' ? <ShieldCheck size={size} className={iconColor} /> : <Info size={size} className={iconColor} />;
      default:
        return <Bell size={size} className={iconColor} />;
    }
  };

  // جلب لون خلفية الأيقونة حسب التصنيف لزيادة الراحة البصرية وتحديد الأولوية
  const getCategoryBg = (category: string, type: string, read: boolean) => {
    if (read) return 'bg-slate-100 dark:bg-slate-800/60';

    switch (category) {
      case 'orders':
        return type === 'shipping' ? 'bg-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-blue-500 shadow-md shadow-blue-500/20';
      case 'billing':
        return 'bg-emerald-500 shadow-md shadow-emerald-500/20';
      case 'system':
        return type === 'promo' ? 'bg-amber-500 shadow-md shadow-amber-500/20' : type === 'security' ? 'bg-rose-500 shadow-md shadow-rose-500/20' : 'bg-purple-500 shadow-md shadow-purple-500/20';
      default:
        return 'bg-slate-700 shadow-md shadow-slate-700/20';
    }
  };

  // تسمية تصنيف الإشعار بلغة المستخدم الحالية
  const getCategoryLabel = (category: string, type: string): string => {
    if (category === 'orders') return isRtl ? (type === 'shipping' ? "شحنة" : "طلب طباعة") : (type === 'shipping' ? "Livraison" : "Commande");
    if (category === 'billing') return isRtl ? "دفع وفاتورة" : "Paiement";
    if (category === 'system') return isRtl ? (type === 'promo' ? "عرض خاص" : type === 'security' ? "أمان" : "نظام") : (type === 'promo' ? "Promo" : type === 'security' ? "Sécurité" : "Système");
    return isRtl ? "عام" : "Général";
  };

  const tabs = [
    { id: 'all' as NotificationCategory, label: isRtl ? "كل الإشعارات" : "Tout", icon: Layers },
    { id: 'unread' as NotificationCategory, label: isRtl ? "غير المقروءة" : "Non lus", icon: Filter },
    { id: 'orders' as NotificationCategory, label: isRtl ? "طلبات الطباعة" : "Commandes", icon: ShoppingBag },
    { id: 'billing' as NotificationCategory, label: isRtl ? "المدفوعات" : "Facturation", icon: CreditCard },
    { id: 'system' as NotificationCategory, label: isRtl ? "تحديثات النظام" : "Système", icon: Info },
    { id: 'promo' as NotificationCategory, label: isRtl ? "العروض" : "Promos", icon: Sparkles },
  ];

  if (!mounted) return null;

  return (
    <div className={`max-w-3xl mx-auto pb-24 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* بطاقة ترحيبية علوية مع إحصاءات فورية */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden mb-6 p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-white border border-white/10 shadow-2xl"
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <Bell size={26} className="text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                  {t("notifications")}
                  {unreadCount > 0 && (
                    <motion.span
                      key={unreadCount}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-500/30"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </h1>
                <p className="text-xs md:text-sm text-slate-300 dark:text-slate-400 mt-1">
                  {isRtl ? "صندوق الإشعارات الذكي المتصل مباشرة بحسابك." : "Votre centre de notifications connecté en temps réel."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all flex items-center justify-center cursor-pointer"
              title={isRtl ? "تحديث القائمة" : "Actualiser"}
            >
              <RefreshCw size={15} className={`${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all flex items-center gap-2 text-xs font-black cursor-pointer"
              >
                <CheckCheck size={14} />
                <span>{isRtl ? "تعيين الكل كمقروء" : "Tout marquer lu"}</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-red-300 rounded-xl transition-all flex items-center gap-2 text-xs font-black cursor-pointer"
              >
                <Trash2 size={14} />
                <span>{isRtl ? "مسح الكل" : "Tout effacer"}</span>
              </button>
            )}
          </div>
        </div>

        {/* شريط الإحصاءات السريعة */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <p className="text-2xl font-black text-blue-300">{notifications.length}</p>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-0.5">{isRtl ? "الإجمالي" : "Total"}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <p className="text-2xl font-black text-red-400">{unreadCount}</p>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-0.5">{isRtl ? "غير مقروء" : "Non lus"}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
            <p className="text-2xl font-black text-emerald-300">{tabCounts.orders + tabCounts.billing}</p>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-0.5">{isRtl ? "الطلبات والدفع" : "Commandes"}</p>
          </div>
        </div>
      </motion.div>

      {/* بار البحث الفوري */}
      <div className="relative mb-5">
        <span className="absolute inset-y-0 right-0 lg:right-auto lg:left-0 flex items-center pr-3.5 lg:pr-0 lg:pl-3.5 pointer-events-none text-slate-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(30); }}
          placeholder={isRtl ? "البحث في نص الإشعارات، أرقام الطلبات..." : "Chercher dans les notifications..."}
          className={`w-full py-3 text-sm bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"}`}
        />
      </div>

      {/* شريط فلاتر الأقسام مع عدادات */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5 hide-scrollbar border-b border-slate-100 dark:border-slate-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count = tabCounts[tab.id];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setVisibleCount(30); setExpandedId(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200/60 dark:border-slate-900 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* شريط الإجراءات الجماعية */}
      <AnimatePresence>
        {(selectMode || selectedIds.size > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 dark:bg-blue-950/60 text-white border border-blue-500/20 shadow-lg">
              <div className="flex items-center gap-3 text-xs font-black">
                <button
                  onClick={() => setSelectMode(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title={isRtl ? "إغلاق" : "Fermer"}
                >
                  <X size={15} />
                </button>
                <span className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg">
                  {selectedIds.size} {isRtl ? "محدد" : "sélection"}
                </span>
                <span className="text-slate-300">{isRtl ? "وضع التحديد" : "Mode sélection"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectAllVisible(visibleNotifications)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-black transition-colors cursor-pointer"
                >
                  {isRtl ? "تحديد الكل" : "Tout sélectionner"}
                </button>
                <button
                  onClick={deleteSelected}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 rounded-xl text-[11px] font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={12} />
                  {isRtl ? "حذف المحدد" : "Supprimer"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* معالجة الحالات وعرض قائمة الإشعارات */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="loader"></div></div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-glass flex flex-col items-center justify-center p-14 rounded-[2rem] text-center shadow-md border border-white/40 dark:border-slate-900/40"
        >
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-700 rounded-3xl flex items-center justify-center mb-4 border border-slate-200/40 dark:border-slate-800">
            {searchQuery ? <Search size={26} /> : activeTab === 'unread' ? <CheckCheck size={26} /> : <BellOff size={26} />}
          </div>
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-1">
            {searchQuery
              ? (isRtl ? "لم نجد نتائج مطابقة لبحثك" : "Aucun résultat trouvé")
              : activeTab === 'unread'
                ? (isRtl ? "صندوقك فارغ ومقروء بالكامل!" : "Aucun message non lu !")
                : t("noNotifs")}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
            {searchQuery
              ? (isRtl ? "تأكد من كتابة الكلمات بشكل صحيح أو جرب فلتر آخر." : "Essayer d'ajuster vos mots clés ou filtres.")
              : activeTab === 'unread'
                ? (isRtl ? "ممتاز! قمت بمعالجة وقراءة جميع التنبيهات بنجاح." : "Félicitations, vous êtes à jour.")
                : (isRtl ? "لا توجد أي سجلات واردة في هذا القسم حتى الآن." : "Aucun historique disponible.")}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {grouped.map((group) => (
              <motion.section
                layout
                key={group.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* عنوان الفترة الزمنية */}
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <Clock size={13} className="text-slate-400 dark:text-slate-500" />
                  <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {group.label}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-[9px] font-black text-slate-400 dark:text-slate-500">
                    {group.items.length}
                  </span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/60"></div>
                </div>

                <div className="space-y-3">
                  {group.items.map((n) => {
                    const isExpanded = expandedId === n.id;
                    const isSelected = selectedIds.has(n.id);
                    const categoryLabel = getCategoryLabel(n.category, n.type);
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, x: isRtl ? 40 : -40, transition: { duration: 0.18 } }}
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id, n.read);
                          setExpandedId(isExpanded ? null : n.id);
                        }}
                        className={`group p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/40 shadow-md'
                            : n.read
                              ? 'bg-white/40 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900/60 opacity-85 hover:opacity-100'
                              : 'deep-glass border-blue-500/20 dark:border-blue-500/10 shadow-md shadow-blue-500/[0.01]'
                        }`}
                      >
                        {/* شريط عمودي ملون نابض للإشعارات الجديدة فقط */}
                        {!n.read && (
                          <div className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 ${isRtl ? 'right-0' : 'left-0'}`}></div>
                        )}

                        <div className="flex gap-4 items-start">
                          {/* زر التحديد الجماعي */}
                          {selectMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(n.id); }}
                              className="mt-0.5 shrink-0 cursor-pointer"
                              title={isRtl ? "تحديد" : "Sélectionner"}
                            >
                              {isSelected
                                ? <CheckSquare size={20} className="text-blue-500" />
                                : <Square size={20} className="text-slate-300 dark:text-slate-600" />}
                            </button>
                          )}

                          {/* حاوية الأيقونة الذكية */}
                          <div className={`mt-0.5 p-2.5 rounded-xl transition-transform group-hover:scale-105 shrink-0 ${getCategoryBg(n.category, n.type, n.read)}`}>
                            {getCategoryIcon(n.category, n.type, n.read)}
                          </div>

                          {/* محتوى الإشعار */}
                          <div className="flex-1 min-w-0">
                            {n.title && (
                              <h3 className={`text-sm mb-1 flex items-center gap-2 ${!n.read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                                {typeof n.title === 'object' ? n.title[language] : n.title}
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                              </h3>
                            )}

                            {/* شارة تصنيف الإشعار */}
                            <div className={`mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${
                              n.read
                                ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}>
                              {categoryLabel}
                            </div>

                            <p className={`text-xs md:text-sm leading-relaxed tracking-wide ${isExpanded ? '' : 'line-clamp-2'} ${!n.read && !n.title ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                              {typeof n.message === 'object' ? n.message[language] : n.message}
                            </p>

                            {/* الفوتر الداخلي للإشعار */}
                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/50 dark:border-slate-900/30">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {timeAgo(n.date, isRtl)}
                                <span className="mx-1.5 opacity-40">•</span>
                                {n.date?.toDate ? n.date.toDate().toLocaleDateString(isRtl ? 'ar-DZ' : 'fr-FR', {
                                  hour: '2-digit', minute: '2-digit'
                                }) : '—'}
                              </span>

                              <div className="flex items-center gap-3">
                                {(n.orderId || n.invoiceId || n.link) && (
                                  <button
                                    onClick={(e) => handleActionClick(e, n)}
                                    className="text-[11px] text-blue-500 dark:text-blue-400 font-black flex items-center gap-1 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    {n.category === 'orders' ? (isRtl ? "تفاصيل الطلب" : "Commande") :
                                     n.category === 'billing' ? (isRtl ? "عرض الفاتورة" : "Facture") :
                                     (isRtl ? "انقر للمتابعة" : "Suivre")}
                                  </button>
                                )}
                                <span className={`flex items-center gap-0.5 text-[10px] font-black ${isExpanded ? 'text-blue-500' : 'text-slate-400'}`}>
                                  {isExpanded
                                    ? (isRtl ? "إغلاق" : "Réduire")
                                    : (isRtl ? "عرض" : "Détails")}
                                  <ChevronDown size={11} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* زر حذف الإشعار */}
                          <button
                            onClick={(e) => deleteNotification(n.id, e)}
                            className="opacity-0 group-hover:opacity-100 md:opacity-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all self-center shrink-0 cursor-pointer"
                            title={isRtl ? "حذف الإشعار" : "Supprimer"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </AnimatePresence>

          {/* زر تحميل المزيد من الإشعارات */}
          {visibleCount < filteredNotifications.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center pt-2"
            >
              <button
                onClick={() => setVisibleCount(c => c + 30)}
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto shadow-sm cursor-pointer"
              >
                <Inbox size={14} />
                {isRtl
                  ? `عرض المزيد (متبقي ${filteredNotifications.length - visibleCount})`
                  : `Voir plus (${filteredNotifications.length - visibleCount} restants)`}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
