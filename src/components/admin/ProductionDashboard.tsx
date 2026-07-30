"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Printer, Clock, CheckCircle, XCircle, AlertTriangle,
  User, Search, ChevronDown, ChevronUp, Play, Pause,
  FileImage, MessageSquare, RotateCcw, ArrowRight, Layers
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { toast } from "sonner";

const PRODUCTION_STAGES = [
  { id: "En attente", label: "En attente", icon: Clock, color: "bg-slate-100 text-slate-600 border-slate-200" },
  { id: "Conception", label: "Conception", icon: Layers, color: "bg-indigo-100 text-indigo-600 border-indigo-200" },
  { id: "Impression", label: "Impression", icon: Printer, color: "bg-blue-100 text-blue-600 border-blue-200" },
  { id: "Découpage", label: "Découpage", icon: FileImage, color: "bg-amber-100 text-amber-600 border-amber-200" },
  { id: "Façonnage", label: "Façonnage", icon: Layers, color: "bg-purple-100 text-purple-600 border-purple-200" },
  { id: "Contrôle qualité", label: "Contrôle qualité", icon: CheckCircle, color: "bg-emerald-100 text-emerald-600 border-emerald-200" },
  { id: "Prêt", label: "Prêt", icon: CheckCircle, color: "bg-teal-100 text-teal-600 border-teal-200" },
  { id: "Annulé", label: "Annulé", icon: XCircle, color: "bg-red-100 text-red-600 border-red-200" },
];

interface ProductionOrder {
  id: string;
  customerName: string;
  phone: string;
  wilaya: string;
  items: any[];
  total: number;
  status: string;
  designUrl?: string;
  printProofUrl?: string;
  productionNotes?: string;
  assignedTo?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt?: Timestamp;
}

interface ProductionDashboardProps {
  orders: any[];
  isRtl: boolean;
  updateOrderStatus: (orderId: string, status: string) => void;
  updateOrderProof: (orderId: string, proofUrl: string) => void;
}

export default function ProductionDashboard({
  orders,
  isRtl,
  updateOrderStatus,
  updateOrderProof,
}: ProductionDashboardProps) {
  const [filterStage, setFilterStage] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [productionNotes, setProductionNotes] = useState<Record<string, string>>({});
  const [productionLogs, setProductionLogs] = useState<Record<string, any[]>>({});

  const productionOrders = orders.filter((o) =>
    o.status !== "Terminé"
  );

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    for (const order of productionOrders.slice(0, 20)) {
      if (productionLogs[order.id]) continue;
      const q = query(
        collection(db, `orders/${order.id}/productionLog`),
        orderBy("timestamp", "asc")
      );
      const unsub = onSnapshot(q, (snap) => {
        setProductionLogs((prev) => ({
          ...prev,
          [order.id]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }));
      });
      unsubscribers.push(unsub);
    }
    return () => unsubscribers.forEach((u) => u());
  }, [orders]);

  const filteredOrders = productionOrders.filter((o) => {
    const matchesSearch =
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.phone?.includes(searchTerm);
    const matchesStage = filterStage === "all" || o.status === filterStage;
    return matchesSearch && matchesStage;
  });

  const getStageIndex = (status: string) => {
    return PRODUCTION_STAGES.findIndex((s) => s.id === status);
  };

  const handleNextStage = async (order: ProductionOrder) => {
    const currentIndex = getStageIndex(order.status);
    const activeStages = PRODUCTION_STAGES.filter((s) => s.id !== "Annulé");
    if (currentIndex < activeStages.length - 1) {
      const nextStage = activeStages[currentIndex + 1];
      await addProductionLog(order.id, order.status, nextStage.id);
      await updateOrderStatus(order.id, nextStage.id);
    }
  };

  const handlePreviousStage = async (order: ProductionOrder) => {
    const currentIndex = getStageIndex(order.status);
    if (currentIndex > 0) {
      const prevStage = PRODUCTION_STAGES[currentIndex - 1];
      await addProductionLog(order.id, order.status, prevStage.id);
      await updateOrderStatus(order.id, prevStage.id);
    }
  };

  const addProductionLog = async (orderId: string, from: string, to: string) => {
    try {
      await addDoc(collection(db, `orders/${orderId}/productionLog`), {
        from,
        to,
        timestamp: serverTimestamp(),
        operator: "admin",
      });
    } catch (e) {
      console.error("Failed to add production log:", e);
    }
  };

  const getStageColor = (status: string) => {
    const stage = PRODUCTION_STAGES.find((s) => s.id === status);
    return stage?.color || "bg-slate-100 text-slate-600";
  };

  const stats = {
    total: productionOrders.length,
    enAttente: productionOrders.filter((o) => o.status === "En attente").length,
    enProduction: productionOrders.filter((o) =>
      !["En attente", "Prêt", "Annulé", "Terminé"].includes(o.status)
    ).length,
    pret: productionOrders.filter((o) => o.status === "Prêt").length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-glass p-4 rounded-2xl border border-white/60 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Clock size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isRtl ? 'الكل' : 'Total'}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="premium-glass p-4 rounded-2xl border border-white/60 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isRtl ? 'قيد الانتظار' : 'En attente'}</p>
              <p className="text-xl font-black text-amber-600">{stats.enAttente}</p>
            </div>
          </div>
        </div>
        <div className="premium-glass p-4 rounded-2xl border border-white/60 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Printer size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isRtl ? 'في الإنتاج' : 'En production'}</p>
              <p className="text-xl font-black text-blue-600">{stats.enProduction}</p>
            </div>
          </div>
        </div>
        <div className="premium-glass p-4 rounded-2xl border border-white/60 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{isRtl ? 'جاهز' : 'Prêt'}</p>
              <p className="text-xl font-black text-emerald-600">{stats.pret}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button
          onClick={() => setFilterStage("all")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            filterStage === "all"
              ? "bg-slate-900 dark:bg-accent text-white shadow"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {isRtl ? 'الكل' : 'Tous'}
        </button>
        {PRODUCTION_STAGES.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setFilterStage(stage.id)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
              filterStage === stage.id
                ? "bg-slate-900 dark:bg-accent text-white shadow"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {stage.id}
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          placeholder={isRtl ? "بحث عن عميل..." : "Rechercher un client..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent shadow-sm text-slate-800 dark:text-slate-100"
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 premium-glass rounded-3xl">
          <Printer size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-400 font-bold">
            {isRtl ? 'لا توجد طلبات في الإنتاج' : 'Aucune commande en production'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const currentStageIdx = getStageIndex(order.status);
            const isExpanded = expandedOrder === order.id;

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-glass rounded-3xl border border-white/60 dark:border-white/5 overflow-hidden"
              >
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {order.customerName}
                        </h4>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-slate-300 shrink-0">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold">
                        {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border ${getStageColor(order.status)}`}>
                        {order.status}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-400 font-mono">{order.phone}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{order.total} DA</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{order.wilaya}</span>
                  </div>

                  <div className="mt-3 flex gap-1">
                    {PRODUCTION_STAGES.filter((s) => s.id !== "Annulé").map((stage, idx) => {
                      const isActive = idx <= currentStageIdx && order.status !== "Annulé";
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div
                          key={stage.id}
                          className={`flex-1 h-1.5 rounded-full transition-all ${
                            isActive
                              ? isCurrent
                                ? "bg-accent animate-pulse"
                                : "bg-emerald-400"
                              : "bg-slate-200 dark:bg-slate-700"
                          }`}
                          title={stage.id}
                        />
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 dark:border-slate-700"
                    >
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {PRODUCTION_STAGES.filter((s) => s.id !== "Annulé").map((stage, idx) => {
                            const isActive = idx <= currentStageIdx;
                            const isCurrent = idx === currentStageIdx;
                            const StageIcon = stage.icon;
                            return (
                              <button
                                key={stage.id}
                                onClick={() => updateOrderStatus(order.id, stage.id)}
                                className={`p-3 rounded-xl border text-center transition-all ${
                                  isActive && isCurrent
                                    ? "bg-accent text-white border-accent shadow-lg scale-105"
                                    : isActive
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 opacity-50 hover:opacity-80"
                                }`}
                              >
                                <StageIcon size={16} className="mx-auto mb-1" />
                                <span className="text-[9px] font-bold block leading-tight">{stage.id}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePreviousStage(order); }}
                            disabled={currentStageIdx <= 0}
                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-30 flex items-center justify-center gap-1"
                          >
                            <RotateCcw size={14} /> {isRtl ? 'السابق' : 'Précédent'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNextStage(order); }}
                            disabled={currentStageIdx >= PRODUCTION_STAGES.filter((s) => s.id !== "Annulé").length - 1}
                            className="flex-1 py-2.5 bg-accent text-white rounded-xl font-bold text-xs hover:bg-blue-600 transition-all disabled:opacity-30 flex items-center justify-center gap-1"
                          >
                            {isRtl ? 'التالي' : 'Suivant'} <ArrowRight size={14} />
                          </button>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                            {isRtl ? 'ملاحظات الإنتاج' : 'Notes de production'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={isRtl ? 'أضف ملاحظة...' : 'Ajouter une note...'}
                              value={productionNotes[order.id] || ""}
                              onChange={(e) =>
                                setProductionNotes((prev) => ({ ...prev, [order.id]: e.target.value }))
                              }
                              className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-accent text-slate-800 dark:text-slate-100"
                            />
                            <button
                              onClick={async () => {
                                const note = productionNotes[order.id];
                                if (!note?.trim()) return;
                                try {
                                  await updateDoc(doc(db, "orders", order.id), {
                                    productionNotes: note.trim(),
                                  });
                                  toast.success(isRtl ? 'تم حفظ الملاحظة' : 'Note enregistrée');
                                  setProductionNotes((prev) => ({ ...prev, [order.id]: "" }));
                                } catch {
                                  toast.error("Erreur");
                                }
                              }}
                              className="px-4 py-2.5 bg-slate-900 dark:bg-accent text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all"
                            >
                              {isRtl ? 'حفظ' : 'Sauvegarder'}
                            </button>
                          </div>
                        </div>

                        {order.designUrl && (
                          <div className="flex items-center gap-2">
                            <FileImage size={14} className="text-blue-500" />
                            <a
                              href={order.designUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-600 font-bold"
                            >
                              {isRtl ? 'تصميم العميل' : 'Design client'} ↗
                            </a>
                          </div>
                        )}

                        {productionLogs[order.id] && productionLogs[order.id].length > 1 && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                              {isRtl ? 'سجل الإنتاج' : 'Journal de production'}
                            </p>
                            <div className="space-y-1">
                              {productionLogs[order.id].map((log: any) => (
                                <div key={log.id} className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <ArrowRight size={10} />
                                  <span className="font-bold">{log.from}</span>
                                  <span>→</span>
                                  <span className="font-bold">{log.to}</span>
                                  <span className="text-slate-400">
                                    {log.timestamp?.seconds
                                      ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString()
                                      : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
