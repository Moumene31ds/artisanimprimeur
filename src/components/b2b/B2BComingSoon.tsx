"use client";

import React, { useState } from "react";
import { 
  Building2, Sparkles, ShieldCheck, CheckCircle2, 
  Send, Phone, MessageSquare, ArrowRight, Lock, 
  Layers, Users, HandCoins, FileText, Landmark
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

interface B2BComingSoonProps {
  isRtl?: boolean;
  isAdmin?: boolean;
  onPreviewFullPortal?: () => void;
}

export default function B2BComingSoon({
  isRtl = true,
  isAdmin = false,
  onPreviewFullPortal
}: B2BComingSoonProps) {
  // Form states
  const [companyName, setCompanyName] = useState("");
  const [rcNumber, setRcNumber] = useState("");
  const [wilaya, setWilaya] = useState("Oran");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("50000 - 150000 DA");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !phone.trim() || !contactName.trim()) {
      toast.error(isRtl ? "يرجى ملء اسم المؤسسة، المسؤول، ورقم الهاتف" : "Veuillez renseigner l'entreprise, le contact et le téléphone");
      return;
    }

    setIsSubmitting(true);
    try {
      triggerHapticFeedback("medium");
    } catch {}

    try {
      await addDoc(collection(db, "b2b_leads"), {
        companyName: companyName.trim(),
        rcNumber: rcNumber.trim(),
        wilaya,
        contactName: contactName.trim(),
        contactRole: contactRole.trim(),
        email: email.trim(),
        phone: phone.trim(),
        monthlyVolume,
        notes: notes.trim(),
        status: "pending", // pending, contacted, approved, rejected
        createdAt: serverTimestamp(),
      });

      setIsSubmitted(true);
      toast.success(
        isRtl 
          ? "تم تسجيل طلب انضمام مؤسستكم بنجاح! سيتواصل معكم مسؤول كبار الحسابات قريباً." 
          : "Demande enregistrée avec succès ! Notre responsable grands comptes vous contactera."
      );
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "حدث خطأ أثناء التسجيل، يرجى المحاولة لاحقاً" : "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    isRtl
      ? "مرحباً، أود الاستفسار وطلب وصول مسبق لبوابة الشركات والمؤسسات B2B لدى مطبعة الحرفي L'Artisan Imprimeur."
      : "Bonjour, je souhaite demander un accès prioritaire à l'Espace B2B Entreprises chez L'Artisan Imprimeur."
  );

  return (
    <div className={`max-w-6xl mx-auto pb-24 px-4 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Admin Preview Mode Notice */}
      {isAdmin && onPreviewFullPortal && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
              {isRtl 
                ? "وضع المشرف: بوابة الشركات في حالة (قريباً) للزوار. يمكنك معاينة البوابة التشغيلية الكاملة الآن:" 
                : "Mode Admin : Le portail B2B est en mode (Bientôt) pour les visiteurs. Aperçu du portail complet :"}
            </p>
          </div>
          <button
            onClick={onPreviewFullPortal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            {isRtl ? "معاينة البوابة التشغيلية B2B" : "Aperçu Portail Opérationnel"}
          </button>
        </div>
      )}

      {/* Hero Teaser Banner */}
      <div className="relative overflow-hidden premium-glass rounded-[2.5rem] p-6 sm:p-12 border border-white/60 dark:border-white/10 shadow-2xl mb-12 text-center mt-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-blue-500/15 blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-wider mb-5">
          <Building2 size={15} />
          {isRtl ? "بوابة الشركات والمؤسسات • قريباً جداً" : "Espace B2B & Grands Comptes • Bientôt"}
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 max-w-3xl mx-auto leading-tight tracking-tight">
          {isRtl ? "الحل المتكامل للطباعة المؤسسية وإدارة الفروع للشركات" : "La Plateforme d'Impression Dédiée aux Entreprises"}
        </h1>

        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
          {isRtl
            ? "نضع اللمسات الأخيرة لإطلاق المنصة المؤسسية الأولى بالجزائر للشركات والمصانع والهيئات: تسهيلات دفع بالفاتورة، كشف فروع مركزي، ومحرك فرز صناعي بأفضل الأسعار الوطنية."
            : "Nous finalisons le déploiement de la solution B2B leader : facilités de paiement sur facture, gestion multi-filiales, devis instantanés et tarifs industriels dégressifs."}
        </p>

        {/* Quick Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
          {[
            {
              icon: <FileText size={20} className="text-blue-500" />,
              title: isRtl ? "فواتير رسمية ودفع مؤجل" : "Facturation 30/60j",
              sub: isRtl ? "مطبقة للأنظمة الجبائية" : "100% Conforme DGI"
            },
            {
              icon: <Landmark size={20} className="text-emerald-500" />,
              title: isRtl ? "أسعار صناعية حصرية" : "Tarifs Industriels",
              sub: isRtl ? "خصومات حجم تصل 25%" : "Jusqu'à -25% en volume"
            },
            {
              icon: <Users size={20} className="text-purple-500" />,
              title: isRtl ? "إدارة ميزانيات الفروع" : "Multi-Filiales",
              sub: isRtl ? "تحديد سقف لكل وكالة" : "Plafonds par agence"
            },
            {
              icon: <ShieldCheck size={20} className="text-amber-500" />,
              title: isRtl ? "مسؤول حسابات خاص" : "Account Manager VIP",
              sub: isRtl ? "متابعة فورية على مدار الساعة" : "Support dédié 24/7"
            }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 shadow-sm">
                {item.icon}
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-white mb-0.5">{item.title}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* WhatsApp Direct Concierge */}
        <a
          href={`https://wa.me/213549179000?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <MessageSquare size={16} />
          {isRtl ? "تواصل مباشر مع مسؤول كبار الحسابات عبر واتساب" : "Contacter le Responsable Grands Comptes"}
        </a>
      </div>

      {/* Early Access Waitlist Form */}
      <div className="max-w-2xl mx-auto ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {isRtl ? "طلب اعتماد مؤسستكم والانضمام المبكر" : "Demande d'Accès Prioritaire B2B"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isRtl 
              ? "سجل بيانات شركتك للحصول على شروط تجارية خاصة وأولوية التفعيل فور الإطلاق."
              : "Remplissez ce formulaire pour être parmi les premières entreprises à bénéficier de l'Espace Pro."}
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isRtl ? "شكراً لكم! تم استلام طلبكم" : "Demande Reçue avec Succès !"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {isRtl 
                ? "قام فريقنا بتسجيل ملف شركتكم. سيتصل بكم مستشار الأعمال لدينا خلال 24 ساعة لاستكمال وثائق الاعتماد."
                : "Notre équipe a bien enregistré votre dossier. Un conseiller dédié vous contactera dans les 24h."}
            </p>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-xs font-black text-blue-600 dark:text-blue-400 underline pt-2 cursor-pointer"
            >
              {isRtl ? "تقديم طلب لمؤسسة أخرى" : "Enregistrer une autre entreprise"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "اسم المؤسسة / الشركة *" : "Raison Sociale *"}
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={isRtl ? "مثال: شركة النور للتوزيع SPA" : "Ex: Société Tech Algérie SARL"}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "رقم السجل التجاري (RC) أو NIF" : "Numéro RC ou NIF"}
                </label>
                <input
                  type="text"
                  value={rcNumber}
                  onChange={(e) => setRcNumber(e.target.value)}
                  placeholder="31/00-098234B21"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "اسم ولقب المفوض أو المسؤول *" : "Nom du Contact Référent *"}
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={isRtl ? "مثال: أحمد قادري" : "Ex: Karim Benali"}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "الصفة / الوظيفة" : "Fonction / Poste"}
                </label>
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder={isRtl ? "مدير المشتريات / مسؤول التسويق" : "Directeur des Achats / Gérant"}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "رقم الهاتف المباشر *" : "Numéro de Téléphone *"}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+213 550 12 34 56"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "البريد الإلكتروني المهني" : "Email Professionnel"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@entreprise.dz"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "الولاية" : "Wilaya"}
                </label>
                <select
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="Oran">Oran (31)</option>
                  <option value="Alger">Alger (16)</option>
                  <option value="Constantine">Constantine (25)</option>
                  <option value="Sétif">Sétif (19)</option>
                  <option value="Annaba">Annaba (23)</option>
                  <option value="Autre">58 Wilayas (Toute l'Algérie)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "حجم السحب والمطبوعات الشهري التقديري" : "Volume d'Impression Mensuel Estimé"}
                </label>
                <select
                  value={monthlyVolume}
                  onChange={(e) => setMonthlyVolume(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="< 50000 DA">&lt; 50,000 DA</option>
                  <option value="50000 - 150000 DA">50,000 - 150,000 DA</option>
                  <option value="150000 - 500000 DA">150,000 - 500,000 DA</option>
                  <option value="> 500000 DA">&gt; 500,000 DA (Grands Comptes)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                {isRtl ? "ملاحظات أو احتياجات طباعية خاصة (اختياري)" : "Besoins spécifiques (Optionnel)"}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRtl ? "مثال: طباعة أكياس تغليف، بطاقات موظفين، وفواتير متعددة النسخ" : "Ex: Packaging, packaging alimentaire, badges PVC, flyers..."}
                className="w-full px-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Send size={15} />
              {isSubmitting
                ? (isRtl ? "جاري تسجيل الطلب..." : "Enregistrement...")
                : (isRtl ? "إرسال طلب الانضمام والاعتماد المسبق" : "Soumettre la Demande d'Accès Prioritaire")}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
