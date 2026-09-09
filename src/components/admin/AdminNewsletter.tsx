"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, doc, deleteDoc,
} from "firebase/firestore";
import {
  Mail, Trash2, Loader2, Download, Search, Send, Users,
} from "lucide-react";
import { toast } from "sonner";

interface AdminNewsletterProps {
  isRtl: boolean;
}

export default function AdminNewsletter({ isRtl }: AdminNewsletterProps) {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "newsletter_subscribers"), orderBy("subscribedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return subs;
    return subs.filter(u => (u.email?.toLowerCase() || "").includes(s));
  }, [subs, search]);

  const removeSub = async (id: string) => {
    setBusyId(id);
    try {
      await deleteDoc(doc(db, "newsletter_subscribers", id));
      toast.success("Abonné supprimé");
    } catch {
      toast.error("Erreur de suppression");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    if (!subs.length) return toast.error(isRtl ? "القائمة فارغة" : "Liste vide");
    const rows = ["email,source,date"];
    subs.forEach(s => {
      const date = s.subscribedAt?.toDate ? s.subscribedAt.toDate().toISOString().slice(0, 10) : "";
      rows.push(`${s.email},${s.source || ""},${date}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LArtisan_Newsletter_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV généré !");
  };

  const openMailtoAll = () => {
    if (!subs.length) return toast.error(isRtl ? "القائمة فارغة" : "Liste vide");
    window.location.href = `mailto:?bcc=${subs.map(s => s.email).join(",")}&subject=Nouveautés L'Artisan Imprimeur`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ملخص + إجراءات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl"><Users size={22} /></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? "المشتركون" : "Abonnés"}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{subs.length}</p>
          </div>
        </div>
        <button onClick={exportCsv} className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><Download size={22} /></div>
          <div className="text-left">
            <p className="font-black text-slate-800 dark:text-white">Export CSV</p>
            <p className="text-[10px] font-bold text-slate-400">{isRtl ? "لحملات Resend/Mailchimp" : "Pour campagnes emailing"}</p>
          </div>
        </button>
        <button onClick={openMailtoAll} className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl"><Send size={22} /></div>
          <div className="text-left">
            <p className="font-black text-slate-800 dark:text-white">{isRtl ? "مراسلة جماعية" : "Envoi groupé"}</p>
            <p className="text-[10px] font-bold text-slate-400">{isRtl ? "عبر تطبيق البريد" : "Via app mail (CCI)"}</p>
          </div>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          placeholder={isRtl ? "بحث بالبريد..." : "Rechercher un email..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent shadow-sm text-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(s => (
          <div key={s.id} dir="ltr" className="premium-glass px-5 py-3.5 rounded-2xl border border-white/60 dark:border-white/5 flex items-center justify-between gap-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl shrink-0"><Mail size={16} /></div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{s.email}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  {s.source || "site"} · {s.subscribedAt?.toDate ? s.subscribedAt.toDate().toLocaleDateString("fr-FR") : "—"}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeSub(s.id)}
              disabled={busyId === s.id}
              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              title="Supprimer"
            >
              {busyId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 premium-glass rounded-3xl">
            <Mail size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold">{isRtl ? "لا يوجد مشتركون بعد" : "Aucun abonné pour le moment."}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
