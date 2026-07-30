"use client";

import { useAppStore } from "@/lib/store";
import { createTranslator, getLanguageDirection, normalizeLanguage } from "@/lib/translations";
import { Mail, ArrowLeft, Send, Sparkles, ShieldCheck, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const { language } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const normalizedLanguage = normalizeLanguage(language);
  const isRtl = getLanguageDirection(normalizedLanguage) === "rtl";
  const t = createTranslator(normalizedLanguage);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
      toast.success(isRtl ? "تم إرسال رابط إعادة التعيين!" : "Lien de réinitialisation envoyé !");
    } catch (err: any) {
      toast.error(isRtl ? "حدث خطأ، تأكد من البريد الإلكتروني" : "Erreur، vérifiez l'e-mail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617] p-6 relative overflow-hidden`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* عناصر خلفية سحرية */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg bg-white/70 dark:bg-slate-900/50 backdrop-blur-2xl border border-white dark:border-white/10 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl"
      >
        {/* زر العودة */}
        <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-8 group">
          <ArrowLeft size={20} className={`${isRtl ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'} transition-transform`} />
          <span className="font-bold text-sm">{t('backToLogin')}</span>
        </Link>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-10 text-center lg:text-start">
                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 mx-auto lg:mx-0 border border-blue-600/20 shadow-inner">
                  <ShieldCheck size={32} className="text-blue-600" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
                  {t('forgotPasswordTitle')}
                </h1>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {t('forgotPasswordDescription')}
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-5' : 'left-0 pl-5'} flex items-center pointer-events-none`}>
                    <Mail size={20} className="text-slate-400" />
                  </div>
                  <input 
                    required 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isRtl ? "عنوان البريد الإلكتروني" : "Adresse e-mail"}
                    className={`w-full ${isRtl ? 'pr-14' : 'pl-14'} py-5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium`} 
                  />
                </div>

                <button 
                  disabled={loading}
                  type="submit" 
                  className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-3 group"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isRtl ? "إرسال رابط التعيين" : "Envoyer le lien"}</span>
                      <Send size={20} className={`${isRtl ? 'rotate-180' : ''} group-hover:translate-y-[-2px] group-hover:translate-x-[2px] transition-transform`} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="relative w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="bg-emerald-500 text-white p-4 rounded-full shadow-lg"
                >
                  <Send size={40} />
                </motion.div>
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-emerald-500 rounded-full"
                ></motion.div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                {isRtl ? "تحقق من بريدك!" : "Vérifiez votre boîte !"}
              </h2>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                {isRtl 
                  ? `لقد أرسلنا تعليمات استعادة كلمة المرور إلى ${email}` 
                  : `Nous avons envoyé les instructions de récupération à ${email}`}
              </p>

              <button 
                onClick={() => router.push("/login")}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                {isRtl ? "العودة لتسجيل الدخول" : "Retour à la connexion"}
              </button>
              
              <p className="mt-6 text-sm text-slate-400">
                {isRtl ? "لم تصلك الرسالة؟ " : "Vous n'avez rien reçu ? "}
                <button onClick={() => setSubmitted(false)} className="text-blue-600 font-bold underline decoration-blue-600/30 underline-offset-4">
                  {isRtl ? "حاول مجدداً" : "Réessayer"}
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* لمسة فنية سفلية */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 dark:opacity-40">
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-12 bg-slate-400"></div>
          <Printer size={20} className="text-slate-400" />
          <div className="h-[1px] w-12 bg-slate-400"></div>
        </div>
      </div>
    </div>
  );
}
