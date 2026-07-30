"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Hammer, ShieldCheck, Mail, CheckCircle2, BellRing, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

export default function MaintenancePage() {
  const language = useAppStore((state) => state.language);
  const [uiConfig, setUiConfig] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  const [contactInput, setContactInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ui"), (docSnap) => {
      if (docSnap.exists()) {
        setUiConfig(docSnap.data());
      }
      setLoadingSettings(false);
    });
    return () => unsub();
  }, []);

  // حساب العداد التنازلي
  useEffect(() => {
    if (!uiConfig?.maintenanceUntil) return;

    const interval = setInterval(() => {
      const target = new Date(uiConfig.maintenanceUntil).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [uiConfig]);

  const isRtl = language === "ar";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInput.trim()) return;
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

  if (loadingSettings) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-xs text-indigo-400 font-bold tracking-widest uppercase">
            {isRtl ? "جاري التحميل..." : "Chargement..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none selection:bg-accent">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] animate-pulse" />
      
      <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-2xl relative z-10 flex flex-col items-center text-center">
        <div className="mb-6 px-4 py-1.5 bg-slate-900/80 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          {isRtl ? "خوادم قاعدة البيانات: آمنة ومستقرة" : "Database Security: Fully Secured"}
        </div>

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
        </div>

        <h1 className="text-2xl md:text-4xl font-black mb-4">
          {isRtl ? "نقوم ببعض التحديثات السحرية" : "Mise à niveau en cours"}
        </h1>
        <p className="text-slate-400 max-w-md text-xs md:text-sm font-medium leading-relaxed mb-8">
          {isRtl ? "نعمل حالياً على تعزيز أنظمة الأمان وتسريع خيارات الطباعة لنمنحك تجربة ممتازة." : "Nous améliorons la sécurité et les performances. Retour en ligne imminent !"}
        </p>

        {uiConfig?.maintenanceUntil && new Date(uiConfig.maintenanceUntil).getTime() > new Date().getTime() && (
          <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-sm w-full mb-8 bg-black/30 border border-white/5 p-4 rounded-2xl" dir="ltr">
            {[
              { label: isRtl ? "يوم" : "Days", value: timeLeft.days },
              { label: isRtl ? "ساعة" : "Hours", value: timeLeft.hours },
              { label: isRtl ? "دقيقة" : "Min", value: timeLeft.minutes },
              { label: isRtl ? "ثانية" : "Sec", value: timeLeft.seconds },
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <span className="text-lg md:text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                  {String(item.value).padStart(2, "0")}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        )}

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
                    placeholder={isRtl ? "رقم الهاتف أو البريد الإلكتروني..." : "Email ou Téléphone..."}
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs outline-none focus:border-indigo-500 pl-10 pr-4"
                  />
                  <div className="absolute left-3 text-slate-500">
                    {contactInput.includes("@") ? <Mail size={14} /> : <Phone size={14} />}
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-xs shadow-lg disabled:opacity-50"
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
      </div>
    </div>
  );
}
