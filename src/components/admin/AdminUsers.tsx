"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
} from "firebase/firestore";
import {
  Users as UsersIcon, Search, ShieldBan, ShieldCheck, Coins,
  Download, ChevronDown, ChevronUp, Loader2, Wallet, UserPlus,
  Ban, CheckCircle2, Mail, Phone, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { exportCsv } from "@/lib/csv-export";
import { useAuth } from "@/context/AuthContext";

interface AdminUsersProps {
  orders: any[];
  isRtl: boolean;
}

export default function AdminUsers({ orders, isRtl }: AdminUsersProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pointsModal, setPointsModal] = useState<{ userId: string; name: string; points: string; reason: string } | null>(null);

  // بيانات المستخدمين الحية — القراءة والتعديل مسموحان للأدمن حسب القواعد
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // إحصائيات لكل مستخدم محسوبة من الطلبات الحية
  const statsByUser = useMemo(() => {
    const map: Record<string, { count: number; spend: number }> = {};
    for (const o of orders) {
      const uid = o.customerUserId;
      if (!uid || uid === "guest") continue;
      if (!map[uid]) map[uid] = { count: 0, spend: 0 };
      map[uid].count += 1;
      map[uid].spend += Number(o.total) || 0;
    }
    return map;
  }, [orders]);

  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u =>
      (u.displayName?.toLowerCase() || "").includes(s) ||
      (u.email?.toLowerCase() || "").includes(s) ||
      (u.phone || "").includes(s)
    );
  }, [users, search]);

  const summary = useMemo(() => ({
    total: users.length,
    blocked: users.filter(u => u.blocked).length,
    newThisMonth: users.filter(u => {
      const d = u.createdAt?.toDate ? u.createdAt.toDate() : null;
      return d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length,
    revenueFromMembers: Object.entries(statsByUser).reduce((acc, [, v]) => acc + v.spend, 0),
  }), [users, statsByUser]);

  const toggleBlock = async (u: any) => {
    setBusyId(u.id);
    try {
      await updateDoc(doc(db, "users", u.id), { blocked: !u.blocked });
      toast.success(!u.blocked ? "Utilisateur bloqué" : "Utilisateur débloqué");
    } catch {
      toast.error("Erreur de mise à jour");
    } finally {
      setBusyId(null);
    }
  };

  const submitPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsModal) return;
    const pts = Math.round(Number(pointsModal.points));
    if (!pts || isNaN(pts)) return toast.error("Nombre de points invalide");
    setBusyId(pointsModal.userId);
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/loyalty/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: pointsModal.userId, points: pts, reason: pointsModal.reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Points ajustés (${pts > 0 ? "+" : ""}${pts})`);
        setPointsModal(null);
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  };

  const exportUsers = async () => {
    try {
      const data = users.map(u => ({
        Nom: u.displayName || "",
        Email: u.email || "",
        Phone: u.phone || "",
        Points: u.points || 0,
        Bloque: u.blocked ? "OUI" : "non",
        Commandes: statsByUser[u.id]?.count || 0,
        "Total Dépensé (DA)": statsByUser[u.id]?.spend || 0,
        Inscription: u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString("fr-CA") : "N/A",
      }));
      exportCsv(`LArtisan_Clients_${new Date().toISOString().slice(0, 10)}`, data);
      toast.success("Fichier Excel généré !");
    } catch {
      toast.error("Échec de l'export");
    }
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
      {/* ملخص */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl"><UsersIcon size={22} /></div>
          <div><p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? "إجمالي العملاء" : "Clients"}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{summary.total}</p></div>
        </div>
        <div className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><UserPlus size={22} /></div>
          <div><p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? "جديد هذا الشهر" : "Nouveaux (mois)"}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{summary.newThisMonth}</p></div>
        </div>
        <div className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl"><Ban size={22} /></div>
          <div><p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? "محظورون" : "Bloqués"}</p><p className="text-2xl font-black text-slate-900 dark:text-white">{summary.blocked}</p></div>
        </div>
        <div className="premium-glass p-5 rounded-3xl border border-white/60 dark:border-white/5 flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl"><Wallet size={22} /></div>
          <div><p className="text-[10px] font-black uppercase text-slate-400">{isRtl ? "مشتريات الأعضاء" : "CA membres"}</p><p className="text-xl font-black text-slate-900 dark:text-white">{Math.round(summary.revenueFromMembers).toLocaleString()} DA</p></div>
        </div>
      </div>

      {/* شريط البحث + التصدير */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder={isRtl ? "بحث بالاسم، البريد أو الهاتف..." : "Rechercher un client (nom, email, tél)..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent shadow-sm text-slate-800 dark:text-slate-100"
          />
        </div>
        <button onClick={exportUsers} className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-600 transition-all">
          <Download size={18} /> Export Excel
        </button>
      </div>

      {/* قائمة المستخدمين */}
      <div className="space-y-3">
        {filteredUsers.map((u) => {
          const st = statsByUser[u.id] || { count: 0, spend: 0 };
          const isExpanded = expandedId === u.id;
          const userOrders = orders.filter(o => o.customerUserId === u.id).slice(0, 10);
          return (
            <div key={u.id} className={`premium-glass rounded-3xl border transition-all ${u.blocked ? 'border-red-200 dark:border-red-900/50 opacity-80' : 'border-white/60 dark:border-white/5'}`}>
              <button onClick={() => setExpandedId(isExpanded ? null : u.id)} className="w-full p-5 flex items-center gap-4 text-left cursor-pointer" dir="ltr">
                <div className="relative shrink-0">
                  {u.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photoUrl} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${u.blocked ? 'bg-red-100 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {(u.displayName?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                  {u.blocked && (
                    <span className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full"><ShieldBan size={10} className="text-white" /></span>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-black text-slate-900 dark:text-white truncate">{u.displayName || u.email || u.id.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email || u.phone || "—"} · {st.count} cmd · {Math.round(st.spend).toLocaleString()} DA</p>
                </div>
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <span className="flex items-center gap-1 text-sm font-black text-amber-500"><Coins size={15} /> {u.points || 0}</span>
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4" dir="ltr">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 font-bold">
                    {u.email && <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl"><Mail size={13} /> {u.email}</span>}
                    {u.phone && <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl"><Phone size={13} /> <span dir="ltr">{u.phone}</span></span>}
                    {u.tier && <span className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-3 py-1.5 rounded-xl">👑 {u.tier}</span>}
                    <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl"><CalendarDays size={13} /> {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString("fr-FR") : "—"}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase text-slate-400">Commandes</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">{st.count}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase text-slate-400">Dépensé</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">{Math.round(st.spend).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase text-slate-400">Points</p>
                      <p className="text-lg font-black text-amber-500">{u.points || 0}</p>
                    </div>
                  </div>

                  {/* أحدث طلبات العضو */}
                  {userOrders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{isRtl ? "أحدث الطلبات" : "Dernières commandes"}</p>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto hide-scrollbar">
                        {userOrders.map(o => (
                          <a key={o.id} href={`/invoice/${o.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-xl text-xs transition-colors group">
                            <span className="font-mono font-bold text-slate-500">#{o.id.slice(-6).toUpperCase()}</span>
                            <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-300 mx-2">{o.status}</span>
                            <span className="font-black text-blue-600">{o.total} DA</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* إجراءات الإدارة */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setPointsModal({ userId: u.id, name: u.displayName || u.email || u.id, points: "", reason: "" })}
                      className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl font-bold text-xs hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                    >
                      <Coins size={14} /> {isRtl ? "تعديل النقاط" : "Ajuster les points"}
                    </button>
                    <button
                      onClick={() => toggleBlock(u)}
                      disabled={busyId === u.id}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer ${
                        u.blocked
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200"
                      }`}
                    >
                      {busyId === u.id ? <Loader2 size={14} className="animate-spin" /> : u.blocked ? <ShieldCheck size={14} /> : <ShieldBan size={14} />}
                      {u.blocked ? (isRtl ? "إلغاء الحظر" : "Débloquer") : (isRtl ? "حظر المستخدم" : "Bloquer")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-16 premium-glass rounded-3xl">
            <UsersIcon size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold">{isRtl ? "لا يوجد عملاء مطابقون" : "Aucun client trouvé."}</p>
          </div>
        )}
      </div>

      {/* نافذة تعديل النقاط */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPointsModal(null)}>
          <form
            onSubmit={submitPoints}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-4"
          >
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="text-amber-500" /> Ajuster les points
            </h3>
            <p className="text-sm text-slate-500 -mt-2">{pointsModal.name}</p>
            <input
              type="number"
              autoFocus
              placeholder="+50 ou -20..."
              value={pointsModal.points}
              onChange={(e) => setPointsModal({ ...pointsModal, points: e.target.value })}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 font-black text-lg text-slate-900 dark:text-white"
              required
            />
            <input
              type="text"
              placeholder="Motif (cadeau, correction...)"
              value={pointsModal.reason}
              onChange={(e) => setPointsModal({ ...pointsModal, reason: e.target.value })}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setPointsModal(null)} className="flex-1 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                Annuler
              </button>
              <button type="submit" disabled={busyId === pointsModal.userId} className="flex-1 p-4 bg-amber-500 text-white rounded-2xl font-black disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {busyId === pointsModal.userId ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirmer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* أيقونات محفوظة للاستخدام المستقبلي */}
      <span className="hidden"><Wallet size={1} /><UserPlus size={1} /></span>
    </motion.div>
  );
}
