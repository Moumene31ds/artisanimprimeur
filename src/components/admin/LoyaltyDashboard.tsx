"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Gift, Loader2, Search, Users, TrendingUp, Coins,
  Award, Plus, Minus, Save, X, History, Medal, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { LOYALTY_TIERS } from "@/lib/loyalty";

interface Member {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  points: number;
  lifetimeSpending: number;
  tier: string;
  referralCode: string | null;
  lastInteraction: string | null;
}

interface LoyaltyDashboardProps {
  isRtl: boolean;
}

export default function LoyaltyDashboard({ isRtl }: LoyaltyDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState<any>(null);

  // --- تعديل يدوي ---
  const [adjustMember, setAdjustMember] = useState<Member | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<string>("100");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/loyalty/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setTransactions(data.transactions || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load loyalty members:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "loyalty"));
      if (snap.exists()) {
        setConfig(snap.data());
      } else {
        setConfig({
          config: {
            basePointsPer100: 1,
            signupBonus: 200,
            dailyCheckInBase: 10,
            dailyCheckInStreakBonus: 50,
            birthdayBonus: 100,
            reviewBonus: 50,
            referralBonus: 100,
            spinCost: 50,
          },
          rewards: [
            { id: "r1", points: 200, type: "percent", value: 10, title: { ar: "خصم 10%", fr: "Remise 10%" }, icon: "Ticket" },
            { id: "r2", points: 500, type: "fixed", value: 600, title: { ar: "قسيمة 600 دج", fr: "Bon de 600 DA" }, icon: "Zap" },
            { id: "r3", points: 1000, type: "fixed", value: 1000, title: { ar: "قسيمة 1000 دج", fr: "Bon de 1000 DA" }, icon: "Trophy" },
            { id: "r4", points: 2000, type: "fixed", value: 2500, title: { ar: "قسيمة 2500 دج", fr: "Bon de 2500 DA" }, icon: "Gem" },
            { id: "r5", points: 5000, type: "percent", value: 20, title: { ar: "خصم 20%", fr: "Remise 20%" }, icon: "Crown" },
          ],
        });
      }
    } catch (err) {
      console.error("Failed to load loyalty config:", err);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    loadConfig();
  }, [loadMembers, loadConfig]);

  const handleAdjust = async () => {
    if (!adjustMember) return;
    const points = Math.round(Number(adjustPoints));
    if (!points || points === 0) {
      toast.error(isRtl ? "أدخل قيمة صحيحة" : "Valeur invalide");
      return;
    }
    setAdjusting(true);
    try {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch("/api/loyalty/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: adjustMember.id, points, reason: adjustReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isRtl ? "تم التعديل بنجاح" : "Ajustement effectué");
        setAdjustMember(null);
        setAdjustPoints("100");
        setAdjustReason("");
        loadMembers();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur lors de l'ajustement");
    } finally {
      setAdjusting(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    try {
      await setDoc(doc(db, "settings", "loyalty"), config, { merge: true });
      toast.success(isRtl ? "تم حفظ إعدادات الولاء" : "Paramètres de fidélité enregistrés");
    } catch (err) {
      toast.error("Erreur de sauvegarde");
    }
  };

  const filteredMembers = members.filter((m) =>
    (m.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ====== Header ====== */}
      <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 shadow-2xl border border-white/10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <Crown size={28} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                {isRtl ? "نظام الولاء والنقاط" : "Programme de Fidélité"}
              </p>
              <h2 className="text-2xl font-black mt-1">
                {isRtl ? "لوحة تحكم نادي الحرفي VIP" : "Tableau de bord VIP Club"}
              </h2>
              <p className="text-sm text-slate-300 mt-1 font-semibold">
                {isRtl
                  ? "النقاط تُمنح تلقائياً عند إتمام الطلبات، مع مضاعفات حسب المستوى."
                  : "Points attribués automatiquement à la fin des commandes, avec multiplicateurs selon le statut."}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {[
            { label: isRtl ? "الأعضاء" : "Membres", value: stats?.totalMembers ?? 0, icon: <Users size={20} /> },
            { label: isRtl ? "نقاط متداولة" : "Points en circulation", value: (stats?.totalPoints ?? 0).toLocaleString(), icon: <Coins size={20} /> },
            { label: isRtl ? "نقاط ممنوحة" : "Points octroyés", value: (stats?.pointsIssued ?? 0).toLocaleString(), icon: <TrendingUp size={20} /> },
            { label: isRtl ? "طلبات مكافأة" : "Commandes récompensées", value: stats?.ordersAwarded ?? 0, icon: <Award size={20} /> },
            { label: isRtl ? "إجمالي الإنفاق" : "Dépense totale", value: `${((stats?.totalSpending ?? 0) / 1000).toFixed(0)}K DA`, icon: <Sparkles size={20} /> },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col gap-2">
              <span className="text-slate-400">{s.icon}</span>
              <span className="text-2xl font-black">{s.value}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tier breakdown */}
        <div className="flex flex-wrap gap-2 mt-6">
          {LOYALTY_TIERS.map((tier) => (
            <span key={tier.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs font-bold capitalize">
              <Medal size={14} className="text-yellow-400" />
              {tier.label.fr}
              <span className="text-slate-400">×</span>
              <b className="text-accent">{tier.multiplier}</b>
              <span className="text-slate-400">· {stats?.tierCounts?.[tier.id] || 0}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ====== Members table ====== */}
      <div className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-accent" size={22} />
            {isRtl ? "الأعضاء" : "Membres"}
          </h3>
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "بحث بالاسم أو البريد..." : "Rechercher..."}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="text-start py-3 pr-3">{isRtl ? "العضو" : "Membre"}</th>
                <th className="text-start py-3 pr-3">{isRtl ? "المستوى" : "Statut"}</th>
                <th className="text-start py-3 pr-3">{isRtl ? "الإنفاق" : "Dépenses"}</th>
                <th className="text-start py-3 pr-3">{isRtl ? "النقاط" : "Points"}</th>
                <th className="text-end py-3">{isRtl ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                    {isRtl ? "لا يوجد أعضاء" : "Aucun membre"}
                  </td>
                </tr>
              )}
              {filteredMembers.slice(0, 60).map((m) => {
                const tier = LOYALTY_TIERS.find((t) => t.id === m.tier) || LOYALTY_TIERS[0];
                return (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 dark:from-accent dark:to-blue-400 flex items-center justify-center text-white text-xs font-black overflow-hidden shrink-0">
                          {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : (m.displayName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 dark:text-white truncate max-w-[180px]">{m.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-bold truncate max-w-[180px]">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${tier.gradient} text-white`}>
                        <Medal size={10} /> {tier.label.fr} ×{tier.multiplier}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-bold text-slate-600 dark:text-slate-300">
                      {m.lifetimeSpending.toLocaleString()} DA
                    </td>
                    <td className="py-3 pr-3">
                      <span className="font-black text-accent text-base">{m.points.toLocaleString()}</span>
                      <span className="text-slate-400 text-[10px]"> pts</span>
                    </td>
                    <td className="py-3 text-end">
                      <button
                        onClick={() => setAdjustMember(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-accent text-white font-black text-[10px] hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <Plus size={12} /> {isRtl ? "تعديل" : "Ajuster"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ====== Config editor ====== */}
        <div className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/10 shadow-xl">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Gift className="text-yellow-500" size={22} />
            <h3 className="font-black text-xl text-slate-900 dark:text-white">{isRtl ? "إعدادات المكافآت" : "Paramètres des bonus"}</h3>
          </div>

          {config?.config && (
            <div className="space-y-4">
              {[
                { key: "basePointsPer100", label: isRtl ? "نقاط لكل 100 دج (أساسي)" : "Points / 100 DA (base)" },
                { key: "signupBonus", label: isRtl ? "هدية التسجيل" : "Bonus d'inscription" },
                { key: "dailyCheckInBase", label: isRtl ? "التسجيل اليومي" : "Check-in quotidien" },
                { key: "dailyCheckInStreakBonus", label: isRtl ? "مكافأة سلسلة 7 أيام" : "Bonus streak 7 jours" },
                { key: "birthdayBonus", label: isRtl ? "هدية عيد الميلاد" : "Bonus anniversaire" },
                { key: "reviewBonus", label: isRtl ? "مكافأة المراجعة" : "Bonus avis" },
                { key: "referralBonus", label: isRtl ? "مكافأة الإحالة" : "Bonus parrainage" },
                { key: "spinCost", label: isRtl ? "تكلفة عجلة الحظ" : "Coût roue (pts)" },
              ].map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{field.label}</span>
                  <input
                    type="number"
                    min={0}
                    value={config.config[field.key] ?? 0}
                    onChange={(e) =>
                      setConfig((prev: any) => ({
                        ...prev,
                        config: { ...prev.config, [field.key]: Number(e.target.value) },
                      }))
                    }
                    className="w-24 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-center outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}

              <button
                onClick={saveConfig}
                className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-accent text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Save size={16} /> {isRtl ? "حفظ الإعدادات" : "Enregistrer"}
              </button>
            </div>
          )}

          {/* Rewards catalog preview */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{isRtl ? "كتالوج الاستبدال (نقاط)" : "Catalogue d'échange"}</p>
            <div className="grid grid-cols-1 gap-2">
              {config?.rewards?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {isRtl ? r.title?.ar : r.title?.fr} — {r.value} {r.type === "percent" ? "%" : "DA"}
                  </span>
                  <span className="text-xs font-black text-yellow-500">{r.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ====== Recent transactions ====== */}
        <div className="premium-glass rounded-[2.5rem] p-6 border border-white/60 dark:border-white/10 shadow-xl">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <History className="text-purple-500" size={22} />
            <h3 className="font-black text-xl text-slate-900 dark:text-white">{isRtl ? "آخر المعاملات" : "Transactions récentes"}</h3>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar">
            {transactions.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-bold">
                {isRtl ? "لا توجد معاملات بعد" : "Aucune transaction"}
              </div>
            )}
            {transactions.map((tx) => {
              const positive = tx.points > 0;
              const typeLabel: Record<string, string> = {
                earned: isRtl ? "كسب" : "Gagné",
                redeemed: isRtl ? "استبدال" : "Échange",
                won: isRtl ? "فوز" : "Gain",
                spin_cost: isRtl ? "عجلة الحظ" : "Roue",
                daily_checkin: isRtl ? "تسجيل يومي" : "Check-in",
                birthday: isRtl ? "عيد ميلاد" : "Anniv.",
                review: isRtl ? "مراجعة" : "Avis",
                referral: isRtl ? "إحالة" : "Parrainage",
                adjust: isRtl ? "تعديل" : "Ajust.",
              };
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{tx.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {typeLabel[tx.type] || tx.type} · {tx.createdAt ? new Date(tx.createdAt).toLocaleString(isRtl ? "ar-DZ" : "fr-FR") : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-lg ${positive ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600" : "bg-red-100 dark:bg-red-950/30 text-red-500"}`}>
                    {positive ? "+" : ""}{tx.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== Adjust modal ====== */}
      <AnimatePresence>
        {adjustMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdjustMember(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {isRtl ? "تعديل نقاط العضو" : "Ajuster les points"}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    {adjustMember.displayName} · {adjustMember.points} pts
                  </p>
                </div>
                <button onClick={() => setAdjustMember(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {isRtl ? "القيمة (موجب = إضافة، سالب = خصم)" : "Valeur (positif = bonus)"}
                  </label>
                  <input
                    type="number"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-white/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-black outline-none focus:ring-1 focus:ring-accent text-center"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setAdjustPoints("50")} className="flex-1 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 text-xs font-black hover:bg-emerald-200 cursor-pointer">+50</button>
                    <button onClick={() => setAdjustPoints("100")} className="flex-1 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 text-xs font-black hover:bg-emerald-200 cursor-pointer">+100</button>
                    <button onClick={() => setAdjustPoints("-50")} className="flex-1 py-2 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-500 text-xs font-black hover:bg-red-200 cursor-pointer">-50</button>
                    <button onClick={() => setAdjustPoints("-100")} className="flex-1 py-2 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-500 text-xs font-black hover:bg-red-200 cursor-pointer">-100</button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {isRtl ? "السبب" : "Motif"}
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder={isRtl ? "مثال: اعتذار عن تأخير الطلب" : "Ex: geste commercial"}
                    className="w-full p-3.5 rounded-2xl bg-white/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <button
                  onClick={handleAdjust}
                  disabled={adjusting}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-accent text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {adjusting ? <Loader2 size={16} className="animate-spin" /> : <Minus size={16} />}
                  {isRtl ? "تأكيد التعديل" : "Confirmer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
