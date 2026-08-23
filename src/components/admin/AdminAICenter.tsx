"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { db } from "@/lib/firebase";
import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Bot, Cpu, Cloud, RefreshCw, Play, Loader2, Sparkles, Zap, MessageSquare,
  ImageIcon, ShoppingBag, Thermometer, Languages, GaugeCircle, ShieldCheck,
  CircleSlash, Activity, Wand2, Timer, Clock, Phone, AlertTriangle, Globe2, KeyRound, X,
} from "lucide-react";
import {
  AI_PERSONALITY_PRESETS,
  DEFAULT_AI_CONFIG,
  sanitizeAiConfig,
  type AiRuntimeConfig,
} from "@/lib/ai-runtime";

const AiUsageChart = dynamic(() => import("./AiUsageChart"), {
  ssr: false,
  loading: () => <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>,
});

interface AiCenterProps { isRtl: boolean }

interface StatusInfo {
  ollamaReachable: boolean;
  openrouterKeyPresent: boolean;
  cooldownSeconds: number;
  ollama?: {
    reachable: boolean;
    latencyMs: number;
    models: { name: string; sizeGB?: number }[];
    baseUrl: string;
    error: string | null;
    remote: boolean;
    protectedBykey: boolean;
  };
  warnings?: string[];
}

export default function AdminAICenter({ isRtl }: AiCenterProps) {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<AiRuntimeConfig>(DEFAULT_AI_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [probing, setProbing] = useState(false);
  const [testPrompt, setTestPrompt] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ text: string; latencyMs: number } | null>(null);
  const [usage, setUsage] = useState<{ chart: any[]; total: number; today: number; avgLatency: number; errors: number } | null>(null);

  // بث حي لإعدادات الذكاء الاصطناعي (قراءة عامة مسموحة — كتابة للأدمن فقط)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ai"), (snap) => {
      setCfg(sanitizeAiConfig(snap.exists() ? snap.data() : null));
      setLoaded(true);
    }, () => setLoaded(true));
    return unsub;
  }, []);

  const probeStatus = useCallback(async () => {
    setProbing(true);
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/admin/ai/status", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setStatus({
          ollamaReachable: data.ollamaReachable,
          openrouterKeyPresent: data.openrouterKeyPresent,
          cooldownSeconds: data.cooldownSeconds,
          ollama: data.ollama,
          warnings: data.warnings ?? [],
        });
      } else toast.error(isRtl ? "فشل فحص الحالة" : "Échec du diagnostic");
    } catch {
      toast.error(isRtl ? "خطأ شبكة" : "Erreur réseau");
    } finally {
      setProbing(false);
    }
  }, [user, isRtl]);

  useEffect(() => { probeStatus(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // إحصائيات الاستخدام (آخر 7 أيام) من ai_logs
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "ai_logs"), orderBy("createdAt", "desc"), limit(500)));
        const byDay = new Map<string, { messages: number; errors: number; latencySum: number; n: number }>();
        const today = new Date().toISOString().slice(0, 10);
        let total = 0, todayCount = 0, latencySum = 0, latencyN = 0, errors = 0;
        for (const d of snap.docs) {
          const v: any = d.data();
          const day: string = v.day || (v.createdAt?.toDate ? v.createdAt.toDate().toISOString().slice(0, 10) : "");
          if (!day) continue;
          if (!byDay.has(day)) byDay.set(day, { messages: 0, errors: 0, latencySum: 0, n: 0 });
          const e = byDay.get(day)!;
          e.messages += 1;
          if (v.ok === false) { e.errors += 1; errors += 1; }
          if (typeof v.latencyMs === "number") { e.latencySum += v.latencyMs; e.n += 1; latencySum += v.latencyMs; latencyN += 1; }
          total += 1;
          if (day === today) todayCount += 1;
        }
        const chart: any[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          const e = byDay.get(key) || { messages: 0, errors: 0, latencySum: 0, n: 0 };
          chart.push({
            day: key,
            label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
            messages: e.messages,
            errors: e.errors,
          });
        }
        setUsage({
          chart,
          total,
          today: todayCount,
          avgLatency: latencyN ? Math.round(latencySum / latencyN) : 0,
          errors,
        });
      } catch {
        setUsage({ chart: [], total: 0, today: 0, avgLatency: 0, errors: 0 });
      }
    })();
  }, [testResult]);

  /** حفظ فوري في settings/ai (الكتابة محصورة بالأدمن حسب القواعد). */
  const save = async (patch: Partial<AiRuntimeConfig>, silent = false) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    try {
      await setDoc(doc(db, "settings", "ai"), next, { merge: true });
      if (!silent) toast.success(isRtl ? "تم حفظ إعدادات الذكاء الاصطناعي" : "Paramètres IA enregistrés");
    } catch {
      toast.error(isRtl ? "فشل الحفظ" : "Échec de la sauvegarde");
    }
  };

  const runTest = async () => {
    if (!testPrompt.trim() || testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/admin/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: testPrompt }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ text: data.text, latencyMs: data.latencyMs });
      } else {
        toast.error(data.error || (isRtl ? "فشل الاختبار" : "Échec du test"));
      }
    } catch {
      toast.error(isRtl ? "خطأ شبكة" : "Erreur réseau");
    } finally {
      setTesting(false);
    }
  };

  const activeProviderLabel = useMemo(() => {
    if (!status) return isRtl ? "..." : "…";
    if (cfg.provider === "ollama") return status.ollamaReachable ? "Ollama (local)" : "Ollama — hors ligne ⚠";
    if (cfg.provider === "openrouter") return status.openrouterKeyPresent ? "OpenRouter (cloud)" : "Clé OpenRouter manquante ⚠";
    return status.ollamaReachable ? "Auto → Ollama" : status.openrouterKeyPresent ? "Auto → OpenRouter" : "Aucun fournisseur ⚠";
  }, [status, cfg.provider, isRtl]);

  if (!loaded) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      {/* ===== شريط الحالة الحية ===== */}
      <div className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{isRtl ? "مركز قيادة الذكاء الاصطناعي" : "Centre de Commande IA"}</h3>
              <p className="text-xs font-bold text-slate-400">{isRtl ? "تحكم فوري بالمساعد، الصور والطلبات — بدون إعادة نشر" : "Contrôle live de l'assistant, des images et des commandes — sans redéploiement"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${status?.ollamaReachable || status?.openrouterKeyPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
              ● {activeProviderLabel}
            </span>
            <button onClick={probeStatus} disabled={probing} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer" title="Diagnostic">
              {probing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ollama */}
          <div className={`p-4 rounded-2xl border-2 transition-all ${status?.ollamaReachable ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className={status?.ollamaReachable ? 'text-emerald-500' : 'text-slate-400'} />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">Ollama</span>
              {status?.ollama?.remote && (
                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center gap-0.5">
                  <Globe2 size={8} /> {isRtl ? "بعيد" : "remote"}
                </span>
              )}
              <span className={`ml-auto w-2.5 h-2.5 rounded-full ${probing ? 'bg-amber-400 animate-pulse' : status?.ollamaReachable ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            </div>
            {status?.ollamaReachable ? (
              <>
                <p className="text-[10px] font-bold text-slate-400">
                  {status.ollama?.latencyMs}ms · {(status.ollama?.models.length ?? 0)} {isRtl ? "موديل مثبّت" : "modèles"}
                </p>
                {!!status.ollama?.models.length && (
                  <p className="text-[9px] font-mono text-slate-400 truncate mt-1" title={status.ollama.models.map(m => m.name).join(', ')}>
                    {status.ollama.models.slice(0, 3).map(m => m.name).join(' · ')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] font-bold text-slate-400">
                {status?.ollama?.error === 'timeout'
                  ? (isRtl ? "انتهت المهلة — الخادم بطيء أو محجوب" : "Timeout — serveur lent ou bloqué")
                  : status?.ollama?.baseUrl
                    ? `${status.ollama.baseUrl.replace(/^https?:\/\//, '')} — ${isRtl ? "غير متاح" : "injoignable"}`
                    : (isRtl ? "غير متاح على هذا الخادم" : "Injoignable sur ce serveur")}
              </p>
            )}
          </div>
          {/* OpenRouter */}
          <div className={`p-4 rounded-2xl border-2 transition-all ${status?.openrouterKeyPresent ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Cloud size={16} className={status?.openrouterKeyPresent ? 'text-emerald-500' : 'text-amber-500'} />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">OpenRouter</span>
              <span className={`ml-auto w-2.5 h-2.5 rounded-full ${status?.openrouterKeyPresent ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            </div>
            <p className="text-[10px] font-bold text-slate-400">{status?.openrouterKeyPresent ? (isRtl ? "المفتاح موجود (سحابي)" : "Clé détectée — cloud") : (isRtl ? "أضف OPENROUTER_API_KEY في Vercel" : "Ajoutez OPENROUTER_API_KEY sur Vercel")}</p>
          </div>
          {/* Circuit breaker */}
          <div className={`p-4 rounded-2xl border-2 transition-all ${(status?.cooldownSeconds ?? 0) > 0 ? 'border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20' : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              {(status?.cooldownSeconds ?? 0) > 0 ? <CircleSlash size={15} className="text-orange-500" /> : <ShieldCheck size={16} className="text-emerald-500" />}
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">Circuit breaker</span>
              <Timer size={13} className="ml-auto text-slate-400" />
            </div>
            <p className="text-[10px] font-bold text-slate-400">{(status?.cooldownSeconds ?? 0) > 0 ? `${isRtl ? "تهدئة" : "Cooldown"} : ${status!.cooldownSeconds}s` : isRtl ? "جميع المزودين جاهزون" : "Tous les fournisseurs prêts"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ===== اختيار الموفر والموديلات ===== */}
        <section className="premium-glass p-6 sm:p-8 rounded-[2rem] border border-white/60 dark:border-white/5 space-y-5">
          <h4 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2"><Zap size={18} className="text-indigo-500" /> {isRtl ? "الموفر والنماذج" : "Fournisseur & Modèles"}</h4>

          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'auto', labelFr: 'Automatique', labelAr: 'تلقائي', icon: Wand2 },
              { id: 'ollama', labelFr: 'Ollama local', labelAr: 'أولاما محلي', icon: Cpu },
              { id: 'openrouter', labelFr: 'OpenRouter', labelAr: 'أوبن راوتر', icon: Cloud },
            ] as const).map(p => (
              <button
                key={p.id}
                onClick={() => save({ provider: p.id })}
                className={`p-4 rounded-2xl border-2 font-black text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  cfg.provider === p.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300 shadow-lg scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                }`}
              >
                <p.icon size={20} /> {isRtl ? p.labelAr : p.labelFr}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {([
              { key: 'ollamaModel', label: 'Modèle Ollama (texte)', ph: 'qwen3:8b' },
              { key: 'ollamaVisionModel', label: 'Modèle Ollama (vision)', ph: 'qwen3-vl:latest' },
              { key: 'openrouterModel', label: 'Modèle OpenRouter', ph: 'openrouter/free' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">{f.label}</label>
                <input
                  dir="ltr"
                  type="text"
                  placeholder={`${f.ph} (${isRtl ? "افتراضي" : "défaut"})`}
                  value={(cfg as any)[f.key] || ''}
                  onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })}
                  onBlur={() => save({ [f.key]: cfg[f.key] } as any, true)}
                  className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent transition-colors font-mono text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            ))}

            {/* Ollama بعيد — يجعل أولاما متاحاً في production عبر VPS/Docker */}
            <div className={`p-4 rounded-2xl border-2 ${cfg.ollamaBaseUrl ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Globe2 size={15} className="text-indigo-500" />
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{isRtl ? "خادم Ollama بعيد (production)" : "Serveur Ollama distant (production)"}</span>
                <button onClick={probeStatus} disabled={probing} className="ml-auto p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50" title={isRtl ? "إعادة فحص الاتصال" : "Retester"}>
                  {probing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                </button>
              </div>
              <input
                dir="ltr"
                type="text"
                placeholder="https://ollama.mon-serveur.com  (vide = local)"
                value={cfg.ollamaBaseUrl}
                onChange={(e) => setCfg({ ...cfg, ollamaBaseUrl: e.target.value })}
                onBlur={() => save({ ollamaBaseUrl: cfg.ollamaBaseUrl.trim() }, true)}
                className="w-full p-3 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 font-mono text-xs text-slate-800 dark:text-slate-100"
              />
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-2">
                {isRtl
                  ? "شغّل Ollama على VPS ثم ضع رابطه هنا ليصبح متاحاً في production فوراً وبلا إعادة نشر."
                  : "Lancez Ollama sur un VPS puis collez son URL ici : il devient disponible en production, sans redéploiement."}
              </p>
              {cfg.ollamaBaseUrl && status?.ollama?.remote && (
                status.ollama.protectedBykey ? (
                  <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 mt-2">
                    <KeyRound size={11} /> {isRtl ? "محمي بمفتاح Bearer ✓" : "Protégé par clé Bearer ✓"}
                  </p>
                ) : (
                  <p className="text-[10px] font-black text-orange-500 flex items-start gap-1.5 mt-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl px-3 py-2 leading-relaxed">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    {isRtl ? "احمِ خادمك: أضف OLLAMA_API_KEY في متغيرات البيئة (الرابط مقروء للعموم)" : "Protégez-le : ajoutez OLLAMA_API_KEY dans les variables d'environnement"}
                  </p>
                )
              )}
            </div>
          </div>
        </section>

        {/* ===== مفاتيح تشغيل الميزات ===== */}
        <section className="premium-glass p-6 sm:p-8 rounded-[2rem] border border-white/60 dark:border-white/5 space-y-4">
          <h4 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2"><GaugeCircle size={18} className="text-purple-500" /> {isRtl ? "مفاتيح التشغيل الفورية" : "Interrupteurs en direct"}</h4>

          {([
            { key: 'enabledChatbot', icon: MessageSquare, titleFr: 'Assistant conversationnel', titleAr: 'المساعد المحادثاتي', descFr: 'Le widget chat sur tout le site', descAr: 'دردشة المساعد في كل الموقع' },
            { key: 'enabledOrders', icon: ShoppingBag, titleFr: 'Commandes via le chat', titleAr: 'الطلبات عبر الشات', descFr: 'L\'IA peut enregistrer des commandes', descAr: 'يسمح للذكاء بتسجيل الطلبات' },
            { key: 'enabledImageGen', icon: ImageIcon, titleFr: 'Génération d\'images IA', titleAr: 'توليد الصور بالذكاء', descFr: 'AI Studio (/ai-studio)', descAr: 'استوديو التصميم (/ai-studio)' },
          ] as any[]).map(f => {
            const Icon = f.icon;
            const on = (cfg as any)[f.key] !== false;
            return (
              <button
                key={f.key}
                onClick={() => save({ [f.key]: !on } as any)}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all cursor-pointer text-left ${
                  on ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 opacity-70'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${on ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-black text-sm text-slate-800 dark:text-white truncate">{isRtl ? f.titleAr : f.titleFr}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{isRtl ? f.descAr : f.descFr}</p>
                </div>
                <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`inline-block transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} style={{ height: 18, width: 18 }} />
                </span>
              </button>
            );
          })}

          <p className="text-[10px] font-bold text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
            {isRtl
              ? "التغييرات تُطبَّق خلال ≤15 ثانية على جميع الزوار دون إعادة نشر."
              : "Les changements s'appliquent en ≤15s pour tous les visiteurs, sans redéploiement."}
          </p>
        </section>
      </div>

      {/* ===== مصمم الشخصية ===== */}
      <section className="premium-glass p-6 sm:p-8 rounded-[2rem] border border-white/60 dark:border-white/5 space-y-6">
        <h4 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" /> {isRtl ? "مصمّم شخصية المساعد" : "Designer de personnalité"}
        </h4>

        <div className="flex flex-wrap gap-2">
          {AI_PERSONALITY_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => save({ personality: p.id })}
              className={`px-4 py-2.5 rounded-2xl border-2 font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
                cfg.personality === p.id
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 shadow-md scale-[1.03]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-base">{p.emoji}</span> {isRtl ? p.labelAr : p.labelFr}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* درجة الإبداع */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 flex items-center gap-1.5">
              <Thermometer size={13} /> {isRtl ? "درجة الإبداع" : "Créativité"} <span className="font-mono text-accent">{Number(cfg.temperature).toFixed(2)}</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={cfg.temperature}
              onChange={(e) => setCfg({ ...cfg, temperature: Number(e.target.value) })}
              onMouseUp={() => save({}, true)}
              onTouchEnd={() => save({}, true)}
              onKeyUp={() => save({}, true)}
              className="w-full mt-3 accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
              <span>{isRtl ? "دقيق" : "Précis"}</span><span>{isRtl ? "متوازن" : "Équilibré"}</span><span>{isRtl ? "خيالي" : "Imaginatif"}</span>
            </div>
          </div>

          {/* طول الرد */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">{isRtl ? "طول الرد" : "Longueur des réponses"}</label>
            <select
              value={cfg.lengthPref}
              onChange={(e) => save({ lengthPref: e.target.value as any })}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent font-bold text-sm text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="short">{isRtl ? "قصير جداً ⚡" : "Ultra-court ⚡"}</option>
              <option value="balanced">{isRtl ? "متوازن ✨" : "Équilibré ✨"}</option>
              <option value="detailed">{isRtl ? "مفصّل 📚" : "Détaillé 📚"}</option>
            </select>
          </div>

          {/* سياسة اللغة */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 flex items-center gap-1.5"><Languages size={13} /> {isRtl ? "لغة الردود" : "Langue des réponses"}</label>
            <select
              value={cfg.languagePolicy}
              onChange={(e) => save({ languagePolicy: e.target.value as any })}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent font-bold text-sm text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="auto">{isRtl ? "نفس لغة السؤال دائماً 🪞" : "Miroir : langue du client 🪞"}</option>
              <option value="ar">العربية دائماً 🇩🇿</option>
              <option value="fr">Français toujours 🇫🇷</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">{isRtl ? "أسلوب حر (يُضاف إلى الشخصية)" : "Style libre (en plus du preset)"}</label>
          <textarea
            rows={2}
            placeholder={isRtl
              ? "مثال: استخدم كلمة «يا خويا» مع الزبائن الشباب واذكر عرض الأسبوع دائماً..."
              : "Ex: tutoie les jeunes clients, mentionne toujours l'offre de la semaine..."}
            value={cfg.customStyle}
            onChange={(e) => setCfg({ ...cfg, customStyle: e.target.value })}
            onBlur={() => save({ customStyle: cfg.customStyle }, true)}
            className="w-full p-4 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent transition-colors text-sm text-slate-800 dark:text-slate-100 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">{isRtl ? "تعليمات إضافية للمساعد (أولوية عالية)" : "Instructions supplémentaires (priorité haute)"}</label>
          <textarea
            rows={3}
            placeholder={isRtl
              ? "مثال: إذا سأل الزبون عن الخصومات اذكر كود WELCOME10. لا تتحدث أبداً عن المنافسين..."
              : "Ex: si le client demande une remise, proposez WELCOME10. Ne parlez jamais des concurrents..."}
            value={cfg.extraInstructions}
            onChange={(e) => setCfg({ ...cfg, extraInstructions: e.target.value })}
            onBlur={() => save({ extraInstructions: cfg.extraInstructions }, true)}
            className="w-full p-4 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent transition-colors text-sm text-slate-800 dark:text-slate-100 resize-none"
          />
          <p className="text-[10px] font-bold text-slate-400 mt-1">{isRtl ? "تُحقن مباشرة في عقل المساعد بعد القواعد الصارمة." : "Injectées dans le system prompt juste après les règles strictes."}</p>
        </div>
      </section>

      {/* ===== هوية المساعد في الواجهة ===== */}
      <section className="premium-glass p-6 sm:p-8 rounded-[2rem] border border-white/60 dark:border-white/5 space-y-5">
        <h4 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <Bot size={18} className="text-rose-500" /> {isRtl ? "هوية المساعد في الواجهة" : "Identité de l'assistant"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">{isRtl ? "اسم المساعد" : "Nom de l'assistant"}</label>
            <input
              dir="auto"
              type="text"
              placeholder="L'Artisan AI"
              value={cfg.assistantName}
              onChange={(e) => setCfg({ ...cfg, assistantName: e.target.value })}
              onBlur={() => save({ assistantName: cfg.assistantName.trim() }, true)}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent font-bold text-sm text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">{isRtl ? "إيموجي الأفاتار" : "Emoji avatar"}</label>
            <input
              type="text"
              maxLength={4}
              placeholder="✨"
              value={cfg.assistantEmoji}
              onChange={(e) => setCfg({ ...cfg, assistantEmoji: e.target.value })}
              onBlur={() => save({ assistantEmoji: cfg.assistantEmoji.trim() }, true)}
              className="w-full p-3 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-center text-xl"
            />
          </div>
          <div className="flex items-end">
            <div className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 ${cfg.assistantEmoji || cfg.assistantName ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900' : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>
              <span className="text-xl">{cfg.assistantEmoji || '✨'}</span>
              <span className="font-black text-sm text-slate-800 dark:text-white">{cfg.assistantName || "L'Artisan AI"}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">🇫🇷 {isRtl ? "رسالة الترحيب (فرنسية)" : "Message d'accueil (français)"}</label>
            <textarea
              rows={3}
              placeholder="Bonjour ! Je suis **L'Artisan AI**..."
              value={cfg.welcomeMessageFr}
              onChange={(e) => setCfg({ ...cfg, welcomeMessageFr: e.target.value })}
              onBlur={() => save({ welcomeMessageFr: cfg.welcomeMessageFr }, true)}
              className="w-full p-4 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">🇩🇿 {isRtl ? "رسالة الترحيب (عربية)" : "Message d'accueil (arabe)"}</label>
            <textarea
              rows={3}
              dir="rtl"
              placeholder="مرحباً بك! أنا **L'Artisan AI**..."
              value={cfg.welcomeMessageAr}
              onChange={(e) => setCfg({ ...cfg, welcomeMessageAr: e.target.value })}
              onBlur={() => save({ welcomeMessageAr: cfg.welcomeMessageAr }, true)}
              className="w-full p-4 mt-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-accent text-sm text-slate-800 dark:text-slate-100 resize-none"
            />
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 -mt-2">{isRtl ? "يدعم التنسيق: **عريض** و *مائل* — تظهر فوراً لكل الزوار." : "Markdown léger supporté : **gras**, *italique* — appliqué en direct."}</p>

        {/* اقتراحات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'suggestedPromptsFr', flag: '🇫🇷', ph: "Combien coûtent 100 cartes de visite ?", rtl: false },
            { key: 'suggestedPromptsAr', flag: '🇩🇿', ph: "كم سعر 100 بطاقة زيارة ؟", rtl: true },
          ] as const).map(list => {
            const items = (cfg[list.key] as string[]) ?? [];
            const update = (next: string[]) => {
              const cleaned = next.map(s => s.trim()).filter(Boolean).slice(0, 6);
              setCfg({ ...cfg, [list.key]: cleaned } as any);
              return cleaned;
            };
            return (
              <div key={list.key} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-black text-slate-600 dark:text-slate-300 mb-3">
                  {list.flag} {list.key.endsWith('Fr') ? (isRtl ? "اقتراحات سريعة (فرنسية)" : "Suggestions rapides (FR)") : (isRtl ? "اقتراحات سريعة (عربية)" : "Suggestions rapides (AR)")}
                  <span className="text-[9px] font-bold text-slate-400 mr-2">{items.length}/6</span>
                </p>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        dir={list.rtl ? 'rtl' : 'ltr'}
                        value={item}
                        autoFocus={i === items.length - 1 && !item}
                        onChange={(e) => {
                          const next = [...items];
                          next[i] = e.target.value;
                          setCfg({ ...cfg, [list.key]: next } as any);
                        }}
                        onBlur={() => save({ [list.key]: update(items) } as any, true)}
                        placeholder={list.ph}
                        className="flex-grow p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <button onClick={() => save({ [list.key]: update(items.filter((_, j) => j !== i)) } as any)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {items.length < 6 && (
                  <button
                    onClick={() => {
                      const next = [...items, ''];
                      setCfg({ ...cfg, [list.key]: next } as any);
                    }}
                    className="mt-3 w-full p-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} /> {isRtl ? "إضافة اقتراح" : "Ajouter une suggestion"}
                  </button>
                )}
                <p className="text-[9px] font-bold text-slate-400 mt-2">{isRtl ? "اضغط خارج الحقل للحفظ التلقائي" : "Cliquez ailleurs pour sauvegarder"}</p>
              </div>
            );
          })}
        </div>
        {((cfg.suggestedPromptsFr?.length ?? 0) > 0 || (cfg.suggestedPromptsAr?.length ?? 0) > 0) && (
          <p className="text-[10px] font-bold text-indigo-500 flex items-center gap-1.5">
            <Zap size={11} /> {isRtl ? "ستحل هذه الاقتراحات محل الأزرار الافتراضية داخل الشات." : "Ces suggestions remplaceront les boutons par défaut du chat."}
          </p>
        )}
      </section>

      {/* ===== التحويل البشري وأوقات العمل والحدود ===== */}
      <section className="premium-glass p-6 sm:p-8 rounded-[2rem] border border-white/60 dark:border-white/5 space-y-6">
        <h4 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <Phone size={18} className="text-teal-500" /> {isRtl ? "التحويل البشري، أوقات العمل والحدود" : "Handoff humain, horaires & limites"}
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* واتساب */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{isRtl ? "تحويل لموظف عبر واتساب" : "Handoff WhatsApp"}</p>
            <input
              dir="ltr"
              type="tel"
              placeholder={isRtl ? "رقم واتساب — مثال: 213770123456" : "Numéro WhatsApp — ex: 213770123456"}
              value={cfg.whatsappNumber}
              onChange={(e) => setCfg({ ...cfg, whatsappNumber: e.target.value.replace(/[^\d+]/g, '') })}
              onBlur={() => save({ whatsappNumber: cfg.whatsappNumber }, true)}
              className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent font-mono text-sm text-slate-800 dark:text-slate-100"
            />
            <input
              dir="auto"
              type="text"
              placeholder={isRtl ? "كلمات تحفيز التحويل (بفواصل): بشري، موظف، مكالمة..." : "Mots déclencheurs (virgules): humain, agent, appeler..."}
              value={cfg.handoffKeywords}
              onChange={(e) => setCfg({ ...cfg, handoffKeywords: e.target.value })}
              onBlur={() => save({ handoffKeywords: cfg.handoffKeywords }, true)}
              className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs font-bold text-slate-800 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="FR: pitch transfert..."
                value={cfg.handoffMessageFr}
                onChange={(e) => setCfg({ ...cfg, handoffMessageFr: e.target.value })}
                onBlur={() => save({ handoffMessageFr: cfg.handoffMessageFr }, true)}
                className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs text-slate-800 dark:text-slate-100"
              />
              <input
                dir="rtl"
                type="text"
                placeholder="AR: رسالة التحويل..."
                value={cfg.handoffMessageAr}
                onChange={(e) => setCfg({ ...cfg, handoffMessageAr: e.target.value })}
                onBlur={() => save({ handoffMessageAr: cfg.handoffMessageAr }, true)}
                className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
            {cfg.whatsappNumber && (
              <a href={`https://wa.me/${cfg.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 hover:underline">
                <Phone size={10} /> wa.me/{cfg.whatsappNumber.replace(/\D/g, '')}
              </a>
            )}
          </div>

          {/* أوقات العمل */}
          <div className="space-y-3">
            <button
              onClick={() => save({ workingHoursEnabled: !cfg.workingHoursEnabled })}
              className={`w-full p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${cfg.workingHoursEnabled ? 'border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/20' : 'border-slate-200 dark:border-slate-700 opacity-75'}`}
            >
              <Clock size={18} className={cfg.workingHoursEnabled ? 'text-teal-500' : 'text-slate-400'} />
              <span className="font-black text-sm text-slate-800 dark:text-white flex-grow text-right">{isRtl ? "أوقات العمل" : "Horaires d'ouverture"}</span>
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${cfg.workingHoursEnabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`inline-block transform rounded-full bg-white shadow transition-transform ${cfg.workingHoursEnabled ? 'translate-x-6' : 'translate-x-1'}`} style={{ height: 18, width: 18 }} />
              </span>
            </button>
            {cfg.workingHoursEnabled && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 ml-1">{isRtl ? "من" : "De"}</span>
                    <input
                      dir="ltr" type="time"
                      value={cfg.workingHoursStart}
                      onChange={(e) => setCfg({ ...cfg, workingHoursStart: e.target.value })}
                      onBlur={() => save({ workingHoursStart: cfg.workingHoursStart }, true)}
                      className="w-full p-2.5 mt-0.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-sm font-bold text-slate-800 dark:text-slate-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-400 ml-1">{isRtl ? "إلى" : "À"}</span>
                    <input
                      dir="ltr" type="time"
                      value={cfg.workingHoursEnd}
                      onChange={(e) => setCfg({ ...cfg, workingHoursEnd: e.target.value })}
                      onBlur={() => save({ workingHoursEnd: cfg.workingHoursEnd }, true)}
                      className="w-full p-2.5 mt-0.5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-sm font-bold text-slate-800 dark:text-slate-100"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="FR: note hors-horaires..."
                    value={cfg.outsideHoursNoteFr}
                    onChange={(e) => setCfg({ ...cfg, outsideHoursNoteFr: e.target.value })}
                    onBlur={() => save({ outsideHoursNoteFr: cfg.outsideHoursNoteFr }, true)}
                    className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs text-slate-800 dark:text-slate-100"
                  />
                  <input
                    dir="rtl"
                    type="text"
                    placeholder="AR: ملاحظة خارج الوقت..."
                    value={cfg.outsideHoursNoteAr}
                    onChange={(e) => setCfg({ ...cfg, outsideHoursNoteAr: e.target.value })}
                    onBlur={() => save({ outsideHoursNoteAr: cfg.outsideHoursNoteAr }, true)}
                    className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            {/* حد الاستخدام */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2 flex items-center gap-1.5">
                <GaugeCircle size={13} /> {isRtl ? "حد الرسائل / ساعة / زائر" : "Limite messages / heure / visiteur"}
                <span className="font-mono text-indigo-500">{cfg.chatRateLimitPerHour === 0 ? (isRtl ? "بلا حد" : "illimité") : cfg.chatRateLimitPerHour}</span>
              </label>
              <input
                dir="ltr" type="range" min={0} max={120} step={5}
                value={Math.min(cfg.chatRateLimitPerHour, 120)}
                onChange={(e) => setCfg({ ...cfg, chatRateLimitPerHour: Number(e.target.value) })}
                onMouseUp={() => save({}, true)}
                onTouchEnd={() => save({}, true)}
                onKeyUp={() => save({}, true)}
                className="w-full mt-2 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* رسالة الانقطاع */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{isRtl ? "رسالة عند انقطاع الخدمة" : "Message si l'IA est indisponible"}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="FR: message de secours personnalisé..."
              value={cfg.unavailableMessageFr}
              onChange={(e) => setCfg({ ...cfg, unavailableMessageFr: e.target.value })}
              onBlur={() => save({ unavailableMessageFr: cfg.unavailableMessageFr }, true)}
              className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs text-slate-800 dark:text-slate-100"
            />
            <input
              dir="rtl"
              type="text"
              placeholder="AR: رسالة بديلة مخصصة عند الانقطاع..."
              value={cfg.unavailableMessageAr}
              onChange={(e) => setCfg({ ...cfg, unavailableMessageAr: e.target.value })}
              onBlur={() => save({ unavailableMessageAr: cfg.unavailableMessageAr }, true)}
              className="w-full p-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-accent text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* ===== ملعب التجربة ===== */}
      <section className="rounded-[2rem] border border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h4 className="font-black text-lg text-white flex items-center gap-2">
            <Play size={18} className="text-indigo-300" /> {isRtl ? "ملعب التجربة الفوري" : "Bac à sable en direct"}
          </h4>
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{isRtl ? "يستخدم نفس إعداداتك الحالية" : "Utilise vos réglages actuels"}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            dir="auto"
            type="text"
            placeholder={isRtl ? "اكتب رسالة تجريبية... مثال: بشح كذا بطاقة زيارة؟" : "Message test... ex: combien pour 200 cartes de visite ?"}
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runTest(); }}
            className="flex-grow p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:border-indigo-400 text-white placeholder:text-indigo-300/50 text-sm"
          />
          <button
            onClick={runTest}
            disabled={testing || !testPrompt.trim()}
            className="px-6 py-4 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {isRtl ? "جرّب الآن" : "Tester"}
          </button>
        </div>

        {testResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white/95 dark:bg-slate-800/95 p-5 rounded-2xl relative">
            <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600 flex items-center gap-1">
                <Activity size={10} /> {activeProviderLabel}
              </span>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-600 flex items-center gap-1">
                <Timer size={10} /> {(testResult.latencyMs / 1000).toFixed(1)}s
              </span>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-600 flex items-center gap-1">
                <Thermometer size={10} /> T° {Number(cfg.temperature).toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">{testResult.text}</p>
          </motion.div>
        )}
      </section>

      {/* ===== تحليلات الاستخدام ===== */}
      <section className="premium-glass p-6 sm:p-8 rounded-[2rem] border border-white/60 dark:border-white/5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h4 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Activity size={18} className="text-cyan-500" /> {isRtl ? "استخدام الذكاء الاصطناعي — آخر 7 أيام" : "Utilisation IA — 7 derniers jours"}
          </h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300">
              {isRtl ? "اليوم" : "Aujourd'hui"} : <span className="text-indigo-500">{usage?.today ?? "—"}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300">
              {isRtl ? "7 أيام" : "7 jours"} : <span className="text-indigo-500">{usage?.total ?? "—"}</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300">
              Ø {isRtl ? "المدة" : "latence"} : <span className="text-cyan-500">{usage ? (usage.avgLatency / 1000).toFixed(1) + "s" : "—"}</span>
            </span>
          </div>
        </div>
        {usage && usage.chart.some(d => d.messages > 0)
          ? <AiUsageChart data={usage.chart} />
          : (
            <div className="py-12 text-center">
              <Bot size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-xs font-bold text-slate-400">{isRtl ? "لا توجد بيانات استخدام بعد — جرّب الملعب أعلاه!" : "Pas encore de données — testez le bac à sable !"}</p>
            </div>
          )}
      </section>
    </motion.div>
  );
}
