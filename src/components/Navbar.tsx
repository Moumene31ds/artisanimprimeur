"use client";

import Link from "next/link";
import { 
  ShoppingCart, Menu, User, Globe, 
  LogOut, ShieldCheck, X, ChevronDown, Bell, Sparkles,
  Heart, Shield, FileCheck // الأيقونات الجديدة
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import NotificationCenter from "./NotificationCenter";

export default function Navbar() {
  const { cart, language, setLanguage, favorites } = useAppStore(); // جلب المفضلة إن وجدت في الستور
  const { isLoggedIn, isAdmin, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();
  const isRtl = language === "ar";

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoadingNotifications(false);
      return;
    }

    const syncUserProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || user.email?.split("@")[0] || "Client",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        console.error("Error syncing user profile:", err);
      }
    };
    syncUserProfile();

    setLoadingNotifications(true);
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy("date", "desc"),
      limit(50)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
      setLoadingNotifications(false);

      if (!isFirstLoad) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const notif = change.doc.data();
            if (!notif.read) {
              const titleText = typeof notif.title === 'object' ? notif.title[language] : notif.title || "";
              const messageText = typeof notif.message === 'object' ? notif.message[language] : notif.message || "";
              
              toast.info(titleText || (isRtl ? "إشعار جديد" : "Nouvelle notification"), {
                description: messageText,
                action: (notif.orderId || notif.invoiceId || notif.link) ? {
                  label: isRtl ? "عرض" : "Voir",
                  onClick: () => {
                    if (notif.category === 'orders' && notif.orderId) {
                      router.push(`/orders`);
                    } else if (notif.category === 'billing' && (notif.invoiceId || notif.orderId)) {
                      window.open(`/invoice/${notif.invoiceId || notif.orderId}`, '_blank');
                    } else if (notif.link) {
                      router.push(notif.link);
                    }
                  }
                } : undefined,
                duration: 6000,
              });
            }
          }
        });
      }
      isFirstLoad = false;
    }, (error) => {
      console.error("Error subscribing to notifications:", error);
      setLoadingNotifications(false);
    });

    return () => unsubscribe();
  }, [isLoggedIn, user, language, isRtl, router]);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success(isRtl ? "تم تسجيل الخروج بنجاح" : "Déconnexion réussie");
      router.push("/");
    } catch (error) {
      toast.error(isRtl ? "حدث خطأ أثناء تسجيل الخروج" : "Erreur lors de la déconnexion");
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 pointer-events-none">
      <nav className={`w-full max-w-7xl mx-auto rounded-[2rem] transition-all duration-500 pointer-events-auto ${
        isScrolled 
          ? "deep-glass shadow-[0_12px_40px_rgba(0,0,0,0.08)] py-3 px-6" 
          : "bg-transparent py-5 px-4"
      }`}>
        <div className="flex items-center justify-between gap-4">
          
          {/* الشعار الهوياتي للمطبعة */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-accent dark:to-blue-400 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-900 dark:text-white tracking-tight text-sm sm:text-base leading-none">
                L'Artisan
              </span>
              <span className="text-[10px] font-bold text-accent dark:text-blue-400 tracking-widest uppercase mt-0.5">
                Imprimeur
              </span>
            </div>
          </Link>

          {/* القائمة الرئيسية لسطح المكتب */}
          <div className="hidden lg:flex items-center gap-1 bg-white/30 dark:bg-black/10 p-1.5 rounded-full border border-white/20 dark:border-white/5 backdrop-blur-md">
            <Link 
              href="/" 
              onMouseMove={handleMouseMove} 
              className={`glass-spotlight px-4 py-2.5 rounded-full text-xs font-bold transition-all ${pathname === "/" ? "bg-white dark:bg-slate-800 text-accent shadow-sm" : "text-slate-600 dark:text-slate-350 hover:text-slate-900"}`}
            >
              {isRtl ? "الرئيسية" : "Accueil"}
            </Link>
            <Link 
              href="/services" 
              onMouseMove={handleMouseMove} 
              className={`glass-spotlight px-4 py-2.5 rounded-full text-xs font-bold transition-all ${pathname === "/services" ? "bg-white dark:bg-slate-800 text-accent shadow-sm" : "text-slate-600 dark:text-slate-350 hover:text-slate-900"}`}
            >
              {isRtl ? "خدماتنا" : "Services"}
            </Link>
            <Link 
              href="/showroom" 
              onMouseMove={handleMouseMove} 
              className={`glass-spotlight px-4 py-2.5 rounded-full text-xs font-bold transition-all ${pathname === "/showroom" ? "bg-white dark:bg-slate-800 text-accent shadow-sm" : "text-slate-600 dark:text-slate-350 hover:text-slate-900"}`}
            >
              {isRtl ? "معرض 3D" : "Showroom 3D"}
            </Link>
            <Link 
              href="/bat-scanner" 
              onMouseMove={handleMouseMove} 
              className={`glass-spotlight px-4 py-2.5 rounded-full text-xs font-bold transition-all ${pathname === "/bat-scanner" ? "bg-white dark:bg-slate-800 text-accent shadow-sm" : "text-slate-600 dark:text-slate-350 hover:text-slate-900"}`}
            >
              {isRtl ? "فحص التصميم" : "Vérif Design"}
            </Link>
            <Link 
              href="/rewards" 
              onMouseMove={handleMouseMove} 
              className={`glass-spotlight px-4 py-2.5 rounded-full text-xs font-bold transition-all ${pathname === "/rewards" ? "bg-white dark:bg-slate-800 text-accent shadow-sm" : "text-slate-600 dark:text-slate-350 hover:text-slate-900"}`}
            >
              {isRtl ? "نادي المكافآت" : "Club VIP"}
            </Link>
            <Link 
              href="/ai-studio" 
              onMouseMove={handleMouseMove} 
              className={`glass-spotlight px-4 py-2.5 rounded-full text-xs font-black text-purple-600 dark:text-purple-400 flex items-center gap-1.5 transition-all ${pathname === "/ai-studio" ? "bg-white dark:bg-slate-800 text-accent shadow-sm" : "hover:text-purple-500"}`}
            >
              <Sparkles size={12} className="animate-pulse" />
              {isRtl ? "استوديو التصميم" : "Studio Design"}
            </Link>
          </div>

          {/* أدوات التحكم الجانبية والأيقونات */}
          <div className="flex items-center gap-1.5 relative">
            
            {/* زر تبديل اللغة */}
            <button 
              onClick={() => setLanguage(language === "ar" ? "fr" : "ar")}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-colors"
              title="Changer de langue"
            >
              <Globe size={20} />
            </button>

            {/* محول السمات */}
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ThemeSwitcher />
            </div>

            {/* أيقونة مركز الإشعارات */}
            <button 
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileDropdownOpen(false); }}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-all relative ${isNotificationsOpen ? "bg-accent/10 text-accent" : ""}`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* زر المفضلة (سطح المكتب) */}
            <Link href="/favorites" className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-colors relative">
              <Heart size={20} />
              {favorites && favorites.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* سلة التسوق الذكية */}
            <Link href="/cart" className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-colors relative">
              <ShoppingCart size={20} />
              {cart && cart.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* بوابات الدخول للمستخدم لسطح المكتب */}
            <div className="hidden md:block relative">
              {isLoggedIn ? (
                <button 
                  onClick={() => { setIsProfileDropdownOpen(!isProfileDropdownOpen); setIsNotificationsOpen(false); }}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-sm transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              ) : (
                <Link href="/login" className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-sm hover:scale-[1.02] transition-transform active:scale-[0.98] block">
                  {isRtl ? "دخول" : "Connexion"}
                </Link>
              )}

              {/* القائمة المنسدلة للبروفايل */}
              <AnimatePresence>
                {isProfileDropdownOpen && isLoggedIn && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute ${isRtl ? 'left-0' : 'right-0'} top-14 w-52 deep-glass rounded-2xl p-2 shadow-xl border border-white/20 dark:border-white/10 z-50`}
                  >
                    <Link href="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-2 p-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                      <User size={16} /> {isRtl ? "ملفي الشخصي" : "Mon Profil"}
                    </Link>
                    <Link href="/payment-verify" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-2 p-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors">
                      <FileCheck size={16} /> {isRtl ? "تأكيد دفع بريدي موب" : "Vérifier paiement"}
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-2 p-3 text-sm font-black text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 rounded-xl transition-colors">
                        <ShieldCheck size={16} /> {isRtl ? "لوحة الإدارة" : "Administration"}
                      </Link>
                    )}
                    <div className="h-px bg-slate-200/50 dark:bg-slate-800/50 my-1" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-right md:text-left">
                      <LogOut size={16} /> {isRtl ? "خروج" : "Déconnexion"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* زر القائمة للهواتف */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 pointer-events-auto"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isNotificationsOpen && (
            <NotificationCenter 
              isRtl={isRtl} 
              onClose={() => setIsNotificationsOpen(false)} 
              notifications={notifications}
              loading={loadingNotifications}
              language={language}
            />
          )}
        </AnimatePresence>

        {/* واجهة العرض للموبايل */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="lg:hidden absolute top-[110%] left-0 right-0 mx-4 p-5 deep-glass rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/10 flex flex-col gap-2 z-50 overflow-hidden pointer-events-auto"
            >
               <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">{isRtl ? 'الرئيسية' : 'Accueil'}</Link>
               <Link href="/services" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">{isRtl ? 'خدماتنا' : 'Services'}</Link>
               <Link href="/showroom" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-indigo-650 dark:text-indigo-400 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">{isRtl ? 'معرض المنتجات 3D' : 'Showroom 3D'}</Link>
               <Link href="/bat-scanner" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-emerald-650 dark:text-emerald-400 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">{isRtl ? 'فحص التصاميم (BAT)' : 'Vérificateur (BAT)'}</Link>
               <Link href="/rewards" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">{isRtl ? 'نادي المكافآت' : 'Club VIP'}</Link>
               
               {/* روابط المفضلة والخصوصية للهواتف */}
               <Link href="/favorites" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                 <Heart size={18} className="text-red-500" /> {isRtl ? 'المفضلة' : 'Mes Favoris'}
               </Link>
               <Link href="/privacy" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-slate-500 dark:text-slate-400 flex items-center gap-2 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                 <Shield size={18} /> {isRtl ? 'سياسة الخصوصية' : 'Confidentialité'}
               </Link>
               
               <Link href="/ai-studio" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-black text-purple-650 dark:text-purple-400 flex items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl transition-colors">
                 <Sparkles size={16} className="animate-pulse" />
                 {isRtl ? "استوديو التصميم" : "Studio Design"}
               </Link>

              {!isLoggedIn ? (
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="mt-2 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md">
                  <User size={16} /> {isRtl ? 'تسجيل الدخول' : 'Connexion'}
                </Link>
              ) : (
                <div className="border-t border-slate-200/50 dark:border-slate-700/50 pt-2 mt-2">
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"><User size={16} /> {isRtl ? 'بروفيلي' : 'Mon Profil'}</Link>
                  <Link href="/payment-verify" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-bold rounded-xl text-emerald-650 dark:text-emerald-400 flex items-center gap-2 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"><FileCheck size={16} /> {isRtl ? 'تأكيد الدفع بريدي موب' : 'Vérifier paiement'}</Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="p-3.5 font-black text-yellow-600 flex items-center gap-2 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/20 transition-colors rounded-xl"><ShieldCheck size={16} /> {isRtl ? 'لوحة الإدارة' : 'Administration'}</Link>
                  )}
                  <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full text-right p-3.5 font-bold text-red-600 flex items-center gap-2 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors rounded-xl"><LogOut size={16} /> {isRtl ? 'تسجيل الخروج' : 'Déconnexion'}</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}
