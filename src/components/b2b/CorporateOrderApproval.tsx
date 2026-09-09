"use client";

import React, { useState } from "react";
import { B2BOrderApproval } from "@/lib/b2b-types";
import { 
  CheckCircle2, XCircle, Clock, Building2, User, 
  ArrowRight, Check, X, Eye, FileText, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

interface CorporateOrderApprovalProps {
  orders: B2BOrderApproval[];
  onApprove: (orderId: string) => Promise<void>;
  onReject: (orderId: string, reason: string) => Promise<void>;
  isRtl: boolean;
}

export default function CorporateOrderApproval({
  orders,
  onApprove,
  onReject,
  isRtl,
}: CorporateOrderApprovalProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingOrders = orders.filter((o) => o.status === "pending_approval");
  const processedOrders = orders.filter((o) => o.status !== "pending_approval");

  const handleConfirmApprove = async (id: string) => {
    try {
      triggerHapticFeedback("medium");
    } catch {}
    setProcessingId(id);
    try {
      await onApprove(id);
      toast.success(isRtl ? "تم اعتماد الطلب بنجاح ونقله للطباعة!" : "Commande B2B approuvée avec succès !");
    } catch {
      toast.error(isRtl ? "فشل اعتماد الطلب" : "Erreur lors de l'approbation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error(isRtl ? "يرجى كتابة سبب الرفض" : "Veuillez préciser la raison du rejet");
      return;
    }
    setProcessingId(id);
    try {
      await onReject(id, rejectReason);
      toast.info(isRtl ? "تم رفض الطلب وإشعار الفرع" : "Commande B2B refusée.");
      setRejectingId(null);
      setRejectReason("");
    } catch {
      toast.error(isRtl ? "فشل رفض الطلب" : "Erreur lors du rejet");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              {isRtl ? "طلبات الفروع المعلقة بانتظار موافقتك" : "Commandes en Attente de Validation"}
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black">
            {pendingOrders.length} {isRtl ? "معلقة" : "en attente"}
          </span>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {isRtl ? "لا توجد طلبات معلقة حالياً" : "Toutes les demandes sont traitées"}
            </h4>
            <p className="text-xs text-slate-400">
              {isRtl ? "تمت معالجة ومراجعة جميع طلبات الفروع." : "Aucune commande de succursale en attente."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => {
              const isBusy = processingId === order.orderId;
              return (
                <div
                  key={order.orderId}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{order.orderId.slice(-6).toUpperCase()}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-black flex items-center gap-1">
                        <Building2 size={12} />
                        {order.branchName || (isRtl ? "الفرع الرئيسي" : "Siège")}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{order.itemsSummary}</h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={13} /> {order.requestedByName}
                      </span>
                      <span>•</span>
                      <span>{order.itemsCount} {isRtl ? "بنود" : "articles"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-start md:text-end shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {isRtl ? "المبلغ المطلوب" : "Montant"}
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {order.total.toLocaleString()} <span className="text-xs text-accent">DA</span>
                      </span>
                    </div>

                    {rejectingId === order.orderId ? (
                      <div className="flex flex-col gap-2 w-full md:w-64 animate-fadeIn">
                        <input
                          type="text"
                          placeholder={isRtl ? "سبب الرفض..." : "Motif du refus..."}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="p-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(order.orderId)}
                            disabled={isBusy}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                          >
                            {isRtl ? "تأكيد الرفض" : "Confirmer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                          >
                            {isRtl ? "إلغاء" : "Annuler"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmApprove(order.orderId)}
                          disabled={isBusy}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                        >
                          <Check size={14} />
                          {isRtl ? "موافقة" : "Approuver"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(order.orderId)}
                          disabled={isBusy}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                        >
                          <X size={14} />
                          {isRtl ? "رفض" : "Refuser"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Processed History */}
      {processedOrders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {isRtl ? "سجل الموافقات والقرارات السابقة" : "Historique des Décisions Récentes"}
          </h4>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 overflow-hidden text-xs">
            {processedOrders.slice(0, 5).map((order) => (
              <div key={order.orderId} className="p-3.5 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{order.itemsSummary}</span>
                  <span className="text-[11px] text-slate-400">
                    {order.branchName} • {order.requestedByName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {order.total.toLocaleString()} DA
                  </span>
                  {order.status === "approved" ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      ✓ {isRtl ? "معتمد" : "Validé"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[11px]">
                      ✕ {isRtl ? "مرفوض" : "Refusé"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
