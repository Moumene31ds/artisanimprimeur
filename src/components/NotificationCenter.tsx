"use client";

import { motion } from "framer-motion";
import { 
  Bell, BellOff, CheckCircle2, Truck, Gift, ShoppingBag, X, 
  Trash2, Eye, CreditCard, Sparkles, Info, ExternalLink 
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface Notification {
  id: string;
  title?: string | { ar: string; fr: string };
  message?: string | { ar: string; fr: string };
  category?: string;
  type?: string;
  read?: boolean;
  date?: any;
  orderId?: string;
  invoiceId?: string;
  link?: string;
}

interface NotificationCenterProps {
  isRtl: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  language: "ar" | "fr";
}

export default function NotificationCenter({ 
  isRtl, 
  onClose, 
  notifications, 
  loading, 
  language 
}: NotificationCenterProps) {
  const router = useRouter();

  // تحويل حالة الإشعار غير المقروء إلى مقروء
  const markAsRead = async (id: string, currentStatus?: boolean) => {
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

  // قراءة كافة الإشعارات دفعة واحدة لتحسين الأداء
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
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
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

  // معالجة التنقل الذكي بناءً على الإجراء المتوفر في الإشعار
  const handleActionClick = (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation();
    markAsRead(n.id, n.read);
    onClose();
    
    if (n.category === 'orders' && n.orderId) {
      router.push(`/orders`);
    } else if (n.category === 'billing' && (n.invoiceId || n.orderId)) {
      window.open(`/invoice/${n.invoiceId || n.orderId}`, '_blank');
    } else if (n.link) {
      router.push(n.link);
    }
  };

  // جلب الأيقونة المناسبة بشكل ديناميكي لكل نوع إشعار
  const getCategoryIcon = (category?: string, type?: string, read?: boolean) => {
    const size = 16;
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

  // جلب لون خلفية الأيقونة حسب التصنيف
  const getCategoryBg = (category?: string, type?: string, read?: boolean) => {
    if (read) return 'bg-slate-100 dark:bg-slate-800/60';
    
    switch (category) {
      case 'orders': 
        return type === 'shipping' ? 'bg-indigo-500 shadow-md' : 'bg-blue-500 shadow-md';
      case 'billing': 
        return 'bg-emerald-500 shadow-md';
      case 'system': 
        return type === 'promo' ? 'bg-amber-500 shadow-md' : 'bg-purple-500 shadow-md';
      default: 
        return 'bg-slate-600 shadow-md';
    }
  };

  const getFormattedTime = (dateVal: any) => {
    if (!dateVal) return "—";
    const dateObj = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return dateObj.toLocaleDateString(isRtl ? 'ar-DZ' : 'fr-FR', { 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute top-20 right-4 left-4 md:right-auto md:left-auto md:w-[400px] deep-glass rounded-[2rem] p-5 shadow-2xl z-50 border border-white/30 dark:border-white/10 text-start"
      style={{ direction: isRtl ? "rtl" : "ltr" }}
    >
      {/* الرأس */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50 mb-3">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-accent" />
          <h3 className="font-black text-slate-900 dark:text-white text-base">
            {isRtl ? "مركز الإشعارات" : "Notifications"}
          </h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead} 
              className="text-xs text-accent hover:underline font-black bg-transparent border-none cursor-pointer"
            >
              {isRtl ? "قراءة الكل" : "Tout lire"}
            </button>
          )}
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* قائمة الإشعارات */}
      <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !auth.currentUser ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <BellOff size={24} className="text-slate-350 dark:text-slate-655 mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
              {isRtl ? "يرجى تسجيل الدخول لعرض إشعاراتك" : "Veuillez vous connecter pour voir vos notifications"}
            </p>
            <Link 
              href="/login" 
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs shadow-md hover:scale-[1.02] transition-transform"
            >
              {isRtl ? "تسجيل الدخول" : "Connexion"}
            </Link>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 text-sm">
            <BellOff size={28} className="text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-xs">
              {isRtl ? "لا توجد إشعارات حالياً" : "Aucune notification"}
            </p>
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => {
            const titleText = typeof n.title === 'object' ? n.title[language] : n.title || "";
            const messageText = typeof n.message === 'object' ? n.message[language] : n.message || "";
            
            return (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id, n.read)}
                className={`flex gap-3 p-3 rounded-2xl transition-all relative group cursor-pointer border ${
                  n.read 
                    ? "bg-white/30 dark:bg-slate-900/10 border-transparent hover:bg-slate-100/40 dark:hover:bg-slate-800/10" 
                    : "deep-glass border-blue-500/15 dark:border-blue-500/10 shadow-sm"
                }`}
              >
                {/* شريط جانبي صغير ملون للإشعارات غير المقروءة */}
                {!n.read && (
                  <div className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full ${isRtl ? 'right-0' : 'left-0'}`}></div>
                )}

                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${getCategoryBg(n.category, n.type, n.read)}`}>
                  {getCategoryIcon(n.category, n.type, n.read)}
                </div>
                
                <div className="flex-1 min-w-0 pr-1 pl-1">
                  <h4 className={`text-xs flex items-center gap-1.5 truncate ${!n.read ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-600 dark:text-slate-450"}`}>
                    {titleText}
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {messageText}
                  </p>
                  
                  <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100/30 dark:border-slate-800/20">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">
                      {getFormattedTime(n.date)}
                    </span>
                    
                    {(n.orderId || n.invoiceId || n.link) && (
                      <button
                        onClick={(e) => handleActionClick(e, n)}
                        className="text-[9px] text-blue-500 dark:text-blue-400 font-bold flex items-center gap-0.5 hover:underline bg-transparent border-none p-0 cursor-pointer"
                      >
                        <Eye size={10} />
                        {n.category === 'orders' ? (isRtl ? "الطلب" : "Commande") : 
                         n.category === 'billing' ? (isRtl ? "الفاتورة" : "Facture") : 
                         (isRtl ? "تفاصيل" : "Détails")}
                      </button>
                    )}
                  </div>
                </div>

                {/* زر حذف الإشعار */}
                <button 
                  onClick={(e) => handleDeleteNotification(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all self-center shrink-0 border-none cursor-pointer"
                  title={isRtl ? "حذف" : "Supprimer"}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* رابط الصفحة الرئيسية للإشعارات */}
      {auth.currentUser && (
        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 text-center">
          <Link 
            href="/notifications" 
            onClick={onClose}
            className="text-xs font-black text-accent hover:text-blue-650 transition-colors flex items-center justify-center gap-1"
          >
            <span>{isRtl ? "عرض كل الإشعارات" : "Voir toutes les notifications"}</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
