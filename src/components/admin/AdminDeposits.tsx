"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  HandCoins, Check, X, Search, Loader2, Inbox, Clock, ShieldCheck,
  ShieldX, User, Wallet, Mail, ChevronDown, Send
} from "lucide-react";
import { toast } from "sonner";

interface DepositRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: any;
  updatedAt?: any;
  approvedBy?: string;
  approvedAt?: any;
  approvedAmount?: number;
  adminNote?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

interface AdminDepositsProps {
  isRtl: boolean;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminDeposits({ isRtl }: AdminDepositsProps) {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DepositRequest | null>(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveAmount, setApproveAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const q = query(collection(db, "depositRequests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DepositRequest));
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selected) {
      setApproveAmount(String(selected.amount || ""));
      setAdminNote("");
      setRejectReason("");
    }
  }, [selected]);

  const counts = {
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  const filtered = requests.filter(r => {
    const matchesFilter = filter === "all" || r.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (r.userName || "").toLowerCase().includes(q) ||
      (r.userEmail || "").toLowerCase().includes(q) ||
      (r.userId || "").toLowerCase().includes(q) ||
      String(r.amount || "").includes(q);
    return matchesFilter && matchesSearch;
  });

  const fmtDate = (val: any) => {
    if (!val) return "—";
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString(isRtl ? "ar-DZ" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // إرسال إشعار ثنائي اللغة للزبون بعد قرار الإدارة
  const notifyUser = async (req: DepositRequest, titleAr: string, titleFr: string, msgAr: string, msgFr: string) => {
    try {
      await addDoc(collection(db, `users/${req.userId}/notifications`), {
        title: { ar: titleAr, fr: titleFr },
        message: { ar: msgAr, fr: msgFr },
        category: "billing",
        type: "deposit",
        read: false,
        link: "/payment-verify",
        date: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to notify user:", e);
    }
  };

  const openApprove = (req: DepositRequest) => {
    setSelected(req);
    setApproveAmount(String(req.amount || ""));
    setAdminNote("");
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!selected) return;
    const val = Number(approveAmount);
    if (isNaN(val) || val < 0) {
      toast.error(isRtl ? "يرجى إدخال مبلغ عربون صحيح" : "Veuillez entrer un montant d'acompte valide.");
      return;
    }
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "depositRequests", selected.id), {
        status: "approved",
        approvedAmount: val,
        adminNote: adminNote.trim() || null,
        approvedBy: "admin",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await notifyUser(
        selected,
        "تمت الموافقة على طلب العربون المخصص ✓",
        "Acompte personnalisé approuvé ✓",
        `تهانينا! وافقت الإدارة على قيمة عربون مخفّضة قدرها ${val} دج لطلباتك القادمة. يمكنك الآن دفع هذا المبلغ لبدء الطباعة.`,
        `L'administration a approuvé un acompte personnalisé de ${val} DA pour vos prochaines commandes. Vous pouvez maintenant payer ce montant pour lancer l'impression.`
      );

      setShowApproveModal(false);
      setSelected(null);
      toast.success(isRtl ? "تمت الموافقة على طلب العربون وإشعار الزبون" : "Acompte approuvé et client notifié !");
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل الموافقة على الطلب" : "Erreur lors de l'approbation");
    } finally {
      setIsUpdating(false);
    }
  };

  const openReject = (req: DepositRequest) => {
    setSelected(req);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      toast.error(isRtl ? "يرجى كتابة سبب الرفض" : "Veuillez entrer un motif de rejet.");
      return;
    }
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "depositRequests", selected.id), {
        status: "rejected",
        rejectionReason: rejectReason.trim(),
        rejectedBy: "admin",
        updatedAt: serverTimestamp(),
      });

      await notifyUser(
        selected,
        "تم رفض طلب العربون المخصص",
        "Acompte personnalisé refusé",
        `للأسف لم تتم الموافقة على طلب العربون المخفّض الذي أرسلته. السبب: ${rejectReason.trim()}. يرجى التواصل معنا أو إعادة المحاولة بمبلغ أعلى.`,
        `Malheureusement, votre demande d'acompte personnalisé a été refusée. Raison : ${rejectReason.trim()}. Contactez-nous ou réessayez avec un montant supérieur.`
      );

      setShowRejectModal(false);
      setSelected(null);
      toast.success(isRtl ? "تم رفض الطلب وإشعار الزبون" : "Demande rejetée et client notifié.");
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? "فشل رفض الطلب" : "Erreur lors du rejet");
    } finally {
      setIsUpdating(false);
    }
  };

  const statusBadge = (r: DepositRequest) => {
    if (r.status === "approved") {
      return (
        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black flex items-center gap-1">
          <Check size={10} /> {isRtl ? "مقبول" : "Approuvé"}
        </span>
      );
    }
    if (r.status === "rejected") {
      return (
        <span className="px-2 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black flex items-center gap-1">
          <X size={10} /> {isRtl ? "مرفوض" : "Refusé"}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black flex items-center gap-1 animate-pulse">
        <Clock size={10} /> {isRtl ? "قيد المراجعة" : "En attente"}
      </span>
    );
  };

  const filters: { id: StatusFilter; label: string; count: number; color: string }[] = [
    { id: "pending", label: isRtl ? "قيد المراجعة" : "En attente", count: counts.pending, color: "text-amber-500" },
    { id: "approved", label: isRtl ? "مقبولة" : "Approuvés", count: counts.approved, color: "text-emerald-500" },
    { id: "rejected", label: isRtl ? "مرفوضة" : "Refusés", count: counts.rejected, color: "text-red-500" },
    { id: "all", label: isRtl ? "الكل" : "Tous", count: requests.length, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      {/* بطاقة ترحيبية */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white border border-white/10 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-3.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/20">
            <HandCoins size={28} className="text-emerald-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {isRtl ? "طلبات العربون المخصص للزبائن" : "Demandes d'acompte personnalisées"}
            </h2>
            <p className="text-xs text-emerald-100/70 mt-1 max-w-xl leading-relaxed">
              {isRtl
                ? "يرسل الزبون طلباً لتخفيض قيمة العربون (Versement) على طلباته. قم بمراجعة الطلب ثم الموافقة أو الرفض — وسيُشعَر الزبون فوراً."
                : "Les clients demandent un acompte réduit sur leurs commandes. Examinez puis approuvez ou refusez — le client est notifié instantanément."}
            </p>
          </div>
        </div>

        {/* إحصاءات */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          {filters.map(f => (
            <div key={f.id} className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
              <p className={`text-2xl font-black ${f.color}`}>{f.count}</p>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-0.5">{f.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* البحث والفلاتر */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto hide-scrollbar">
          {filters.map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filter === opt.id
                  ? "bg-slate-900 dark:bg-accent text-white shadow-md"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder={isRtl ? "بحث عن عميل أو بريد أو مبلغ..." : "Rechercher client, email, montant..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-accent text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* قائمة الطلبات */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 premium-glass rounded-[2rem] border border-white/40 dark:border-slate-900/40">
          <Inbox size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-black text-slate-500 dark:text-slate-400">
            {isRtl ? "لا توجد طلبات عربون في هذا القسم" : "Aucune demande d'acompte ici"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(req => (
              <motion.div
                layout
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-400/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-800 dark:text-white">
                        {req.userName || isRtl ? "زبون" : "Client"}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Mail size={9} /> {req.userEmail || "—"}
                      </p>
                    </div>
                    {statusBadge(req)}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      {req.amount} DA
                    </span>
                    {req.status === "approved" && req.approvedAmount !== undefined && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        {isRtl ? "المعتمد: " : "Validé: "}{req.approvedAmount} DA
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">#{req.id.slice(-6).toUpperCase()}</span>
                    <span className="text-[10px] text-slate-400 font-bold">· {fmtDate(req.createdAt)}</span>
                  </div>

                  {req.reason && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 leading-relaxed border border-slate-100 dark:border-slate-800">
                      <span className="font-black">{isRtl ? "سبب الطلب: " : "Motif : "}</span>
                      {req.reason}
                    </p>
                  )}

                  {req.status === "rejected" && req.rejectionReason && (
                    <p className="text-[11px] text-red-500 mt-2 bg-red-500/5 rounded-xl p-2.5 leading-relaxed border border-red-500/15">
                      <span className="font-black">{isRtl ? "سبب الرفض: " : "Motif du refus : "}</span>
                      {req.rejectionReason}
                    </p>
                  )}

                  {req.status === "approved" && req.adminNote && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 bg-emerald-500/5 rounded-xl p-2.5 leading-relaxed border border-emerald-500/15">
                      <span className="font-black">{isRtl ? "ملاحظة الإدارة: " : "Note admin : "}</span>
                      {req.adminNote}
                    </p>
                  )}
                </div>

                {req.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openApprove(req)}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={13} /> {isRtl ? "موافقة" : "Approuver"}
                    </button>
                    <button
                      onClick={() => openReject(req)}
                      className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <X size={13} /> {isRtl ? "رفض" : "Refuser"}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* نافذة الموافقة */}
      <AnimatePresence>
        {showApproveModal && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {isRtl ? "الموافقة على العربون المخصص" : "Approuver l'acompte"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    {selected.userName} · {selected.amount} DA
                  </p>
                </div>
              </div>

              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                {isRtl ? "قيمة العربون المعتمدة (DA)" : "Montant d'acompte validé (DA)"}
              </label>
              <input
                type="number"
                value={approveAmount}
                onChange={e => setApproveAmount(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-black text-sm mb-4"
              />

              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                {isRtl ? "ملاحظة للزبون (اختياري)" : "Note au client (optionnel)"}
              </label>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={2}
                placeholder={isRtl ? "مثال: تمت الموافقة بناءً على ثقة متبادلة" : "Ex: Approuvé en tant que client fidèle"}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-100 mb-5"
              />

              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isUpdating}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Send size={13} />}
                  {isRtl ? "تأكيد الموافقة وإشعار الزبون" : "Approuver & notifier"}
                </button>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={isUpdating}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs cursor-pointer"
                >
                  {isRtl ? "إلغاء" : "Annuler"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة الرفض */}
      <AnimatePresence>
        {showRejectModal && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-2xl">
                  <ShieldX size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {isRtl ? "رفض طلب العربون" : "Refuser l'acompte"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    {selected.userName} · {selected.amount} DA
                  </p>
                </div>
              </div>

              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                {isRtl ? "سبب الرفض (سيُرسل للزبون)" : "Motif du refus (envoyé au client)"}
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder={isRtl ? "مثال: مبلغ العربون المطلوب أقل من الحد الأدنى المسموح..." : "Ex: Montant demandé inférieur au minimum autorisé..."}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-red-500 text-xs font-bold text-slate-800 dark:text-slate-100 mb-5"
              />

              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isUpdating || !rejectReason.trim()}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <X size={13} />}
                  {isRtl ? "تأكيد الرفض وإشعار الزبون" : "Rejeter & notifier"}
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={isUpdating}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs cursor-pointer"
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
