"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc,
} from "firebase/firestore";
import {
  Star, Trash2, Loader2, MessageSquareQuote, EyeOff, Eye,
  BadgeCheck, Search,
} from "lucide-react";
import { toast } from "sonner";

interface AdminReviewsProps {
  isRtl: boolean;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"} />
      ))}
    </div>
  );
}

export default function AdminReviews({ isRtl }: AdminReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // المراجعات الحية — القراءة عامة والإدارة محصورة بالأدمن حسب القواعد
  useEffect(() => {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // جلب أسماء المؤلفين
  useEffect(() => {
    const missing = [...new Set(reviews.filter(r => r.userId && !usersMap[r.userId]).map(r => r.userId as string))];
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(async uid => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", uid));
        return [uid, snap.exists() ? snap.data() : null];
      } catch {
        return [uid, null];
      }
    })).then(entries => {
      if (!cancelled) setUsersMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => { cancelled = true; };
  }, [reviews]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const visible = reviews.filter(r => !r.hidden);
    const avg = visible.length ? visible.reduce((a, r) => a + (Number(r.rating) || 0), 0) / visible.length : 0;
    const dist = [5, 4, 3, 2, 1].map(n => ({ n, count: reviews.filter(r => Number(r.rating) === n).length }));
    return { avg, total: reviews.length, dist };
  }, [reviews]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return reviews.filter(r => {
      const matchRating = !ratingFilter || Number(r.rating) === ratingFilter;
      const author = usersMap[r.userId]?.displayName?.toLowerCase() || "";
      const matchSearch = !s || (r.comment?.toLowerCase() || "").includes(s) || author.includes(s);
      return matchRating && matchSearch;
    });
  }, [reviews, ratingFilter, search, usersMap]);

  const removeReview = async (id: string) => {
    if (!confirm(isRtl ? "حذف هذه المراجعة نهائياً؟" : "Supprimer définitivement cet avis ?")) return;
    setBusyId(id);
    try {
      await deleteDoc(doc(db, "reviews", id));
      toast.success("Avis supprimé");
    } catch {
      toast.error("Erreur de suppression");
    } finally {
      setBusyId(null);
    }
  };

  const toggleHidden = async (r: any) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, "reviews", r.id), { hidden: !r.hidden });
      toast.success(r.hidden ? "Avis publié" : "Avis masqué du site");
    } catch {
      toast.error("Erreur de mise à jour");
    } finally {
      setBusyId(null);
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
      {/* ملخص التقييمات */}
      <div className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="text-center md:border-r md:border-slate-200 dark:md:border-slate-700 md:pr-8">
          <p className="text-6xl font-black text-slate-900 dark:text-white">{summary.avg.toFixed(1)}</p>
          <div className="flex justify-center my-2"><Stars rating={Math.round(summary.avg)} size={18} /></div>
          <p className="text-xs font-bold text-slate-400">{summary.total} avis au total</p>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          {summary.dist.map(({ n, count }) => (
            <button
              key={n}
              onClick={() => setRatingFilter(ratingFilter === n ? 0 : n)}
              className={`w-full flex items-center gap-3 group cursor-pointer ${ratingFilter === n ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
            >
              <span className={`text-xs font-black w-8 ${ratingFilter === n ? 'text-accent' : 'text-slate-500'}`}>{n} ★</span>
              <div className="flex-grow h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${n >= 4 ? 'bg-emerald-400' : n === 3 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${summary.total ? (count / summary.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-400 w-8 text-right">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* بحث */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          placeholder={isRtl ? "بحث في التعليقات..." : "Rechercher dans les avis..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-accent shadow-sm text-slate-800 dark:text-slate-100"
        />
      </div>

      {/* قائمة المراجعات */}
      <div className="space-y-3">
        {filtered.map(r => {
          const author = usersMap[r.userId];
          return (
            <div key={r.id} className={`premium-glass p-5 rounded-3xl border transition-all ${r.hidden ? 'border-slate-200 dark:border-slate-800 opacity-60' : 'border-white/60 dark:border-white/5'}`}>
              <div className="flex justify-between items-start gap-4" dir="ltr">
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-black text-slate-900 dark:text-white text-sm">{author?.displayName || "Client anonyme"}</span>
                    {r.isVerified && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        <BadgeCheck size={11} /> Acheteur vérifié
                      </span>
                    )}
                    {r.hidden && (
                      <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Masqué</span>
                    )}
                    {r.orderId && (
                      <span className="text-[10px] font-mono text-blue-500">#{String(r.orderId).slice(-6).toUpperCase()}</span>
                    )}
                  </div>
                  <Stars rating={Number(r.rating) || 0} />
                  {r.comment && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex gap-2">
                      <MessageSquareQuote size={16} className="shrink-0 text-slate-300 mt-0.5" /> {r.comment}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={() => toggleHidden(r)}
                    disabled={busyId === r.id}
                    title={r.hidden ? "Publier" : "Masquer"}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {busyId === r.id ? <Loader2 size={16} className="animate-spin" /> : r.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => removeReview(r.id)}
                    disabled={busyId === r.id}
                    title="Supprimer"
                    className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 premium-glass rounded-3xl">
            <Star size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold">{isRtl ? "لا توجد مراجعات" : "Aucun avis."}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
