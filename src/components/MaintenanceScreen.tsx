"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import {
  Hammer, ShieldCheck, Mail, CheckCircle2, BellRing, Phone,
  Database, Zap, Globe, RefreshCw,
  Languages, Sparkles, Clock, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

const FacebookIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V11H8.2v3h2.5v7h2.8Z" />
  </svg>
);

const InstagramIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const STATUS_CHIPS = [
  { icon: Database, key: "db" },
  { icon: ShieldCheck, key: "sec" },
  { icon: Zap, key: "cdn" },
] as const;

const WORK_STEPS = [
  { ar: "ترقية أنظمة الحماية", fr: "Mise à niveau de la sécurité", duration: 3200 },
  { ar: "تسريع خيارات الطباعة", fr: "Optimisation des impressions", duration: 5200 },
  { ar: "تحسين تجربة التسوق", fr: "Amélioration de l'expérience", duration: 7400 },
];

interface MaintenanceScreenProps {
  uiConfig: any;
}

export default function MaintenanceScreen({ uiConfig }: MaintenanceScreenProps) {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  const [contactInput, setContactInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [progress, setProgress] = useState(4);
  const [doneSteps, setDoneSteps] = useState<number>(0);
  const [online, setOnline] = useState(true);
  const finishedRef = useRef(false);

  const isRtl = language === "ar";

  // حالة الاتصال بالشبكة
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // حساب العداد التنازلي + إعادة التحميل التلقائية عند انتهاء الصيانة
  useEffect(() => {
    if (!uiConfig?.maintenanceUntil) return;

    const tick = () => {
      const target = new Date(uiConfig.maintenanceUntil).getTime();
      const difference = target - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!finishedRef.current) {
          finishedRef.current = true;
          setCountdownFinished(true);
        }
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [uiConfig]);

  // عند انتهاء العدّاد: انتظر قليلاً ثم أعد تحميل الصفحة تلقائياً لرصد نهاية الصيانة
  useEffect(() => {
    if (!countdownFinished) return;
    const t = setTimeout(() => window.location.reload(), 8000);
    return () => clearTimeout(t);
  }, [countdownFinished]);

  // شريط التقدم المتحرك
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 96 ? 96 : p + Math.random() * 1.5));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // قائمة المهام المنجزة تدريجياً
  useEffect(() => {
    WORK_STEPS.forEach((_, i) => {
      setTimeout(() => setDoneSteps(i + 1), WORK_STEPS.slice(0, i + 1).reduce((a, s) => a + s.duration, 0));
    });
  }, []);

  const whatsappUrl = useMemo(() => {
    const phone = uiConfig?.shopPhone?.replace(/[^0-9]/g, "");
    return phone ? `https://wa.me/${phone}` : null;
  }, [uiConfig]);

  const title = isRtl
    ? (uiConfig?.maintenanceTitleAr || "نقوم ببعض التحديثات السحرية")
    : (uiConfig?.maintenanceTitleFr || "Mise à niveau en cours");

  const message = isRtl
    ? (uiConfig?.maintenanceMessageAr || "نعمل حالياً على تعزيز أنظمة الأمان وتسريع خيارات الطباعة لنمنحك تجربة ممتازة.")
    : (uiConfig?.maintenanceMessageFr || "Nous améliorons la sécurité et les performances. Retour en ligne imminent !");

  const showCountdown = uiConfig?.maintenanceUntil && new Date(uiConfig.maintenanceUntil).getTime() > Date.now();

  const isValidContact = useMemo(() => {
    const v = contactInput.trim();
    if (!v) return false;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^[+]?[0-9\s-]{8,15}$/;
    return emailRe.test(v) || phoneRe.test(v);
  }, [contactInput]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidContact || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "maintenance_subscribers"), {
        contact: contactInput.trim(),
        subscribedAt: serverTimestamp(),
        lang: language
      });
      setIsSubscribed(true);
      toast.success(isRtl ? "تم تسجيلك بنجاح!" : "Inscrit avec succès !");
    } catch (error) {
      toast.error(isRtl ? "حدث خطأ ما" : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none selection:bg-accent" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Aurora Orbs */}
      <motion.div
        aria-hidden
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 z-0 w-[28rem] h-[28rem] rounded-full bg-indigo-600/20 blur-[120px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -50, 40, 0], y: [0, 50, -30, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
        className="absolute -bottom-40 -right-24 z-0 w-[26rem] h-[26rem] rounded-full bg-purple-600/20 blur-[120px]"
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, 30, -40, 0], opacity: [0.15, 0.3, 0.15] }}
        transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 z-0 w-72 h-72 rounded-full bg-emerald-500/10 blur-[100px]"
      />

      {/* Floating Particles */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        {[...Array(14)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-indigo-400/40"
            style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 17) % 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={{ repeat: Infinity, duration: 5 + (i % 5) * 2, delay: i * 0.4, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Language Switcher */}
      <button
        onClick={() => setLanguage(isRtl ? "fr" : "ar")}
        className="absolute top-4 end-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/70 hover:bg-slate-800 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors cursor-pointer"
        title={isRtl ? "Français" : "العربية"}
      >
        <Languages size={12} />
        {isRtl ? "FR" : "عربي"}
      </button>

      <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {/* Status Chips */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {STATUS_CHIPS.map(({ icon: Icon, key }) => (
            <div key={key} className="px-3 py-1.5 bg-slate-900/80 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5">
              <Icon size={11} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {key === "db" && (isRtl ? "قاعدة البيانات آمنة" : "Base de données sécurisée")}
              {key === "sec" && (isRtl ? "الحماية مفعلة" : "Pare-feu actif")}
              {key === "cdn" && (isRtl ? "شبكة التوزيع سريعة" : "CDN rapide")}
            </div>
          ))}
        </div>

        {/* Offline Warning */}
        {!online && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <Globe size={13} />
            {isRtl ? "لا يوجد اتصال بالإنترنت" : "Connexion Internet perdue"}
          </motion.div>
        )}

        <div className="relative mb-6">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl shadow-xl"
          >
            <Hammer size={40} />
          </motion.div>
          <div className="absolute -bottom-2 -right-2 p-1.5 bg-emerald-500 text-slate-950 rounded-xl border-4 border-slate-900 shadow-lg">
            <ShieldCheck size={16} />
          </div>
          <motion.div
            aria-hidden
            animate={{ y: [-2, -8, -2], rotate: [0, 15, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute -top-3 -left-3 text-yellow-300"
          >
            <Sparkles size={16} />
          </motion.div>
        </div>

        <h1 className="text-2xl md:text-4xl font-black mb-4">{title}</h1>
        <p className="text-slate-400 max-w-md text-xs md:text-sm font-medium leading-relaxed mb-6">{message}</p>

        {/* Work Progress Checklist */}
        <div className="w-full max-w-md mb-6 space-y-2" dir={isRtl ? "rtl" : "ltr"}>
          {WORK_STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              animate={{ opacity: doneSteps > i ? 1 : 0.35, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 border border-white/5 rounded-xl text-start"
            >
              {doneSteps > i ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <Loader2 size={16} className="text-indigo-400 shrink-0 animate-spin" />
              )}
              <span className={`text-xs font-bold ${doneSteps > i ? "text-slate-200 line-through decoration-emerald-500/50" : "text-slate-400"}`}>
                {isRtl ? step.ar : step.fr}
              </span>
            </motion.div>
          ))}

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 px-1">
              <span>{isRtl ? "نسبة الإنجاز" : "Progression"}</span>
              <span className="text-indigo-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950 border border-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.8 }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Countdown */}
        {showCountdown && (
          <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-sm w-full mb-6 bg-black/30 border border-white/5 p-4 rounded-2xl" dir="ltr">
            {[
              { label: isRtl ? "يوم" : "Days", value: timeLeft.days },
              { label: isRtl ? "ساعة" : "Hours", value: timeLeft.hours },
              { label: isRtl ? "دقيقة" : "Min", value: timeLeft.minutes },
              { label: isRtl ? "ثانية" : "Sec", value: timeLeft.seconds },
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={item.value}
                    initial={{ y: -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 12, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-lg md:text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400"
                  >
                    {String(item.value).padStart(2, "0")}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Countdown Finished Notice */}
        <AnimatePresence>
          {countdownFinished && !showCountdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 w-full max-w-md px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold"
            >
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
              {isRtl ? "اكتملت الصيانة! جاري إعادة الاتصال بالموقع..." : "Maintenance terminée ! Reconnexion au site..."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscribe Form */}
        <div className="w-full max-w-md bg-slate-950/60 border border-white/5 rounded-2xl p-4 md:p-6 backdrop-blur-md">
          <AnimatePresence mode="wait">
            {!isSubscribed ? (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubscribe}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-black">
                  <BellRing size={14} className="animate-bounce" />
                  <span>{isRtl ? "أعلمني فور إطلاق الموقع مجدداً:" : "Soyez le premier informé :"}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    inputMode={contactInput.includes("@") ? "email" : "tel"}
                    placeholder={isRtl ? "رقم الهاتف أو البريد الإلكتروني..." : "Email ou Téléphone..."}
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 rounded-xl bg-slate-900 border text-white placeholder-slate-500 text-xs outline-none transition-colors pl-10 pr-4 ${contactInput && !isValidContact ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-indigo-500"}`}
                  />
                  <div className="absolute left-3 text-slate-500">
                    {contactInput.includes("@") ? <Mail size={14} /> : <Phone size={14} />}
                  </div>
                </div>
                {contactInput && !isValidContact && (
                  <p className="text-red-400 text-[10px] font-bold text-start">
                    {isRtl ? "يرجى إدخال بريد إلكتروني أو رقم هاتف صحيح" : "Veuillez saisir un email ou un numéro valide"}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || (contactInput.length > 0 && !isValidContact)}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (isRtl ? "جاري الحفظ..." : "Inscription...") : (isRtl ? "اشترك الآن مجاناً" : "M'abonner")}
                </button>
              </motion.form>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 py-4 text-emerald-400 font-bold text-xs"
              >
                <CheckCircle2 size={32} />
                <span>{isRtl ? "تم حفظ بياناتك بأمان!" : "Merci ! Nous vous préviendrons."}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Contact */}
        {(whatsappUrl || uiConfig?.facebookUrl || uiConfig?.instagramUrl) && (
          <div className="mt-6 flex items-center gap-3">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold transition-colors"
              >
                <Phone size={13} />
                {isRtl ? "تواصل معنا" : "Nous contacter"}
              </a>
            )}
            {uiConfig?.facebookUrl && (
              <a href={uiConfig.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 rounded-full transition-colors">
                <FacebookIcon size={14} />
              </a>
            )}
            {uiConfig?.instagramUrl && (
              <a href={uiConfig.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 rounded-full transition-colors">
                <InstagramIcon size={14} />
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/5 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-bold tracking-wide">
          <Clock size={10} />
          <span>© {new Date().getFullYear()} Artisan Imprimeur</span>
          <span className="text-slate-700">•</span>
          <span>{isRtl ? "نعتز بثقتكم" : "Merci de votre confiance"}</span>
        </div>
      </div>
    </div>
  );
}
