"use client";

import { useAppStore } from "@/lib/store";
import { createTranslator, getLanguageDirection, normalizeLanguage } from "@/lib/translations";
import { 
  Bell, BellOff, CheckCircle, Trash2, Filter, 
  ShoppingBag, CreditCard, Info, Layers, Sparkles, 
  Eye, CheckCheck, Search, ArrowLeftRight, Truck
} from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit, writeBatch } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// تصنيفات الإشعارات المدعومة في النظام الحقيقي
type NotificationCategory = 'all' | 'unread' | 'orders' | 'billing' | 'system';

export default function NotificationsPage() {
  const { language } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // جلب آخر 50 إشعار حقيقي خاص بالمستخدم الحالي من Firebase
        const q = query(
          collection(db, `users/${user.uid}/notifications`),
          orderBy("date", "desc"),
          limit(50) 
        );
        
        const unsubscribeDb = onSnapshot(q, (snap) => {
          setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });

        return () => unsubscribeDb();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (!mounted) return null;

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
        toast.success(isRtl ? "تم قراءة جميع الإشعارات بنجاح" : "Tout est marqué comme lu");
      } catch (error) {
        toast.error(isRtl ? "حدث خطأ أثناء تحديث البيانات" : "Une erreur est survenue");
      }
    }
  };

  // حذف الإشعار نهائياً من قاعدة البيانات
  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // منع تداخل الحدث مع دالة markAsRead
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/notifications`, id));
        toast.success(isRtl ? "تم حذف الإشعار" : "Notification supprimée");
      } catch (error) {
        toast.error(isRtl ? "فشل حذف الإشعار" : "Erreur lors de la suppression");
      }
    }
  };

  // معالجة التنقل الذكي بناءً على بيانات الإشعار الحقيقي
  const handleActionClick = (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    markAsRead(n.id, n.read);
    
    if (n.category === 'orders' && n.orderId) {
      router.push(`/dashboard/orders/${n.orderId}`);
    } else if (n.category === 'billing' && n.invoiceId) {
      router.push(`/dashboard/invoices/${n.invoiceId}`);
    } else if (n.link) {
      router.push(n.link);
    }
  };

  // محرك الفلترة والتصفية والبحث المتقدم للبيانات
  const filteredNotifications = notifications.filter(n => {
    const titleText = (typeof n.title === 'object' ? n.title[language] : n.title || "").toLowerCase();
    const messageText = (typeof n.message === 'object' ? n.message[language] : n.message || "").toLowerCase();
    const matchesSearch = titleText.includes(searchQuery.toLowerCase()) || messageText.includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

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
        return type === 'promo' ? <Sparkles size={size} className={iconColor} /> : <Info size={size} className={iconColor} />;
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
        return type === 'promo' ? 'bg-amber-500 shadow-md shadow-amber-500/20' : 'bg-purple-500 shadow-md shadow-purple-500/20';
      default: 
        return 'bg-slate-700 shadow-md shadow-slate-700/20';
    }
  };

  return (
    <div className={`max-w-3xl mx-auto pb-24 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* هيدر الصفحة الرئيسي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Bell size={32} className="text-blue-500" />
            {t("notifications")}
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-500/20">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRtl ? "صندوق الإشعارات والعمليات الفورية المتصل بحسابك مباشرة." : "Votre centre de notifications connecté en temps réel à votre compte."}
          </p>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="self-start md:self-auto px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center gap-2 text-xs font-bold border border-slate-200/40 dark:border-slate-800"
          >
            <CheckCheck size={14} />
            <span>{isRtl ? "تعيين الكل كمقروء" : "Tout marquer"}</span>
          </button>
        )}
      </div>

      {/* بار البحث الفوري متقدم التصميم */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 right-0 lg:right-auto lg:left-0 flex items-center pr-3.5 lg:pr-0 lg:pl-3.5 pointer-events-none text-slate-400">
          <Search size={16} />
        </span>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRtl ? "البحث في نص الإشعارات، أرقام الطلبات..." : "Chercher dans les notifications..."}
          className={`w-full py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"}`}
        />
      </div>

      {/* شريط فلاتر الأقسام (Tabs Filter) */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 hide-scrollbar border-b border-slate-100 dark:border-slate-900">
        {[
          { id: 'all', label: isRtl ? "كل الإشعارات" : "Tout", icon: <Layers size={13} /> },
          { id: 'unread', label: isRtl ? "غير المقروءة" : "Non lus", icon: <Filter size={13} /> },
          { id: 'orders', label: isRtl ? "حالة طلبات الطباعة" : "Commandes", icon: <ShoppingBag size={13} /> },
          { id: 'billing', label: isRtl ? "المدفوعات والفواتير" : "Facturation", icon: <CreditCard size={13} /> },
          { id: 'system', label: isRtl ? "تحديثات النظام" : "Système", icon: <Sparkles size={13} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as NotificationCategory)}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap border ${
              activeTab === tab.id 
                ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/10' 
                : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200/60 dark:border-slate-900 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* معالجة الحالات وعرض قائمة الإشعارات */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="loader"></div></div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="premium-glass flex flex-col items-center justify-center p-16 rounded-[2rem] text-center shadow-md border border-white/40 dark:border-slate-900/40"
        >
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-700 rounded-2xl flex items-center justify-center mb-4 border border-slate-200/40 dark:border-slate-800">
            <BellOff size={24} />
          </div>
          <h2 className="text-base font-black text-slate-800 dark:text-white mb-1">
            {searchQuery ? (isRtl ? "لم نجد نتائج مطابقة لبحثك" : "Aucun résultat trouvé") : (activeTab === 'unread' ? (isRtl ? "صندوقك فارغ ومقروء بالكامل!" : "Aucun message non lu !") : t("noNotifs"))}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
            {searchQuery 
              ? (isRtl ? "تأكد من كتابة الكلمات بشكل صحيح أو جرب فلتر آخر." : "Essayer d'ajuster vos mots clés ou filtres.")
              : (activeTab === 'unread' ? (isRtl ? "ممتاز! قمت بمعالجة وقراءة جميع التنبيهات بنجاح." : "Félicitations, vous êtes à jour.") : (isRtl ? "لا توجد أي سجلات واردة في هذا القسم حتى الآن." : "Aucun historique disponible."))
            }
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((n) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, x: isRtl ? 40 : -40, transition: { duration: 0.18 } }}
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                key={n.id} 
                onClick={() => markAsRead(n.id, n.read)}
                className={`group p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden glass-spotlight ${
                  n.read 
                    ? 'bg-white/40 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900/60 opacity-85 hover:opacity-100' 
                    : 'deep-glass border-blue-500/20 dark:border-blue-500/10 shadow-md shadow-blue-500/[0.01]'
                }`}
              >
                {/* شريط عمودي ملون نابض للإشعارات الجديدة فقط */}
                {!n.read && (
                  <div className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 ${isRtl ? 'right-0' : 'left-0'}`}></div>
                )}

                <div className="flex gap-4 items-start">
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
                    <p className={`text-xs md:text-sm leading-relaxed tracking-wide ${!n.read && !n.title ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {typeof n.message === 'object' ? n.message[language] : n.message}
                    </p>
                    
                    {/* الفوتر الداخلي للإشعار: الوقت وزر الإجراء الذكي والإنتاجي */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/50 dark:border-slate-900/30">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                        {n.date?.toDate ? n.date.toDate().toLocaleDateString(isRtl ? 'ar-DZ' : 'fr-FR', { 
                          weekday: 'short', hour: '2-digit', minute: '2-digit' 
                        }) : '—'}
                      </span>
                      
                      {/* عرض الإجراء السريع للمستخدم بناءً على نوع المستند الفعلي المتوفر */}
                      {(n.orderId || n.invoiceId || n.link) && (
                        <button
                          onClick={(e) => handleActionClick(e, n)}
                          className="text-[11px] text-blue-500 dark:text-blue-400 font-black flex items-center gap-1 hover:underline bg-transparent border-none p-0 cursor-pointer"
                        >
                          <Eye size={12} />
                          {n.category === 'orders' ? (isRtl ? "تفاصيل طلب الطباعة" : "Détails de commande") : 
                           n.category === 'billing' ? (isRtl ? "عرض تفاصيل الفاتورة" : "Voir la facture") : 
                           (isRtl ? "انقر للمتابعة" : "Suivre le lien")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* زر حذف الإشعار */}
                  <button 
                    onClick={(e) => deleteNotification(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all self-center shrink-0"
                    title={isRtl ? "حذف الإشعار" : "Supprimer"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
