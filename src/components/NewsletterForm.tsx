"use client";
// src/components/NewsletterForm.tsx
// نموذج اشتراك النشرة البريدية — كتابة مباشرة لـ Firestore بقواعد أمان صارمة.
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Mail, Send, Loader2, CheckCircle2 } from "lucide-react";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function NewsletterForm({ source = "footer" }: { source?: "footer" | "popup" | "checkout" }) {
  const language = useAppStore((s) => s.language);
  const isAr = language === "ar";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      toast.error(isAr ? "يرجى إدخال بريد إلكتروني صحيح" : "Veuillez entrer un email valide");
      return;
    }
    setLoading(true);
    try {
      // معرّف المستند = تجزئة بسيطة للبريد → منع التكرار دون تخزين بريده كمعرّف
      let hash = 5381;
      for (let i = 0; i < clean.length; i++) hash = ((hash << 5) + hash + clean.charCodeAt(i)) >>> 0;
      await setDoc(
        doc(db, "newsletter_subscribers", `sub_${hash.toString(36)}`),
        { email: clean, source, subscribedAt: new Date().toISOString() }
      );
      setDone(true);
      toast.success(isAr ? "تم الاشتراك بنجاح! ترقب عروضنا الحصرية 🎁" : "Inscription réussie ! Surveillez nos offres exclusives 🎁");
    } catch (err: any) {
      if (String(err?.code) === "permission-denied" || String(err?.message).includes("permission")) {
        setDone(true); // مشترك مسبقاً (المعرّف محمي بالقواعد)
        toast.info(isAr ? "أنت مشترك أصلاً في نشرتنا!" : "Vous êtes déjà inscrit !");
      } else {
        toast.error(isAr ? "تعذر الاشتراك، حاول لاحقاً" : "Échec de l'inscription, réessayez");
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400" aria-live="polite">
        <CheckCircle2 size={18} />
        {isAr ? "شكراً لانضمامك إلى عائلة الحرفي!" : "Merci de rejoindre la famille L'Artisan !"}
      </div>
    );
  }

  return (
    <form onSubmit={subscribe} className="w-full max-w-md" aria-label={isAr ? "النشرة البريدية" : "Newsletter"}>
      <label className="flex items-center gap-2 text-sm font-bold mb-2">
        <Mail size={16} className="text-indigo-500" />
        {isAr ? "اشترك ليصلك كل عرض جديد أولاً" : "Recevez nos offres en avant-première"}
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isAr ? "بريدك الإلكتروني" : "Votre email"}
          maxLength={254}
          autoComplete="email"
          className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2.5 text-sm font-bold transition active:scale-95"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {isAr ? "اشترك" : "S'inscrire"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        {isAr ? "رسالة واحدة أسبوعياً كحد أقصى — إلغاء الاشتراك بضغطة واحدة." : "Un email par semaine maximum — désinscription en un clic."}
      </p>
    </form>
  );
}
