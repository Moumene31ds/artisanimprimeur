"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Clock, CheckCircle2, XCircle, ArrowLeft, ShoppingBag, Printer,
  Loader2, Search, ChevronDown, ChevronUp, RefreshCw, MessageCircle,
  Truck, Star, BarChart2, TrendingUp, Box, Filter, FileText, Eye, ThumbsUp, ThumbsDown
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { createTranslator, getLanguageDirection, normalizeLanguage } from "@/lib/translations";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import PullToRefresh from "@/components/PullToRefresh";
import {
  getStepIndex, isCompleted, isCancelled, isActive, statusLabel, formatDate, formatDateTime,
  type StatusHistoryEntry,
} from "@/lib/order-status";

// ============================================================
// Types
// ============================================================
interface OrderItem {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  image?: string;
  selectedOptions?: Record<string, string>;
}

interface Order {
  id: string;
  total?: number;
  status?: string;
  createdAt?: any;
  items?: OrderItem[];
  discountAmount?: number;
  appliedPromoCode?: string;
  designFileUrl?: string;
  printProofUrl?: string;
  batStatus?: string;
  batRejectionReason?: string;
  customerName?: string;
  wilaya?: string;
  notes?: string;
  customerUserId?: string;
  statusHistory?: StatusHistoryEntry[];
}

// ============================================================
// Status Config (من المكتبة الموحّدة)
// ============================================================

function getStatusBadgeStyle(status: string): string {
  if (isCancelled(status)) return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  if (isCompleted(status)) return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
  if (status === "En attente") return "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400";
  return "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
}

// ============================================================
// Sub-components
// ============================================================

function CustomerBATApproval({ orderId, isRtl }: { orderId: string; isRtl: boolean }) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/bat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? "تم اعتماد التصميم ✓" : "Design approuvé ✓");
      }
    } catch {
      toast.error(isRtl ? "فشل في الاعتماد" : "Erreur d'approbation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error(isRtl ? "المرجو إدخال سبب الرفض" : "Veuillez entrer la raison du rejet");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/bat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action: "reject",
          data: { reason: comment.trim() },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? "تم رفض التصميم - سيتم التواصل معك" : "Design rejeté - Nous vous contacterons");
      }
    } catch {
      toast.error(isRtl ? "فشل في الرفض" : "Erreur de rejet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {isRtl ? "هل التصميم النهائي مطابق لطلبك؟" : "Le design final correspond-il à votre commande ?"}
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <ThumbsUp size={14} />
          {isRtl ? "موافق" : "Approuver"}
        </button>
        <button
          onClick={handleReject}
          disabled={submitting}
          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <ThumbsDown size={14} />
          {isRtl ? "طلب تعديل" : "Révision"}
        </button>
      </div>
      <textarea
        placeholder={isRtl ? "أكتب ملاحظاتك للتعديل..." : "Écrivez vos commentaires de révision..."}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-accent text-slate-800 dark:text-slate-100"
      />
    </div>
  );
}

function OrderStepper({ status, isRtl, t }: { status: string; isRtl: boolean; t: any }) {
  if (isCancelled(status)) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mt-4">
        <XCircle size={20} className="text-red-500 flex-shrink-0" />
        <span className="text-sm font-bold text-red-600 dark:text-red-400">
          {isRtl ? "تم إلغاء هذا الطلب" : "Cette commande a été annulée"}
        </span>
      </div>
    );
  }

  const stepIndex = getStepIndex(status);
  const steps = [
    { key: "stepReceived", icon: <Package size={16} /> },
    { key: "stageConception", icon: <Box size={16} /> },
    { key: "stageImpression", icon: <Printer size={16} /> },
    { key: "stageDecoupage", icon: <FileText size={16} /> },
    { key: "stageFaconnage", icon: <Box size={16} /> },
    { key: "stageControle", icon: <CheckCircle2 size={16} /> },
    { key: "stepShipping", icon: <Truck size={16} /> },
    { key: "stepDelivered", icon: <CheckCircle2 size={16} /> },
  ];

  return (
    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/50">
      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(5, ((stepIndex) / (steps.length - 1)) * 100)}%` }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 shadow-sm"
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
      </div>
      {/* Step Icons */}
      <div className={`flex justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        {steps.map((step, idx) => {
          const done = idx <= stepIndex;
          const current = idx === stepIndex;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                done
                  ? current
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-110"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
              }`}>
                {step.icon}
              </div>
              <span className={`text-[9px] font-bold leading-tight text-center max-w-[56px] ${
                done ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-600"
              }`}>
                {t(step.key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// الخط الزمني للسجل (statusHistory) — تتبع لحظي لجميع المراحل
function StatusTimeline({
  history,
  isRtl,
}: {
  history?: StatusHistoryEntry[];
  isRtl: boolean;
}) {
  if (!history || history.length === 0) return null;

  const lang = isRtl ? "ar" : "fr";
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
        <Clock size={14} />
        {isRtl ? "سجل تتبع الطلب" : "Historique de suivi"}
      </h4>
      <div className="relative pl-5">
        <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-4">
          {history.map((entry, idx) => {
            const last = idx === history.length - 1;
            const cancelled = isCancelled(entry.status);
            const done = isCompleted(entry.status);
            return (
              <div key={idx} className="relative">
                <span className={`absolute -left-5 top-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  cancelled
                    ? "bg-red-500"
                    : done
                    ? "bg-emerald-500"
                    : last
                    ? "bg-blue-500 animate-pulse"
                    : "bg-slate-300 dark:bg-slate-600"
                }`} />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className={`text-sm font-black ${last ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {statusLabel(entry.status, lang as "ar" | "fr")}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    {formatDateTime(entry.at)}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    {entry.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  isRtl,
  t,
  onReorder,
}: {
  order: Order;
  isRtl: boolean;
  t: any;
  onReorder: (order: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = order.status || "En attente";
  const items: OrderItem[] = order.items || [];

  const whatsappMessage = encodeURIComponent(
    isRtl
      ? `مرحبا، أريد الاستفسار عن طلبي رقم #${order.id.slice(-6)}`
      : `Bonjour, je voudrais des informations sur ma commande #${order.id.slice(-6)}`
  );
  const whatsappUrl = `https://wa.me/213549179000?text=${whatsappMessage}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      className="premium-glass rounded-[2rem] border border-white/60 dark:border-white/10 shadow-lg overflow-hidden"
    >
      {/* Card Header */}
      <div className="p-6 md:p-7">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Order ID & Meta */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <span className={`text-[11px] px-3 py-1 rounded-full font-black ${getStatusBadgeStyle(status)}`}>
                {status}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {(order.total || 0).toLocaleString()} 
              </span>
              <span className="text-sm font-bold text-slate-400">DA</span>
            </div>
            {order.discountAmount && order.discountAmount > 0 && (
              <p className="text-emerald-500 font-bold text-xs mt-1">
                -{order.discountAmount} DA ({order.appliedPromoCode})
              </p>
            )}
            {order.createdAt && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                {formatDate(order.createdAt)}
              </p>
            )}
          </div>

          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isCancelled(status)
              ? "bg-red-100 dark:bg-red-900/20"
              : isCompleted(status)
              ? "bg-emerald-100 dark:bg-emerald-900/20"
              : "bg-blue-100 dark:bg-blue-900/20"
          }`}>
            {isCancelled(status) ? (
              <XCircle size={24} className="text-red-500" />
            ) : isCompleted(status) ? (
              <CheckCircle2 size={24} className="text-emerald-500" />
            ) : (
              <Clock size={24} className="text-blue-500" />
            )}
          </div>
        </div>

        {/* Progress Stepper */}
        <OrderStepper status={status} isRtl={isRtl} t={t} />

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-5 flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? t("hideItems") : t("viewItems")}
          {items.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-black">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Expandable Items Section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-800/50"
          >
            <div className="p-6 md:p-7 space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
              {/* Item List */}
              {items.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                    {isRtl ? "المنتجات المطلوبة" : "Articles commandés"}
                  </h4>
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Package size={20} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {item.name || (isRtl ? "منتج" : "Produit")}
                        </p>
                        {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(item.selectedOptions).map(([k, v]) => (
                              <span key={k} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                          {(item.price || 0).toLocaleString()} DA
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">x{item.quantity || 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-3">
                  {isRtl ? "لا توجد تفاصيل منتجات متاحة" : "Pas de détails d'articles disponibles"}
                </p>
              )}

              {/* سجل التتبع الزمني */}
              <StatusTimeline history={order.statusHistory} isRtl={isRtl} />

              {/* Additional Info */}
              {(order.wilaya || order.notes) && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2">
                  {order.wilaya && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Truck size={14} className="flex-shrink-0 text-blue-400" />
                      <span className="font-bold">{isRtl ? "الولاية:" : "Wilaya:"}</span>
                      <span className="font-black text-slate-700 dark:text-slate-200">{order.wilaya}</span>
                    </div>
                  )}
                  {order.notes && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <FileText size={14} className="flex-shrink-0 text-purple-400 mt-0.5" />
                      <span className="font-bold">{isRtl ? "ملاحظات:" : "Notes:"}</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{order.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Design File Download */}
              {order.designFileUrl && (
                <a
                  href={order.designFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <FileText size={15} />
                  {t("downloadDesign")}
                </a>
              )}

              {/* BAT - Bon à Tirer Customer Approval */}
              {(order as any).printProofUrl && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {isRtl ? "Bon à Tirer (BAT)" : "Bon à Tirer (BAT)"}
                    </h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      (order as any).batStatus === "approved"
                        ? "bg-emerald-100 text-emerald-600"
                        : (order as any).batStatus === "rejected"
                        ? "bg-red-100 text-red-600"
                        : (order as any).batStatus === "sent"
                        ? "bg-amber-100 text-amber-600 animate-pulse"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {(order as any).batStatus === "approved"
                        ? (isRtl ? "معتمد" : "Approuvé")
                        : (order as any).batStatus === "rejected"
                        ? (isRtl ? "مرفوض" : "Rejeté")
                        : (order as any).batStatus === "sent"
                        ? (isRtl ? "بانتظار موافقتك" : "Votre approbation")
                        : (isRtl ? "قيد المراجعة" : "En révision")}
                    </span>
                  </div>
                  <a
                    href={(order as any).printProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <Eye size={15} />
                    {isRtl ? "عرض التصميم النهائي" : "Voir le design final"}
                  </a>
                  {(order as any).batStatus === "sent" && (
                    <CustomerBATApproval orderId={order.id} isRtl={isRtl} />
                  )}
                  {(order as any).batStatus === "rejected" && (order as any).batRejectionReason && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/30">
                      <p className="text-[10px] font-bold text-red-500">{isRtl ? 'سبب الرفض:' : 'Raison du rejet:'}</p>
                      <p className="text-xs text-red-700 dark:text-red-400">{(order as any).batRejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions Footer */}
      <div className="px-6 pb-5 md:px-7 pt-0 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/20">
        {/* Invoice PDF */}
        <Link
          href={`/invoice/${order.id}`}
          target="_blank"
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-3"
        >
          <Printer size={14} />
          {isRtl ? "الفاتورة PDF" : "Facture PDF"}
        </Link>

        {/* WhatsApp Support */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors mt-3"
        >
          <MessageCircle size={14} />
          {t("contactSupportBtn")}
        </a>

        {/* Re-order */}
        {items.length > 0 && (
          <button
            onClick={() => onReorder(order)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors mt-3"
          >
            <RefreshCw size={14} />
            {t("reorderBtn")}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Main Page Component
// ============================================================
export default function OrdersPage() {
  const { language } = useAppStore();
  const { addToCart } = useAppStore();
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedLanguage = normalizeLanguage(language);
  const t = createTranslator(normalizedLanguage);
  const isRtl = getLanguageDirection(normalizedLanguage) === "rtl";

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("customerUserId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order)));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching orders:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [authLoading, isLoggedIn, user]);

  // Computed stats
  const stats = useMemo(() => {
    const active = orders.filter((o) => isActive(o.status || ""));
    const completed = orders.filter((o) => isCompleted(o.status || ""));
    const totalSpent = completed.reduce((sum, o) => sum + (o.total || 0), 0);
    return { active: active.length, completed: completed.length, totalSpent };
  }, [orders]);

  // Filtered & searched orders
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeFilter === "active") list = list.filter((o) => isActive(o.status || ""));
    else if (activeFilter === "completed") list = list.filter((o) => isCompleted(o.status || ""));
    else if (activeFilter === "cancelled") list = list.filter((o) => isCancelled(o.status || ""));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((o) => o.id.toUpperCase().includes(q));
    }
    return list;
  }, [orders, activeFilter, searchQuery]);

  const handleReorder = (order: Order) => {
    const items = order.items || [];
    if (items.length === 0) {
      toast.error(isRtl ? "لا توجد منتجات لإعادة الطلب" : "Pas d'articles à recommander");
      return;
    }
    items.forEach((item) => {
      addToCart({
        id: item.id || `item-${Date.now()}`,
        name: item.name || (isRtl ? "منتج" : "Produit"),
        price: item.price || 0,
        image: item.image || "",
        quantity: item.quantity || 1,
        selectedOptions: item.selectedOptions,
      });
    });
    toast.success(isRtl ? "تمت إضافة المنتجات إلى السلة!" : "Articles ajoutés au panier !");
  };

  // Filters Config
  const filters = [
    { key: "all", label: t("filterAll"), count: orders.length },
    { key: "active", label: t("filterActive"), count: orders.filter((o) => isActive(o.status || "")).length },
    { key: "completed", label: t("filterCompleted"), count: orders.filter((o) => isCompleted(o.status || "")).length },
    { key: "cancelled", label: t("filterCancelled"), count: orders.filter((o) => isCancelled(o.status || "")).length },
  ] as const;

  // Loading & Auth states
  if (loading || authLoading) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
          <Package size={32} className="text-blue-500" />
        </div>
        <Loader2 className="animate-spin text-blue-500 absolute -top-1 -right-1" size={20} />
      </div>
      <p className="text-slate-500 font-bold animate-pulse text-sm">
        {isRtl ? "جاري تحميل طلباتك..." : "Chargement de vos commandes..."}
      </p>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-slate-700">
          <ShoppingBag size={40} className="text-slate-300 dark:text-slate-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3" dir={isRtl ? "rtl" : "ltr"}>
          {isRtl ? "سجل الدخول لعرض طلباتك" : "Connectez-vous pour voir vos commandes"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium max-w-xs mx-auto" dir={isRtl ? "rtl" : "ltr"}>
          {isRtl
            ? "للوصول إلى تاريخ طلباتك، يرجى تسجيل الدخول أولاً."
            : "Veuillez vous connecter pour accéder à l'historique de vos commandes."}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-transform"
        >
          {isRtl ? "تسجيل الدخول" : "Se connecter"}
        </Link>
      </motion.div>
    </div>
  );

  return (
    <PullToRefresh onRefresh={() => window.location.reload()} language={language}>
    <div
      className={`max-w-4xl mx-auto pb-28 px-4 ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8 mt-2">
        <Link
          href="/"
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 group"
        >
          <ArrowLeft
            size={22}
            className={`transition-transform ${isRtl ? "rotate-180 group-hover:translate-x-1" : "group-hover:-translate-x-1"}`}
          />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t("myOrders")}</h1>
          <p className="text-slate-400 text-sm font-medium mt-0.5">
            {orders.length} {isRtl ? "طلب" : "commande(s)"}
          </p>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="premium-glass rounded-2xl border border-white/60 dark:border-white/10 p-4 text-center"
        >
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <BarChart2 size={18} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white">{orders.length}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5 leading-tight">
            {isRtl ? "إجمالي الطلبات" : "Total"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="premium-glass rounded-2xl border border-white/60 dark:border-white/10 p-4 text-center"
        >
          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Clock size={18} className="text-orange-500" />
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white">{stats.active}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5 leading-tight">
            {isRtl ? "قيد التنفيذ" : "En cours"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="premium-glass rounded-2xl border border-white/60 dark:border-white/10 p-4 text-center"
        >
          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-800 dark:text-white">
            {stats.totalSpent > 0 ? `${(stats.totalSpent).toLocaleString()}` : "—"}
          </p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5 leading-tight">
            {isRtl ? "إجمالي الإنفاق (DA)" : "Total dépensé (DA)"}
          </p>
        </motion.div>
      </div>

      {/* Filter Tabs + Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        {/* Tabs */}
        <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFilter === f.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Filter size={12} />
              {f.label}
              {f.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1">
          <div className={`absolute inset-y-0 ${isRtl ? "right-0 pr-4" : "left-0 pl-4"} flex items-center pointer-events-none`}>
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchOrdersPh")}
            className={`w-full ${isRtl ? "pr-10 pl-4 text-right" : "pl-10 pr-4 text-left"} py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm shadow-sm`}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-5">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 premium-glass rounded-[3rem] border border-white/60 dark:border-white/10 shadow-lg"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
                <ShoppingBag size={32} className="opacity-30 text-slate-400" />
              </div>
              <p className="text-slate-400 font-bold text-lg">{t("noOrders")}</p>
              <p className="text-slate-400/60 font-medium text-sm mt-2">
                {searchQuery
                  ? (isRtl ? "لا توجد نتائج لبحثك" : "Aucun résultat trouvé")
                  : (isRtl ? "لم تقم بأي طلب بعد" : "Aucune commande pour le moment")}
              </p>
              {!searchQuery && (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-transform shadow-lg"
                >
                  <Star size={15} />
                  {isRtl ? "اكتشف منتجاتنا" : "Découvrir nos services"}
                </Link>
              )}
            </motion.div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isRtl={isRtl}
                t={t}
                onReorder={handleReorder}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
    </PullToRefresh>
  );
}
