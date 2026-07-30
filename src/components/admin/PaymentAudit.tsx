"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { 
  ShieldCheck, AlertTriangle, Check, X, Search, FileText, 
  ExternalLink, Loader2, Award, Calendar, DollarSign, RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface PaymentAuditProps {
  orders: any[];
  isRtl: boolean;
}

export default function PaymentAudit({ orders, isRtl }: PaymentAuditProps) {
  const [filter, setFilter] = useState<"all" | "Envoyé" | "Payé" | "Refusé">("Envoyé");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Auditing states
  const [duplicateMatch, setDuplicateMatch] = useState<any | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [forcedVersement, setForcedVersement] = useState<string>("");

  useEffect(() => {
    if (selectedOrder) {
      setForcedVersement(selectedOrder.paidAmount !== undefined ? selectedOrder.paidAmount.toString() : (selectedOrder.aiVerification?.extractedAmount?.toString() || ""));
    } else {
      setForcedVersement("");
    }
  }, [selectedOrder]);

  const handleForceVersement = async () => {
    if (!selectedOrder) return;
    const val = Number(forcedVersement);
    if (isNaN(val) || val < 0) {
      toast.error(isRtl ? "يرجى إدخال مبلغ صحيح" : "Veuillez entrer un montant valide.");
      return;
    }
    setIsUpdating(true);
    try {
      const orderRef = doc(db, "orders", selectedOrder.id);
      await updateDoc(orderRef, {
        paidAmount: val
      });
      toast.success(isRtl ? "تم تحديث قيمة الدفعة بنجاح!" : "Montant payé forcé avec succès !");
      setSelectedOrder({
        ...selectedOrder,
        paidAmount: val
      });
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "فشل تحديث القيمة" : "Erreur de mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter orders having payment receipt proof
  const receiptOrders = orders.filter(o => o.paymentProofUrl && o.paymentProofUrl !== "Uploaded");

  const filteredOrders = receiptOrders.filter(o => {
    const matchesFilter = filter === "all" || o.paymentStatus === filter;
    const matchesSearch = 
      (o.customerName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (o.id.toLowerCase().includes(search.toLowerCase())) ||
      (o.baridimobTxId || "").includes(search);
    return matchesFilter && matchesSearch;
  });

  // Verify duplicate transaction IDs when order is selected
  useEffect(() => {
    if (!selectedOrder) {
      setDuplicateMatch(null);
      return;
    }

    const checkDuplicateReceipt = async () => {
      setIsCheckingDuplicate(true);
      setDuplicateMatch(null);
      try {
        const txs = [selectedOrder.baridimobTxId?.trim()];
        if (selectedOrder.aiVerification?.extractedTxId) {
          txs.push(selectedOrder.aiVerification.extractedTxId.trim());
        }

        for (const tx of txs) {
          if (!tx || tx.length < 5) continue;

          const q = query(
            collection(db, "orders"),
            where("baridimobTxId", "==", tx)
          );
          const snap = await getDocs(q);
          const conflicts = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((o: any) => o.id !== selectedOrder.id && o.paymentStatus !== "Refusé");

          if (conflicts.length > 0) {
            setDuplicateMatch(conflicts[0]);
            break;
          }
        }
      } catch (err) {
        console.error("Error checking duplicate receipt:", err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    checkDuplicateReceipt();
  }, [selectedOrder]);

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const orderRef = doc(db, "orders", selectedOrder.id);
      await updateDoc(orderRef, {
        paymentStatus: "Payé",
        status: "Conception", // Move to design/conception phase
        rejectionReason: null
      });

      // Show success
      confetti({ particleCount: 150, spread: 80 });
      toast.success(isRtl ? "تمت الموافقة على الدفع وتحديث الطلب!" : "Paiement approuvé et commande mise à jour !");
      
      // Update local selection state
      setSelectedOrder({
        ...selectedOrder,
        paymentStatus: "Payé",
        status: "Conception",
        rejectionReason: null
      });
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "فشل تحديث حالة الدفع" : "Erreur de mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    if (!rejectReason.trim()) {
      toast.error(isRtl ? "يرجى تحديد سبب الرفض" : "Veuillez entrer un motif de rejet.");
      return;
    }
    setIsUpdating(true);
    try {
      const orderRef = doc(db, "orders", selectedOrder.id);
      await updateDoc(orderRef, {
        paymentStatus: "Refusé",
        rejectionReason: rejectReason.trim(),
        // Keep status En attente, but reset paymentStatus to let them re-upload
      });

      // Send email alert via api if required, or simply show toast
      toast.success(isRtl ? "تم رفض الدفع وإعلام الزبون." : "Paiement rejeté et client notifié.");
      
      setSelectedOrder({
        ...selectedOrder,
        paymentStatus: "Refusé",
        rejectionReason: rejectReason.trim()
      });
      setShowRejectModal(false);
      setRejectReason("");
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "فشل رفض عملية الدفع" : "Erreur de rejet");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Status filters */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full md:w-auto">
          {[
            { id: "Envoyé", label: isRtl ? "قيد التدقيق" : "À vérifier" },
            { id: "Payé", label: isRtl ? "مقبول" : "Approuvés" },
            { id: "Refusé", label: isRtl ? "مرفوض" : "Rejetés" },
            { id: "all", label: isRtl ? "الكل" : "Tous" }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setFilter(opt.id as any); setSelectedOrder(null); }}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all ${
                filter === opt.id 
                  ? "bg-slate-900 dark:bg-accent text-white shadow-md"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder={isRtl ? "بحث عن عميل أو رقم عملية..." : "Chercher ID, client..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-accent text-slate-800 dark:text-slate-100"
          />
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* List of Orders */}
        <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => {
              const aiVerdict = order.aiVerification?.verdict;
              const isAltered = order.aiVerification?.isAltered;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-2xl border text-right cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? "bg-slate-900 dark:bg-accent text-white border-transparent shadow-lg scale-[1.01]"
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      order.paymentStatus === "Payé" 
                        ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                        : order.paymentStatus === "Refusé"
                        ? "bg-red-100 dark:bg-red-950/40 text-red-650 dark:text-red-400"
                        : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                    }`}>
                      {order.paymentStatus || "En attente"}
                    </span>
                  </div>

                  <h4 className={`font-black text-sm ${selectedOrder?.id === order.id ? "text-white" : "text-slate-800 dark:text-white"}`}>
                    {order.customerName}
                  </h4>
                  <p className={`text-[10px] font-bold mt-1 ${selectedOrder?.id === order.id ? "text-slate-300" : "text-slate-400"}`}>
                    Total: <strong className={selectedOrder?.id === order.id ? "text-white" : "text-slate-900 dark:text-white"}>{order.total} DA</strong> | RIP: {order.baridimobTxId || "N/A"}
                  </p>

                  {/* AI Quick indicators */}
                  {order.aiVerification && (
                    <div className="flex gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                        aiVerdict === "approved"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : aiVerdict === "needs_manual_review"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        AI: {aiVerdict || "Unknown"}
                      </span>
                      {isAltered && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle size={8} /> Modifié
                        </span>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed rounded-3xl text-slate-400">
              <FileText className="mx-auto mb-2 opacity-30" size={32} />
              <p className="text-xs font-bold">{isRtl ? "لا توجد وصولات للمراجعة في هذا القسم" : "Aucun reçu à afficher."}</p>
            </div>
          )}
        </div>

        {/* Selected Order Audit Center */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="premium-glass p-6 md:p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-xl space-y-6">
              
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-black text-lg text-slate-850 dark:text-white">
                    {isRtl ? "تفاصيل تدقيق المعاملة" : "Audit de la transaction"}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">#{selectedOrder.id}</span>
                </div>
                <a
                  href={selectedOrder.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-650 dark:text-slate-300 rounded-xl text-[10px] font-black transition-colors"
                >
                  {isRtl ? "فتح الوصل في نافذة جديدة" : "Ouvrir le reçu"} <ExternalLink size={12} />
                </a>
              </div>

              {/* Grid side-by-side: Image vs Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Receipt Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center max-h-[320px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedOrder.paymentProofUrl}
                    alt="Receipt Proof for Order"
                    className="object-contain max-h-[320px] w-full cursor-zoom-in"
                    onClick={() => window.open(selectedOrder.paymentProofUrl, "_blank")}
                  />
                </div>

                {/* Parameters audit checklist */}
                <div className="space-y-4 text-xs font-bold text-slate-650 dark:text-slate-350">
                  
                  {/* Client and total */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border space-y-2">
                    <div className="flex justify-between">
                      <span>{isRtl ? "العميل :" : "Client :"}</span>
                      <span className="text-slate-900 dark:text-white font-black">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? "الهاتف :" : "Tel :"}</span>
                      <span className="text-slate-900 dark:text-white font-mono" dir="ltr">{selectedOrder.phone}</span>
                    </div>
                    <div className="flex justify-between text-indigo-500 font-black">
                      <span>{isRtl ? "مبلغ الطلب :" : "Total Commande :"}</span>
                      <span>{selectedOrder.total} DA</span>
                    </div>
                  </div>

                  {/* Duplicate checks */}
                  {isCheckingDuplicate ? (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                      <Loader2 className="animate-spin" size={12} />
                      <span>{isRtl ? "جاري فحص المعاملات المكررة..." : "Recherche de doublons..."}</span>
                    </div>
                  ) : duplicateMatch ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-black">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{isRtl ? "تنبيه احتيال: وصل مكرر!" : "Alerte Fraude: Reçu Doublon !"}</span>
                      </div>
                      <p className="text-[9px] font-bold leading-relaxed">
                        {isRtl 
                          ? `هذا الوصل أو رقم العملية تم استخدامه مسبقاً في الطلب: #${duplicateMatch.id.slice(-6).toUpperCase()} للعميل ${duplicateMatch.customerName}`
                          : `Ce reçu/ID de transaction est identique à la commande #${duplicateMatch.id.slice(-6).toUpperCase()} de ${duplicateMatch.customerName}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] rounded-lg flex items-center gap-1">
                      <ShieldCheck size={14} />
                      <span>{isRtl ? "رقم العملية فريد ولم يستخدم مسبقاً" : "ID transaction unique (aucun doublon)."}</span>
                    </div>
                  )}

                  {/* User Input vs AI Extracted side-by-side */}
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {isRtl ? "مقارنة البيانات المدخلة والذكاء الاصطناعي:" : "Saisie Client vs Extraction IA:"}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] border-b pb-2">
                      <div>
                        <span className="block text-slate-400 font-black">{isRtl ? "المدخل من الزبون" : "Saisi par client"}</span>
                        <span className="font-mono text-slate-900 dark:text-white block mt-0.5">{selectedOrder.baridimobTxId || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-black">{isRtl ? "المستخرج بالذكاء الاصطناعي" : "Extrait par IA"}</span>
                        <span className="font-mono text-indigo-500 block mt-0.5">{selectedOrder.aiVerification?.extractedTxId || "Non extrait"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="block text-slate-400 font-black">{isRtl ? "المبلغ المتوقع" : "Attendu"}</span>
                        <span className="font-mono text-slate-900 dark:text-white block mt-0.5">{selectedOrder.total} DA</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-black">{isRtl ? "المستخرج بالذكاء" : "Extrait IA"}</span>
                        <span className="font-mono block mt-0.5 text-indigo-500 font-black">{selectedOrder.aiVerification?.extractedAmount || 0} DA</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-black">{isRtl ? "المبلغ المقبول" : "Validé"}</span>
                        <span className="font-mono block mt-0.5 text-emerald-500 font-black">{selectedOrder.paidAmount !== undefined ? `${selectedOrder.paidAmount} DA` : "N/A"}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* AI Verification Report */}
              {selectedOrder.aiVerification && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border text-xs font-bold space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {isRtl ? "تقرير فحص الحارس الذكي (AI Analysis)" : "Rapport de sécurité AI"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                      selectedOrder.aiVerification.verdict === "approved" 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      Verdict: {selectedOrder.aiVerification.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                    {selectedOrder.aiVerification.fraudAssessment}
                  </p>
                  <div className="flex gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {selectedOrder.aiVerification.extractedDate && (
                      <span>📅 Date: {selectedOrder.aiVerification.extractedDate}</span>
                    )}
                    <span>🛡️ Confidence: {selectedOrder.aiVerification.confidenceScore}%</span>
                  </div>
                </div>
              )}

              {/* Rejection Note if already rejected */}
              {selectedOrder.paymentStatus === "Refusé" && selectedOrder.rejectionReason && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold">
                  <strong>{isRtl ? "سبب الرفض السابق:" : "Motif du rejet précédent :"}</strong> {selectedOrder.rejectionReason}
                </div>
              )}

              {/* Force Paid Amount (Versement) */}
              <div className="bg-slate-55/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isRtl ? "تعديل/فرض قيمة الدفعة (Versement) :" : "Forcer le montant payé (Versement) :"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    placeholder="Ex: 2500"
                    value={forcedVersement}
                    onChange={(e) => setForcedVersement(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold font-mono"
                  />
                  <button
                    onClick={handleForceVersement}
                    disabled={isUpdating}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    {isRtl ? "حفظ" : "Forcer"}
                  </button>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                
                {selectedOrder.paymentStatus !== "Payé" && (
                  <button
                    onClick={handleApprove}
                    disabled={isUpdating}
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-transform"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    {isRtl ? "الموافقة على الدفع وتأكيد الطلب" : "Approuver le Paiement"}
                  </button>
                )}

                {selectedOrder.paymentStatus !== "Refusé" && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isUpdating}
                    className="flex-1 py-3.5 bg-red-500 hover:bg-red-650 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-500/10 flex items-center justify-center gap-1.5 transition-transform"
                  >
                    <X size={14} />
                    {isRtl ? "رفض وإلغاء المعاملة" : "Rejeter le Paiement"}
                  </button>
                )}

              </div>

            </div>
          ) : (
            <div className="text-center py-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] text-slate-400 space-y-2">
              <ShieldCheck className="mx-auto opacity-20" size={48} />
              <h4 className="font-black text-slate-700 dark:text-slate-350">{isRtl ? "بوابة التدقيق والمراجعة" : "Centre de Validation des Paiements"}</h4>
              <p className="text-xs font-bold max-w-xs mx-auto leading-relaxed">
                {isRtl ? "اختر أحد الطلبات من القائمة الجانبية لبدء فحص صورة الوصل والتحقق من صحتها." : "Sélectionnez une commande dans la liste pour démarrer l'audit."}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Reject Modal dialog */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full text-right"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                {isRtl ? "تأكيد رفض المعاملة" : "Motif de rejet"}
              </h3>
              <p className="text-xs text-slate-500 font-bold mb-4 leading-relaxed">
                {isRtl 
                  ? "يرجى كتابة سبب رفض وصل الدفع. سيتم تخزين هذا السبب وإرساله للعميل لمساعدته في رفع الوصل الصحيح."
                  : "Expliquez brièvement pourquoi le paiement est rejeté (reçu flou, montant incorrect, etc.)."}
              </p>

              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={isRtl ? "مثال: وصل الدفع غير واضح أو لم نتوصل بالمبلغ بعد..." : "Ex: Le reçu est illisible..."}
                rows={4}
                className="w-full p-4 text-xs font-bold bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-accent text-slate-850 dark:text-slate-100"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReject}
                  disabled={isUpdating}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-650 text-white rounded-xl font-black text-xs"
                >
                  {isUpdating ? <Loader2 className="animate-spin mx-auto" size={14} /> : (isRtl ? "تأكيد الرفض" : "Confirmer le rejet")}
                </button>
                <button
                  onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                  disabled={isUpdating}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-350 rounded-xl font-black text-xs"
                >
                  {isRtl ? "إلغاء" : "Annuler"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
