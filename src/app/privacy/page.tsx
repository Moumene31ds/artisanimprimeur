"use client";

import { useAppStore } from "@/lib/store";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const { language } = useAppStore();
  const isRtl = language === "ar";

  return (
    <div className={`max-w-4xl mx-auto pb-24 px-4 pt-10 animate-fadeIn ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mb-12 flex items-center gap-4">
        <Link href="/" className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={24} className={isRtl ? 'rotate-180' : ''} />
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="text-accent" size={40} />
          {isRtl ? "سياسة الخصوصية" : "Politique de Confidentialité"}
        </h1>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="premium-glass p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-white/60 dark:border-white/10 space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed"
      >
        <p className="text-lg font-bold text-slate-800 dark:text-white">
          {isRtl ? "آخر تحديث: [تاريخ اليوم]" : "Dernière mise à jour : [Date du jour]"}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white border-b pb-2">{isRtl ? "1. جمع البيانات" : "1. Collecte des données"}</h2>
          <p>{isRtl ? "نحن نجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب أو إتمام طلب، مثل الاسم، رقم الهاتف، والولاية." : "Nous collectons les informations que vous nous fournissez directement lors de la création d'un compte ou de la passation d'une commande (nom, téléphone, wilaya)."}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white border-b pb-2">{isRtl ? "2. استخدام البيانات" : "2. Utilisation des données"}</h2>
          <ul className="list-disc list-inside pl-5 space-y-2">
            <li>{isRtl ? "معالجة طلباتك وخدمة الاستلام." : "Traiter vos commandes et gérer leur retrait."}</li>
            <li>{isRtl ? "التواصل معك بخصوص حالة الطلب." : "Vous contacter concernant l'état de votre commande."}</li>
            <li>{isRtl ? "تحسين خدماتنا وتجربة المستخدم." : "Améliorer nos services et l'expérience utilisateur."}</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white border-b pb-2">{isRtl ? "3. أمان البيانات" : "3. Sécurité des données"}</h2>
          <p>{isRtl ? "نحن نستخدم تقنيات التشفير المتقدمة (مثل بروتوكولات Firebase) لحماية بياناتك الشخصية من الوصول غير المصرح به." : "Nous utilisons des technologies de cryptage avancées pour protéger vos données personnelles contre tout accès non autorisé."}</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white border-b pb-2">{isRtl ? "4. حقوقك (بما في ذلك حذف الحساب)" : "4. Vos droits (y compris la suppression du compte)"}</h2>
          <p>{isRtl ? "لديك الحق في الوصول إلى بياناتك أو تعديلها أو طلب حذف حسابك بالكامل من خلال صفحة 'ملفي الشخصي'." : "Vous avez le droit d'accéder à vos données, de les modifier, ou de demander la suppression complète de votre compte via la page 'Mon Profil'."}</p>
        </section>

      </motion.div>
    </div>
  );
}
