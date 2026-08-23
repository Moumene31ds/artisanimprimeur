"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, getDocs, writeBatch,
} from "firebase/firestore";
import {
  ShieldAlert, Search, Loader2, Trash2, LogIn, LogOut, ShoppingCart,
  Bug, Ban, Download, Filter,
} from "lucide-react";
import { toast } from "sonner";

interface AdminSecurityProps {
  isRtl: boolean;
}

const EVENT_ICONS: Record<string, any> = {
  login_success: { icon: LogIn, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  login_failed: { icon: Ban, color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  logout: { icon: LogOut, color: "text-slate-500 bg-slate-100 dark:bg-slate-800" },
  order_placed: { icon: ShoppingCart, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  brute_force_lockout: { icon: ShieldAlert, color: "text-red-700 bg-red-200 dark:bg-red-950/40" },
};

const PAGE_SIZE = 50;

export default function AdminSecurity({ isRtl }: AdminSecurityProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("Tous");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // أحدث 300 سجل — السجل الأمني كبير جداً لعرضه بالكامل
    const q = query(collection(db, "securityLogs"), orderBy("timestamp", "desc"), limit(300));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const eventTypes = useMemo(
    () => ["Tous", ...Array.from(new Set(logs.map(l => l.event).filter(Boolean)))],
    [logs]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return logs.filter(l => {
      const matchEvent = eventFilter === "Tous" || l.event === eventFilter;
      const matchSearch = !s ||
        (l.email?.toLowerCase() || "").includes(s) ||
        (l.ip?.toLowerCase() || "").includes(s) ||
        (l.userAgent?.toLowerCase() || "").includes(s);
      return matchEvent && matchSearch;
    });
  }, [logs, eventFilter, search]);

  const removeLog = async (id: string) => {
    setBusyId(id);
    try {
      await deleteDoc(doc(db, "securityLogs", id));
    } catch {
      toast.error("Erreur de suppression");
    } finally {
      setBusyId(null);
    }
  };

  const clearOld = async () => {
    if (!confirm(isRtl ? "حذف السجلات الأقدم من 30 يوماً؟" : "Supprimer les logs de plus de 30 jours ?")) return;
    setClearing(true);
    try {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const oldDocs = logs.filter(l => {
        const ts = l.timestamp?.toDate ? l.timestamp.toDate().getTime() : 0;
        return ts && ts < cutoff;
      });
      for (let i = 0; i < oldDocs.length; i += 400) {
        const batch = writeBatch(db);
        oldDocs.slice(i, i + 400).forEach(l => batch.delete(doc(db, "securityLogs", l.id)));
        await batch.commit();
      }
      toast.success(`${oldDocs.length} anciens logs supprimés`);
    } catch {
      toast.error("Erreur lors du nettoyage");
    } finally {
      setClearing(false);
    }
  };

  const exportCsv = () => {
    const rows = ["date,event,email,ip,userAgent"];
    filtered.forEach(l => {
      const date = l.timestamp?.toDate ? l.timestamp.toDate().toISOString() : "";
      rows.push(`"${date}","${l.event || ""}","${l.email || ""}","${l.ip || ""}","${(l.userAgent || "").replace(/"/g, "'")}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LArtisan_Security_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV généré !");
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
      dir="ltr"
    >
      {/* شريط الأدوات */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder={isRtl ? "بحث بالبريد أو IP..." : "Rechercher (email, IP)..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent shadow-sm text-slate-800 dark:text-slate-100"
          />
        </div>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 px-5 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-600 transition-all">
          <Download size={17} /> CSV
        </button>
        <button onClick={clearOld} disabled={clearing} className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-800 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-slate-700 transition-all disabled:opacity-50">
          {clearing ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />} {isRtl ? "تنظيف (>30ي)" : "> 30 jours"}
        </button>
      </div>

      {/* فلاتر نوع الحدث */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <span className="flex items-center text-[10px] font-black uppercase text-slate-400 shrink-0"><Filter size={13} className="mr-1" /></span>
        {eventTypes.map(ev => (
          <button
            key={ev}
            onClick={() => setEventFilter(ev)}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
              eventFilter === ev
                ? "bg-slate-900 dark:bg-accent text-white shadow"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {ev}
          </button>
        ))}
      </div>

      {/* قائمة السجلات */}
      <div className="premium-glass rounded-3xl border border-white/60 dark:border-white/5 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {filtered.slice(0, PAGE_SIZE).map(l => {
          const conf = EVENT_ICONS[l.event] || { icon: Bug, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" };
          const Icon = conf.icon;
          const date = l.timestamp?.toDate ? l.timestamp.toDate() : null;
          return (
            <div key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
              <div className={`p-2.5 rounded-xl shrink-0 ${conf.color}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-grow">
                <p className="font-black text-xs text-slate-800 dark:text-slate-200">{l.event}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {l.email || "—"} · {l.ip || "IP masquée"}{l.userAgent ? ` · ${String(l.userAgent).slice(0, 60)}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-[11px] font-bold text-slate-500">{date?.toLocaleDateString("fr-FR")}</p>
                <p className="text-[10px] text-slate-400">{date?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <button
                onClick={() => removeLog(l.id)}
                disabled={busyId === l.id}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-all cursor-pointer"
              >
                {busyId === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-14">
            <ShieldAlert size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold">{isRtl ? "لا توجد سجلات مطابقة" : "Aucun log correspondant."}</p>
          </div>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <p className="text-center text-xs font-bold text-slate-400">
          {isRtl ? `عرض أول ${PAGE_SIZE} من ${filtered.length} نتيجة` : `Affichage des ${PAGE_SIZE} premières sur ${filtered.length}`}
        </p>
      )}
    </motion.div>
  );
}
