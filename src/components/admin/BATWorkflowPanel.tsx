"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileImage, CheckCircle, XCircle, Clock, Send,
  MessageSquare, Eye, ThumbsUp, ThumbsDown, Loader2, Upload
} from "lucide-react";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, Timestamp, getDoc
} from "firebase/firestore";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface BATOrder {
  id: string;
  customerName: string;
  customerUserId?: string;
  phone: string;
  wilaya: string;
  items: any[];
  total: number;
  status: string;
  designUrl?: string;
  printProofUrl?: string;
  batStatus?: "pending" | "sent" | "approved" | "rejected" | "revision";
  batSentAt?: Timestamp;
  batApprovedAt?: Timestamp;
  batComments?: string;
  batRejectionReason?: string;
  batVersion?: number;
}

interface BATWorkflowPanelProps {
  orders: any[];
  isRtl: boolean;
  updateOrderProof: (orderId: string, proofUrl: string) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
}

export default function BATWorkflowPanel({
  orders,
  isRtl,
  updateOrderProof,
  updateOrderStatus,
}: BATWorkflowPanelProps) {
  const { language } = useAppStore();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [batProofUrl, setBatProofUrl] = useState<Record<string, string>>({});
  const [batComments, setBatComments] = useState<Record<string, string>>({});
  const [sendingBat, setSendingBat] = useState<Record<string, boolean>>({});
  const [batAuditLog, setBatAuditLog] = useState<Record<string, any[]>>({});

  const batOrders = orders.filter((o) =>
    ["En attente", "Conception", "Impression"].includes(o.status)
  );

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    for (const order of batOrders.slice(0, 20)) {
      const q = query(
        collection(db, `orders/${order.id}/batAudit`),
        orderBy("timestamp", "desc")
      );
      const unsub = onSnapshot(q, (snap) => {
        setBatAuditLog((prev) => ({
          ...prev,
          [order.id]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        }));
      });
      unsubscribers.push(unsub);
    }
    return () => unsubscribers.forEach((u) => u());
  }, [orders]);

  const filteredOrders = batOrders.filter((o) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending_bat") return !o.printProofUrl;
    if (filterStatus === "waiting_approval") return o.printProofUrl && (!o.batStatus || o.batStatus === "sent");
    if (filterStatus === "approved") return o.batStatus === "approved";
    if (filterStatus === "rejected") return o.batStatus === "rejected" || o.batStatus === "revision";
    return true;
  });

  const handleSendBAT = async (order: BATOrder) => {
    const proofUrl = batProofUrl[order.id];
    if (!proofUrl?.trim()) {
      toast.error(isRtl ? 'المرجو إدخال رابط BAT' : 'Veuillez entrer le lien BAT');
      return;
    }

    setSendingBat((prev) => ({ ...prev, [order.id]: true }));
    try {
      await updateOrderProof(order.id, proofUrl);
      await updateDoc(doc(db, "orders", order.id), {
        batStatus: "sent",
        batVersion: (order.batVersion || 0) + 1,
        batSentAt: serverTimestamp(),
        batComments: "",
      });

      await addDoc(collection(db, `orders/${order.id}/batAudit`), {
        action: "bat_sent",
        proofUrl,
        version: (order.batVersion || 0) + 1,
        timestamp: serverTimestamp(),
        operator: "admin",
      });

      if (order.phone) {
        const token = await getAuth().currentUser?.getIdToken();
        fetch("/api/whatsapp/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "bat_notification",
            phone: order.phone,
            data: {
              customerName: order.customerName,
              orderId: order.id,
              batUrl: proofUrl,
            },
          }),
        }).catch(() => {});
      }

      toast.success(isRtl ? 'تم إرسال BAT للعميل' : 'BAT envoyé au client');
      setBatProofUrl((prev) => ({ ...prev, [order.id]: "" }));
    } catch (error) {
      toast.error(isRtl ? 'فشل في إرسال BAT' : 'Erreur lors de l\'envoi du BAT');
    } finally {
      setSendingBat((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleSendRevision = async (order: BATOrder) => {
    const proofUrl = batProofUrl[order.id];
    if (!proofUrl?.trim()) {
      toast.error(isRtl ? 'المرجو إدخال رابط BAT المعدل' : 'Veuillez entrer le lien BAT révisé');
      return;
    }

    setSendingBat((prev) => ({ ...prev, [order.id]: true }));
    try {
      await updateOrderProof(order.id, proofUrl);
      await updateDoc(doc(db, "orders", order.id), {
        batStatus: "sent",
        batVersion: (order.batVersion || 0) + 1,
        batSentAt: serverTimestamp(),
        batComments: "",
      });

      await addDoc(collection(db, `orders/${order.id}/batAudit`), {
        action: "bat_revision_sent",
        proofUrl,
        version: (order.batVersion || 0) + 1,
        timestamp: serverTimestamp(),
        operator: "admin",
      });

      toast.success(isRtl ? 'تم إرسال التعديل للعميل' : 'Version révisée envoyée');
      setBatProofUrl((prev) => ({ ...prev, [order.id]: "" }));
    } catch (error) {
      toast.error(isRtl ? 'فشل في إرسال التعديل' : 'Erreur lors de l\'envoi');
    } finally {
      setSendingBat((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleMarkApproved = async (order: BATOrder) => {
    try {
      await updateDoc(doc(db, "orders", order.id), {
        batStatus: "approved",
        batApprovedAt: serverTimestamp(),
      });
      await addDoc(collection(db, `orders/${order.id}/batAudit`), {
        action: "bat_approved",
        timestamp: serverTimestamp(),
        operator: "admin",
      });
      await updateOrderStatus(order.id, "Impression");
      toast.success(isRtl ? 'تم اعتماد BAT وبدء الطباعة' : 'BAT approuvé, impression lancée');
    } catch {
      toast.error("Erreur");
    }
  };

  const handleRejectBAT = async (order: BATOrder) => {
    const rejectionReason = batComments[order.id] || "";
    if (!rejectionReason.trim()) {
      toast.error(isRtl ? 'المرجو إدخال سبب الرفض' : 'Veuillez entrer la raison du rejet');
      return;
    }
    try {
      await updateDoc(doc(db, "orders", order.id), {
        batStatus: "rejected",
        batRejectionReason: rejectionReason.trim(),
        batComments: rejectionReason.trim(),
      });
      await addDoc(collection(db, `orders/${order.id}/batAudit`), {
        action: "bat_rejected",
        reason: rejectionReason.trim(),
        timestamp: serverTimestamp(),
        operator: "admin",
      });
      toast.success(isRtl ? 'تم رفض BAT' : 'BAT rejeté');
      setBatComments((prev) => ({ ...prev, [order.id]: "" }));
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { id: "all", label: isRtl ? "الكل" : "Tous" },
          { id: "pending_bat", label: isRtl ? "بانتظار BAT" : "En attente BAT" },
          { id: "waiting_approval", label: isRtl ? "بانتظار الموافقة" : "En attente d'approbation" },
          { id: "approved", label: isRtl ? "مقبول" : "Approuvé" },
          { id: "rejected", label: isRtl ? "مرفوض" : "Rejeté" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
              filterStatus === f.id
                ? "bg-slate-900 dark:bg-accent text-white shadow"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 premium-glass rounded-3xl">
          <FileImage size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-400 font-bold">
            {isRtl ? 'لا توجد طلبات للموافقة على BAT' : 'Aucune commande en attente de BAT'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">
                      {order.customerName}
                    </h4>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-mono text-slate-600 dark:text-slate-300">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold">{order.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.designUrl && (
                    <a
                      href={order.designUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors"
                      title={isRtl ? 'تصميم العميل' : 'Design client'}
                    >
                      <Eye size={16} />
                    </a>
                  )}
                  <span
                    className={`text-[10px] font-black px-3 py-1.5 rounded-xl border ${
                      order.batStatus === "approved"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : order.batStatus === "rejected" || order.batStatus === "revision"
                        ? "bg-red-50 text-red-600 border-red-200"
                        : order.printProofUrl
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {order.batStatus === "approved"
                      ? (isRtl ? "مقبول" : "Approuvé")
                      : order.batStatus === "rejected"
                      ? (isRtl ? "مرفوض" : "Rejeté")
                      : order.batStatus === "revision"
                      ? (isRtl ? "تعديل" : "Révision")
                      : order.printProofUrl
                      ? (isRtl ? "بإنتظار الموافقة" : "En attente")
                      : (isRtl ? "بدون BAT" : "Pas de BAT")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      order.batStatus === "rejected" || order.batStatus === "revision"
                        ? isRtl ? "رابط BAT المعدل..." : "Lien BAT révisé..."
                        : isRtl ? "رابط BAT (URL الصورة)..." : "Lien BAT (URL de l'image)..."
                    }
                    value={batProofUrl[order.id] || ""}
                    onChange={(e) =>
                      setBatProofUrl((prev) => ({ ...prev, [order.id]: e.target.value }))
                    }
                    className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-accent text-slate-800 dark:text-slate-100"
                  />
                  <button
                    onClick={() =>
                      order.batStatus === "rejected" || order.batStatus === "revision"
                        ? handleSendRevision(order as BATOrder)
                        : handleSendBAT(order as BATOrder)
                    }
                    disabled={sendingBat[order.id]}
                    className="px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl font-bold text-xs hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingBat[order.id] ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {order.batStatus === "rejected" || order.batStatus === "revision"
                      ? (isRtl ? "إرسال التعديل" : "Révision")
                      : (isRtl ? "إرسال BAT" : "Envoyer BAT")}
                  </button>
                </div>

                {order.batStatus === "rejected" && order.batRejectionReason && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl">
                    <p className="text-[10px] font-bold text-red-500 uppercase mb-1">
                      {isRtl ? 'سبب الرفض' : 'Raison du rejet'}:
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400">{order.batRejectionReason}</p>
                  </div>
                )}

                {order.printProofUrl && order.batStatus !== "approved" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkApproved(order as BATOrder)}
                      className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ThumbsUp size={14} />
                      {isRtl ? 'اعتماد' : 'Approuver'}
                    </button>
                    <button
                      onClick={() => handleRejectBAT(order as BATOrder)}
                      className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ThumbsDown size={14} />
                      {isRtl ? 'رفض' : 'Rejeter'}
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      order.batStatus === "rejected"
                        ? isRtl ? "أضف ملاحظة للتصحيح..." : "Ajouter une note de correction..."
                        : isRtl ? "ملاحظات BAT..." : "Commentaires BAT..."
                    }
                    value={batComments[order.id] || ""}
                    onChange={(e) =>
                      setBatComments((prev) => ({ ...prev, [order.id]: e.target.value }))
                    }
                    className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] outline-none focus:ring-1 focus:ring-accent text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {batAuditLog[order.id] && batAuditLog[order.id].length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                    {isRtl ? 'سجل BAT' : 'Journal BAT'}
                  </p>
                  <div className="space-y-1">
                    {batAuditLog[order.id].slice(0, 5).map((log: any) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-2 text-[10px] text-slate-500"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.action === "bat_approved"
                              ? "bg-emerald-400"
                              : log.action === "bat_rejected"
                              ? "bg-red-400"
                              : "bg-blue-400"
                          }`}
                        />
                        <span className="font-medium">
                          {log.action === "bat_sent"
                            ? isRtl ? "إرسال BAT" : "BAT envoyé"
                            : log.action === "bat_revision_sent"
                            ? isRtl ? "إرسال تعديل" : "Révision envoyée"
                            : log.action === "bat_approved"
                            ? isRtl ? "تم الاعتماد" : "Approuvé"
                            : log.action === "bat_rejected"
                            ? isRtl ? "مرفوض" : "Rejeté"
                            : log.action}
                        </span>
                        {log.version && (
                          <span className="font-mono text-slate-400">v{log.version}</span>
                        )}
                        {log.reason && (
                          <span className="text-red-400">- {log.reason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
