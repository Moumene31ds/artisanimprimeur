"use client";

import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc, 
  deleteDoc, addDoc, serverTimestamp, setDoc, getDoc 
} from "firebase/firestore";
import { 
  ShoppingBag, Settings, LayoutDashboard, Package, 
  ShieldCheck, Download, Tag, ScanLine, X, CheckCircle, Sparkles, Megaphone,
  Printer, FileImage, BarChart3, HandCoins, Crown, User, Loader2, Plus, Phone, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { GlobalLoader } from "@/components/GlobalLoader";
import { buildStatusHistory } from "@/lib/order-status";
import * as XLSX from 'xlsx';
import QRScanner from "@/components/QRScanner";

// Import modular components
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminPromo from "@/components/admin/AdminPromo";
import AdminSettings from "@/components/admin/AdminSettings";
import PaymentAudit from "@/components/admin/PaymentAudit";
import { MarketingDashboard } from "@/components/MarketingDashboard";
import { CampaignBuilder } from "@/components/CampaignBuilder";
import { buildMarketingInsight } from "@/lib/marketing-ai";
import ProductionDashboard from "@/components/admin/ProductionDashboard";
import BATWorkflowPanel from "@/components/admin/BATWorkflowPanel";
import AdminAnalyticsDashboard from "@/components/AdminAnalyticsDashboard";
import AdminDeposits from "@/components/admin/AdminDeposits";
import LoyaltyDashboard from "@/components/admin/LoyaltyDashboard";


export default function AdminPage() {
  const { language } = useAppStore();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();

  // --- حالات البيانات الحية ---
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  
  // --- حالة إعدادات الموقع الشاملة ---
  const [uiConfig, setUiConfig] = useState<any>({ 
    maintenanceMode: false, showAnnouncement: false, announcementAr: "", announcementFr: "",
    shippingOran: 400, shippingNational: 600,
    shippingLocalOran: 150, shippingLocalBordering: 350,
    collectInstructions: "",
    baridimobName: "", baridimobRip: "",
    shopPhone: "", shopAddress: "", facebookUrl: "", instagramUrl: "",
    minOrderAmount: 0,
    storeOpen: true, closedMessage: "",
    homeDeliveryExtra: 200, freeShippingThreshold: 0,
    maxFileSize: 20, allowedExtensions: "pdf, ai, psd, png, jpg",
    msgOrderReady: "Bonjour ! Votre commande chez L'Artisan Imprimeur est prête. Merci de nous contacter pour la livraison.",
    msgValidationBAT: "Bonjour, veuillez trouver ci-joint le Bon à Tirer (BAT) de votre design. Merci de confirmer pour lancer l'impression.",
    captchaMode: "slider",
    recaptchaSiteKey: "",
    recaptchaSecretKey: ""
  });
  
  // --- حالة الواجهة ---
  const [tab, setTab] = useState('dashboard');
  const [marketingInsight, setMarketingInsight] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("Tous");

  // --- حالات التعديل السريع للمنتجات ---
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>("");

  // --- حالات الماسح الضوئي ---
  const [scannedOrder, setScannedOrder] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // --- حالات مسح بطاقة العضوية (QR) ---
  const [scannedMember, setScannedMember] = useState<any | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberAwarding, setMemberAwarding] = useState(false);

  // --- حالات الإضافة ---
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "Impression", image: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState({ code: "", discountType: "percent", discountValue: 0, minAmount: 0, active: true });

  useEffect(() => {
    if (!authLoading && !isAdmin) { 
      toast.error("Accès non autorisé.");
      router.push("/");
    }
  }, [router, isAdmin, authLoading]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingData(false);
      }, (err) => {
        console.error('Orders snapshot error:', err);
        setLoadingData(false);
      });
      const unsubProducts = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        console.error('Products snapshot error:', err);
        setLoadingData(false);
      });
      const unsubPromos = onSnapshot(collection(db, 'promoCodes'), (snap) => {
        setPromoCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const unsubUi = onSnapshot(doc(db, 'settings', 'ui'), (docSnap) => {
        if (docSnap.exists()) {
          setUiConfig((prev: any) => ({ ...prev, ...docSnap.data() }));
        }
      });
      
      return () => { unsubOrders(); unsubProducts(); unsubPromos(); unsubUi(); };
    }
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setMarketingInsight(buildMarketingInsight({ orders, products, promoCodes }));
    }
  }, [isAdmin, orders, products, promoCodes]);

  if (authLoading || !isAdmin || loadingData) return <GlobalLoader />;

  // دالة حفظ الإعدادات الذكية
  const saveUiConfig = async (updatedFields: any) => {
    const mergedConfig = { ...uiConfig, ...updatedFields };
    setUiConfig(mergedConfig); 
    try {
      await setDoc(doc(db, 'settings', 'ui'), mergedConfig, { merge: true });
    } catch (error) {
      toast.error("Erreur de sauvegarde");
    }
  };

  const startEditingPrice = (id: string, currentPrice: number) => {
    setEditingProductId(id);
    setEditingPrice(currentPrice.toString());
  };

  const handleUpdatePrice = async (id: string) => {
    if (!editingPrice || isNaN(Number(editingPrice))) return toast.error("Prix invalide");
    try {
      await updateDoc(doc(db, "products", id), { price: Number(editingPrice) });
      setEditingProductId(null);
      toast.success("Prix mis à jour !");
    } catch (e) {
      toast.error("Erreur de mise à jour");
    }
  };

  const updateOrderProof = async (orderId: string, proofUrl: string) => {
    if(!proofUrl) return;
    try {
      await updateDoc(doc(db, "orders", orderId), { printProofUrl: proofUrl });
      toast.success("Bon à tirer ajouté avec succès !");
    } catch(e) {
      toast.error("Erreur lors de l'ajout du lien");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const snap = await getDoc(doc(db, "orders", orderId));
      const order = snap.data();
      const statusHistory = buildStatusHistory(order?.statusHistory, newStatus, "Mise à jour manuelle");

      await updateDoc(doc(db, "orders", orderId), { status: newStatus, statusHistory });
      toast.success(`Statut mis à jour : ${newStatus}`);

      // منح نقاط الولاء تلقائياً عند إتمام الطلب (Terminé) — idempotent وآمن
      if (newStatus === "Terminé" && order?.customerUserId && order.customerUserId !== "guest") {
        try {
          const idToken = await user!.getIdToken();
          fetch("/api/loyalty/award", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ orderId }),
          }).catch(() => {});
        } catch (awardErr) {
          console.error("Loyalty award dispatch failed:", awardErr);
        }
      }

      // إشعار فوري للزبون بتغيير الحالة (واتساب + بريد)
      try {
        fetch("/api/orders/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "status",
            order: {
              id: orderId,
              phone: order?.phone,
              customerName: order?.customerName,
              customerEmail: order?.customerEmail || null,
              status: newStatus,
            },
          }),
        }).catch(() => {});
      } catch (notifyErr) {
        console.error("Notify dispatch failed:", notifyErr);
      }

      // إشعار داخل التطبيق (جرس + تنبيه حي) للمستخدم المسجل
      const customerUserId = order?.customerUserId;
      if (customerUserId && customerUserId !== "guest") {
        try {
          const statusLabels: Record<string, { ar: string; fr: string }> = {
            "En attente": { ar: "بانتظار التأكيد", fr: "En attente" },
            "En cours": { ar: "قيد التنفيذ", fr: "En cours" },
            "Expédiée": { ar: "تم الشحن", fr: "Expédiée" },
            "Livrée": { ar: "تم التسليم", fr: "Livrée" },
            "Annulée": { ar: "ملغاة", fr: "Annulée" },
          };
          const label = statusLabels[newStatus] || { ar: newStatus, fr: newStatus };
          await addDoc(collection(db, "users", customerUserId, "notifications"), {
            title: {
              ar: "تحديث حالة طلبك",
              fr: "Mise à jour de votre commande",
            },
            message: {
              ar: `طلبك #${orderId.slice(-6).toUpperCase()} أصبح الآن: ${label.ar}`,
              fr: `Votre commande #${orderId.slice(-6).toUpperCase()} est maintenant : ${label.fr}`,
            },
            category: "orders",
            type: "status",
            orderId,
            link: "/orders",
            read: false,
            date: serverTimestamp(),
          });
        } catch (notifErr) {
          console.error("In-app notification failed:", notifErr);
        }
      }
    } catch (e) {
      toast.error("Erreur de mise à jour");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (confirm("Supprimer cette commande ?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        toast.success("Commande supprimée !");
      } catch (e) {
        toast.error("Erreur de suppression");
      }
    }
  };

  const deleteProduct = async (productId: string) => {
    if (confirm("Supprimer ce produit ?")) {
      try {
        await deleteDoc(doc(db, "products", productId));
        toast.success("Produit supprimé !");
      } catch (e) {
        toast.error("Erreur de suppression");
      }
    }
  };

  const deletePromoCode = async (codeId: string) => {
    if (confirm("Supprimer?")) {
      try {
        await deleteDoc(doc(db, "promoCodes", codeId));
        toast.success("Code promo supprimé !");
      } catch (e) {
        toast.error("Erreur de suppression");
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const audio = new Audio('/beep.mp3');
      audio.play().catch(() => console.log("Audio play blocked"));

      // إذا كان الرمز رمز عضوية (بطاقة L'Artisan الرقمية)
      if (decodedText.startsWith("LARTISAN-MEMBER:")) {
        const memberUid = decodedText.replace("LARTISAN-MEMBER:", "").trim();
        setScannedMember(null);
        setMemberLoading(true);
        try {
          const idToken = await user!.getIdToken();
          const res = await fetch(`/api/loyalty/member-lookup?by=uid&q=${encodeURIComponent(memberUid)}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setScannedMember(data.member);
            toast.success("Membre trouvé !");
          } else {
            toast.error(data.error || "Membre introuvable");
          }
        } catch (err) {
          toast.error("Erreur de recherche du membre");
        } finally {
          setMemberLoading(false);
        }
        return;
      }

      const orderRef = doc(db, "orders", decodedText);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        setScannedOrder({ id: orderSnap.id, ...orderSnap.data() });
        toast.success("Commande trouvée !");
      } else {
        toast.error("Commande introuvable dans la base de données.");
        setTimeout(() => setScannedOrder(null), 3000);
      }
    } catch (error) {
      toast.error("Erreur de lecture du code QR.");
    }
  };

  const quickUpdateStatus = async (newStatus: string) => {
    if (!scannedOrder) return;
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, "orders", scannedOrder.id), { status: newStatus });
      setScannedOrder({ ...scannedOrder, status: newStatus });
      toast.success(`Statut mis à jour : ${newStatus}`);
    } catch (error) {
      toast.error("Erreur de mise à jour");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // منح نقاط ولاء فورية للعضو عند التواجد في المطبعة
  const awardMemberBonus = async (points: number, reason: string) => {
    if (!scannedMember || memberAwarding) return;
    setMemberAwarding(true);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/loyalty/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ userId: scannedMember.id, points, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScannedMember((prev: any) => ({ ...prev, points: data.newPoints }));
        toast.success(`+${points} points accordés !`);
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur d'attribution des points");
    } finally {
      setMemberAwarding(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/upload', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ file: reader.result }) 
        });
        const data = await res.json();
        if (res.ok) {
          setNewProduct({ ...newProduct, image: data.url });
          toast.success("Image prête !");
        } else throw new Error(data.error);
      } catch (err: any) { 
        toast.error("Échec de l'upload"); 
      } finally { 
        setUploadingImage(false); 
      }
    };
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.image || !newProduct.name || !newProduct.price) return toast.error("Champs requis manquants");
    try {
      await addDoc(collection(db, "products"), { ...newProduct, price: Number(newProduct.price), active: true, createdAt: serverTimestamp() });
      setNewProduct({ name: "", price: "", category: "Impression", image: "" });
      toast.success("Produit ajouté !");
    } catch (err) { 
      toast.error("Erreur Firestore"); 
    }
  };

  const addPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "promoCodes", newPromoCode.code.toUpperCase()), { ...newPromoCode, createdAt: serverTimestamp() });
      setNewPromoCode({ code: "", discountType: "percent", discountValue: 0, minAmount: 0, active: true });
      toast.success("Code promo activé !");
    } catch (err) { 
      toast.error("Erreur d'ajout de code"); 
    }
  };

  const exportToExcel = () => {
    const data = orders.map(o => ({
      ID: o.id.slice(-6).toUpperCase(),
      Client: o.customerName,
      Phone: o.phone,
      Wilaya: o.wilaya,
      "Total (DA)": o.total,
      "Méthode Paiement": o.paymentMethod || "Non spécifié",
      "Promo Code": o.appliedPromoCode || "N/A",
      Status: o.status,
      Date: o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('fr-CA') : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commandes");
    XLSX.writeFile(wb, `LArtisan_Orders_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("Fichier Excel généré !");
  };

  const isRtl = language === "ar";

  return (
    <div className={`animate-fadeIn pb-24 max-w-6xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-900 dark:bg-accent text-white rounded-3xl shadow-2xl animate-pulse-glow">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Console d'Admin</h1>
            <p className="text-xs font-bold text-slate-400">SUPER ADMIN: {user?.email}</p>
          </div>
        </div>
        <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-emerald-600 transition-all">
          <Download size={18} /> Export Excel
        </button>
      </header>

      <div className="flex gap-2 ios-glass p-2 rounded-[2rem] mb-10 overflow-x-auto hide-scrollbar border border-white/60 dark:border-white/5 shadow-sm">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Stats' },
          { id: 'analytics', icon: BarChart3, label: isRtl ? 'تحليلات' : 'Analytics' },
          { id: 'scanner', icon: ScanLine, label: 'Scanner QR' },
          { id: 'marketing', icon: Megaphone, label: isRtl ? 'التسويق الذكي' : 'Marketing AI' },
          { id: 'audit', icon: ShieldCheck, label: isRtl ? 'تدقيق الدفع' : 'Audit Pay' },
          { id: 'deposits', icon: HandCoins, label: isRtl ? 'طلبات العربون' : 'Acomptes' },
          { id: 'orders', icon: ShoppingBag, label: 'Orders' },
          { id: 'products', icon: Package, label: 'Catalog' },
          { id: 'promo', icon: Tag, label: 'Promo' },
          { id: 'production', icon: Printer, label: isRtl ? 'الإنتاج' : 'Production' },
          { id: 'bat', icon: FileImage, label: isRtl ? 'BAT' : 'BAT' },
          { id: 'loyalty', icon: Crown, label: isRtl ? 'الولاء' : 'Fidélité' },
          { id: 'settings', icon: Settings, label: 'Site' }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => { setTab(t.id); setScannedOrder(null); setScannedMember(null); }} 
            className={`flex-1 min-w-[100px] py-4 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 transition-all ${
              tab === t.id ? 'bg-slate-900 dark:bg-accent text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==================== DASHBOARD TAB ==================== */}
        {tab === 'dashboard' && (
          <AdminDashboard key="dash" orders={orders} products={products} promoCodes={promoCodes} isRtl={isRtl} />
        )}

        {/* ==================== ANALYTICS TAB ==================== */}
        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}}>
            <AdminAnalyticsDashboard />
          </motion.div>
        )}

        {/* ==================== SCANNER TAB ==================== */}
        {tab === 'scanner' && (
          <motion.div key="scanner" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="max-w-xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Scan Rapide</h2>
              <p className="text-sm text-slate-500">Scannez le QR de la facture <span className="font-bold">(mise à jour)</span> ou la carte membre <span className="font-bold">(points de fidélité)</span>.</p>
            </div>

            {!scannedOrder && !scannedMember ? (
              <div className="premium-glass p-4 sm:p-6 rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-2xl">
                <QRScanner onScanSuccess={handleScanSuccess} />
              </div>
            ) : scannedMember ? (
              /* ====== لوحة العضو (بطاقة العضوية) ====== */
              <motion.div initial={{opacity:0, y:40}} animate={{opacity:1, y:0}} className="premium-glass p-6 sm:p-8 rounded-[2.5rem] border border-emerald-300/40 dark:border-emerald-500/20 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <button
                  onClick={() => setScannedMember(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X size={18} className="text-slate-600 dark:text-slate-300" />
                </button>

                <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
                  {scannedMember.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={scannedMember.photoUrl}
                      alt={scannedMember.displayName}
                      className="w-16 h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                      <User size={32} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">{scannedMember.displayName}</h3>
                    <span className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                      <Crown size={12} /> {scannedMember.tier}
                    </span>
                  </div>
                </div>

                {memberLoading ? (
                  <div className="py-10 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase text-slate-400">Points</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{scannedMember.points}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase text-slate-400">Dépenses</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{Number(scannedMember.lifetimeSpending).toLocaleString("fr-FR")} DA</p>
                      </div>
                    </div>

                    {(scannedMember.phone || scannedMember.email) && (
                      <div className="space-y-2 mb-6 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {scannedMember.phone && (
                          <p className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> {scannedMember.phone}</p>
                        )}
                        {scannedMember.email && (
                          <p className="flex items-center gap-2 truncate"><Mail size={13} className="text-slate-400" /> {scannedMember.email}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                        Bonus de présence en boutique
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => awardMemberBonus(10, "Bonus de présence en boutique")}
                          disabled={memberAwarding}
                          className="py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          {memberAwarding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} +10 Pts
                        </button>
                        <button
                          onClick={() => awardMemberBonus(25, "Bonus fidélité en boutique")}
                          disabled={memberAwarding}
                          className="py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          {memberAwarding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} +25 Pts
                        </button>
                      </div>
                      <button
                        onClick={() => setScannedMember(null)}
                        className="w-full py-3.5 mt-1 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Scanner un autre QR
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              /* ====== لوحة الطلب (الفاتورة) ====== */
              <motion.div initial={{opacity:0, y:50}} animate={{opacity:1, y:0}} className="premium-glass p-6 sm:p-8 rounded-[2.5rem] border border-accent/30 shadow-2xl shadow-accent/20 relative overflow-hidden">
                <button onClick={() => setScannedOrder(null)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors">
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
                    <ShoppingBag size={32} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate">{scannedOrder.customerName}</h3>
                    <p className="text-sm font-mono text-slate-500">#{scannedOrder.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total</p>
                    <p className="text-xl font-black text-accent">{scannedOrder.total} DA</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-slate-400 uppercase">Statut Actuel</p>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">{scannedOrder.status}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase text-center mb-4">Action Rapide (Mise à jour)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => quickUpdateStatus("Conception")} disabled={isUpdatingStatus}
                      className="py-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-2xl font-black transition-colors"
                    >
                      En Conception
                    </button>
                    <button 
                      onClick={() => quickUpdateStatus("Prêt")} disabled={isUpdatingStatus}
                      className="py-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle size={18} /> Prêt / Livré
                    </button>
                  </div>
                  <button 
                    onClick={() => setScannedOrder(null)}
                    className="w-full py-4 mt-2 bg-slate-900 text-white rounded-2xl font-bold shadow-lg"
                  >
                    Scanner un autre QR
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ==================== MARKETING TAB ==================== */}
        {tab === 'marketing' && (
          <motion.div key="marketing" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}} className="space-y-8">
            <div className="rounded-[2.5rem] border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Sparkles size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{isRtl ? 'ذكاء اصطناعي للتسويق' : 'Marketing IA'}</p>
                  <h2 className="text-2xl font-black">{marketingInsight?.headline || (isRtl ? 'تحليل تلقائي جاهز' : 'Analyse automatique prête')}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">{marketingInsight?.body || (isRtl ? 'اعتمد على بيانات الطلبات والخصومات لتوليد رسائل تسويقية ذات تأثير.' : 'Basez vos campagnes sur les commandes, produits et promos déjà en place.')}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="premium-glass rounded-[2.5rem] p-6">
                <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">{isRtl ? 'أفكار سريعة' : 'Conseils instantanés'}</p>
                <div className="space-y-3">
                  {(marketingInsight?.focus || []).map((item: string, idx: number) => (
                    <div key={item} className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
                      {idx + 1}. {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="premium-glass rounded-[2.5rem] p-6">
                <CampaignBuilder onCampaignCreate={() => toast.success(isRtl ? 'تم إنشاء الحملة' : 'Campagne créée')} />
              </div>
            </div>
            <MarketingDashboard />
          </motion.div>
        )}

        {/* ==================== AUDIT TAB ==================== */}
        {tab === 'audit' && (
          <motion.div key="audit" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}}>
            <PaymentAudit orders={orders} isRtl={isRtl} />
          </motion.div>
        )}

        {/* ==================== DEPOSITS TAB ==================== */}
        {tab === 'deposits' && (
          <motion.div key="deposits" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}}>
            <AdminDeposits isRtl={isRtl} />
          </motion.div>
        )}

        {/* ==================== ORDERS TAB ==================== */}
        {tab === 'orders' && (
          <AdminOrders 
            orders={orders}
            isRtl={isRtl}
            orderSearch={orderSearch}
            setOrderSearch={setOrderSearch}
            orderStatusFilter={orderStatusFilter}
            setOrderStatusFilter={setOrderStatusFilter}
            updateOrderProof={updateOrderProof}
            updateOrderStatus={updateOrderStatus}
            deleteOrder={deleteOrder}
          />
        )}

        {/* ==================== PRODUCTS TAB ==================== */}
        {tab === 'products' && (
          <AdminProducts 
            products={products}
            newProduct={newProduct}
            setNewProduct={setNewProduct}
            uploadingImage={uploadingImage}
            handleImageUpload={handleImageUpload}
            saveProduct={saveProduct}
            editingProductId={editingProductId}
            setEditingProductId={setEditingProductId}
            editingPrice={editingPrice}
            setEditingPrice={setEditingPrice}
            startEditingPrice={startEditingPrice}
            handleUpdatePrice={handleUpdatePrice}
            deleteProduct={deleteProduct}
          />
        )}

        {/* ==================== PROMO CODES TAB ==================== */}
        {tab === 'promo' && (
          <AdminPromo 
            promoCodes={promoCodes}
            newPromoCode={newPromoCode}
            setNewPromoCode={setNewPromoCode}
            addPromoCode={addPromoCode}
            deletePromoCode={deletePromoCode}
          />
        )}
        
        {/* ==================== PRODUCTION TAB ==================== */}
        {tab === 'production' && (
          <motion.div key="production" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                {isRtl ? 'ورشة الإنتاج' : 'Atelier de Production'}
              </h2>
              <p className="text-slate-500">{isRtl ? 'تتبع الطلبات في مراحل الإنتاج' : 'Suivi des commandes en production'}</p>
            </div>
            <ProductionDashboard
              orders={orders}
              isRtl={isRtl}
              updateOrderStatus={updateOrderStatus}
              updateOrderProof={updateOrderProof}
            />
          </motion.div>
        )}

        {/* ==================== BAT WORKFLOW TAB ==================== */}
        {tab === 'bat' && (
          <motion.div key="bat" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                {isRtl ? 'اعتماد التصاميم (BAT)' : 'Validation des BAT'}
              </h2>
              <p className="text-slate-500">{isRtl ? 'إرسال واعتماد Bon à Tirer قبل الطباعة' : 'Envoyer et approuver les BAT avant impression'}</p>
            </div>
            <BATWorkflowPanel
              orders={orders}
              isRtl={isRtl}
              updateOrderProof={updateOrderProof}
              updateOrderStatus={updateOrderStatus}
            />
          </motion.div>
        )}

        {/* ==================== LOYALTY TAB ==================== */}
        {tab === 'loyalty' && (
          <motion.div key="loyalty" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-15}}>
            <LoyaltyDashboard isRtl={isRtl} />
          </motion.div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {tab === 'settings' && (
          <AdminSettings 
            uiConfig={uiConfig}
            setUiConfig={setUiConfig}
            saveUiConfig={saveUiConfig}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
