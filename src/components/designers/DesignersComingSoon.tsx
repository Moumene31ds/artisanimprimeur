"use client";

import React, { useState } from "react";
import { 
  Palette, Sparkles, Coins, Upload, Star, CheckCircle2, 
  Users, MessageSquare, ArrowRight, Lock, Send, 
  HandCoins, DollarSign, Award, ShieldCheck
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { triggerHapticFeedback } from "@/lib/utils";

interface DesignersComingSoonProps {
  isRtl?: boolean;
  isAdmin?: boolean;
  onPreviewFullMarketplace?: () => void;
}

export default function DesignersComingSoon({
  isRtl = true,
  isAdmin = false,
  onPreviewFullMarketplace,
}: DesignersComingSoonProps) {
  // Form states
  const [designerName, setDesignerName] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [specialty, setSpecialty] = useState("cartes");
  const [wilaya, setWilaya] = useState("Oran");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerName.trim() || !phone.trim() || !portfolioUrl.trim()) {
      toast.error(isRtl ? "يرجى كتابة اسم المصمم، رابط الأعمال، ورقم الهاتف" : "Veuillez renseigner le nom, portfolio et téléphone");
      return;
    }

    setIsSubmitting(true);
    try {
      triggerHapticFeedback("medium");
    } catch {}

    try {
      await addDoc(collection(db, "designer_leads"), {
        designerName: designerName.trim(),
        portfolioUrl: portfolioUrl.trim(),
        specialty,
        wilaya,
        phone: phone.trim(),
        email: email.trim(),
        bio: bio.trim(),
        status: "pending", // pending, approved, contacted, rejected
        createdAt: serverTimestamp(),
      });

      setIsSubmitted(true);
      toast.success(
        isRtl 
          ? "تم تسجيل طلب انضمامك إلى مجتمع المصممين بنجاح! سنتواصل معك لتفعيل حسابك المالي." 
          : "Candidature enregistrée avec succès ! Nous vous contacterons pour l'activation créateur."
      );
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "حدث خطأ، يرجى المحاولة لاحقاً" : "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    isRtl
      ? "مرحباً، أنا مصمم جرافيك وأرغب بالانضمام المسبق لسوق المصممين وبيع قوالبي على منصة L'Artisan Imprimeur."
      : "Bonjour, je suis designer graphique et je souhaite rejoindre en avant-première la Marketplace Créateurs L'Artisan Imprimeur."
  );

  return (
    <div className={`max-w-6xl mx-auto pb-24 px-4 ${isRtl ? "text-right" : "text-left"}`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Admin Preview Mode Notice */}
      {isAdmin && onPreviewFullMarketplace && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
              {isRtl 
                ? "وضع المشرف: سوق المصممين في حالة (قريباً) للزوار. يمكنك معاينة السوق التشغيلي الآن:" 
                : "Mode Admin : La Marketplace est en mode (Bientôt) pour les visiteurs. Aperçu opérationnel :"}
            </p>
          </div>
          <button
            onClick={onPreviewFullMarketplace}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            {isRtl ? "معاينة سوق المصممين الكامل" : "Aperçu Marketplace Complète"}
          </button>
        </div>
      )}

      {/* Hero Teaser */}
      <div className="relative overflow-hidden premium-glass rounded-[2.5rem] p-6 sm:p-12 border border-white/60 dark:border-white/10 shadow-2xl mb-12 text-center mt-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-amber-500/15 blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black uppercase tracking-wider mb-5">
          <Palette size={15} />
          {isRtl ? "سوق المصممين المستقلين • قريباً جداً" : "Marketplace Designers • Bientôt"}
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 max-w-3xl mx-auto leading-tight tracking-tight">
          {isRtl ? "منصة بيع القوالب الإبداعية وتحقيق دخل سلبي مستمر" : "Monétisez votre Créativité Graphique à Grande Échelle"}
        </h1>

        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
          {isRtl
            ? "نُجهز لإطلاق أول سوق جزائري مخصص لمصممي الهويات البصرية والتغليف: انشر تصاميمك، واترك لنا الطباعة الفاخرة والتوصيل لـ 58 ولاية، واقبض عمولتك مباشرة عبر بريدي موب مع كل طلب يُطبع."
            : "Rejoignez la première place de marché dédiée aux créateurs de packaging et d'identité visuelle : publiez vos maquettes, nous imprimons et livrons, vous touchez vos royalties BaridiMob."}
        </p>

        {/* Feature Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
          {[
            {
              icon: <Coins size={20} className="text-amber-400" />,
              title: isRtl ? "أرباح مستمرة (Royalties)" : "Redevances Automatiques",
              sub: isRtl ? "عمولة مع كل طلب طباعة" : "Gains sur chaque impression"
            },
            {
              icon: <HandCoins size={20} className="text-emerald-400" />,
              title: isRtl ? "تحويلات بريدي موب سريعة" : "Paiements BaridiMob",
              sub: isRtl ? "سحب فوري لأرباحك" : "Virements directs sans délai"
            },
            {
              icon: <ShieldCheck size={20} className="text-blue-400" />,
              title: isRtl ? "حماية حقوق التصميم" : "Protection des Droits",
              sub: isRtl ? "حفظ الملكية الفكرية" : "Licence commerciale encadrée"
            },
            {
              icon: <Users size={20} className="text-purple-400" />,
              title: isRtl ? "آلاف العملاء النشطين" : "Audience Nationale",
              sub: isRtl ? "عرض أعمالك لـ 58 ولاية" : "Visibilité sur 58 wilayas"
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

        {/* WhatsApp Direct Creator Hotline */}
        <a
          href={`https://wa.me/213549179000?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <MessageSquare size={16} />
          {isRtl ? "تواصل مع منسق مجتمع المصممين عبر واتساب" : "Rejoindre le Club Créateurs WhatsApp"}
        </a>
      </div>

      {/* Creator Early Access Application Form */}
      <div className="max-w-2xl mx-auto ios-glass rounded-[2.5rem] p-6 sm:p-10 border border-white/60 dark:border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Award size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {isRtl ? "تسجيل مسبق في برنامج المصممين الشركاء" : "Candidature Créateur Fondateur"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isRtl 
              ? "كن من أول 50 مصمماً معتمداً للحصول على نسبة عمولة استثنائية وبادج موثق."
              : "Rejoignez la cohorte fondatrice pour bénéficier d'un taux de commission préférentiel."}
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isRtl ? "مرحباً بك في نادي المصممين الشركاء!" : "Bienvenue parmi les Créateurs !"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {isRtl 
                ? "تم تسجيل ملفك بنجاح. سنراجع معرض أعمالك ونرسل لك دليل رفع القوالب وحساب العمولات عبر واتساب."
                : "Votre portfolio est en cours d'examen. Nous vous contacterons rapidement avec le guide d'intégration."}
            </p>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-xs font-black text-amber-600 dark:text-amber-400 underline pt-2 cursor-pointer"
            >
              {isRtl ? "تعديل البيانات أو تسجيل حساب آخر" : "Soumettre un autre profil"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "اسم المصمم أو الاستوديو *" : "Nom du Designer ou Studio *"}
                </label>
                <input
                  type="text"
                  required
                  value={designerName}
                  onChange={(e) => setDesignerName(e.target.value)}
                  placeholder={isRtl ? "مثال: أمين ديزاين / استوديو الإبداع" : "Ex: Amine K. Graphic Design"}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "رابط معرض الأعمال (Behance, Dribbble, IG) *" : "Lien Portfolio (Behance, Instagram) *"}
                </label>
                <input
                  type="url"
                  required
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://behance.net/username"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "رقم الهاتف (واتساب) *" : "Téléphone (WhatsApp) *"}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+213 550 12 34 56"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "البريد الإلكتروني" : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="designer@gmail.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? "التخصص الرئيسي" : "Spécialité Principale"}
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="cartes">{isRtl ? "بطاقات أعمال وهويات فاخرة" : "Cartes de Visite & Branding"}</option>
                  <option value="packaging">{isRtl ? "تغليف وعلب منتجات (Packaging)" : "Packaging & Boîtes"}</option>
                  <option value="restauration">{isRtl ? "قوائم مطاعم وكافيهات (Menus)" : "Menus & Restauration"}</option>
                  <option value="evenements">{isRtl ? "دعوات وبطاقات مناسبات" : "Faire-part & Événements"}</option>
                  <option value="corporate">{isRtl ? "مطبوعات شركات وملفات B2B" : "Dossiers & Papeterie Pro"}</option>
                </select>
              </div>

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
                  <option value="Tlemcen">Tlemcen (13)</option>
                  <option value="Autre">58 Wilayas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1">
                {isRtl ? "نبذة مختصرة عن أسلوبك التصميمي (اختياري)" : "Style graphique / Logiciels maîtrisés"}
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={isRtl ? "مثال: خبرة 5 سنوات في تصميم علامات الفخامة، استخدام Illustrator و InDesign..." : "Ex: Maîtrise Illustrator, dorure à chaud, style minimaliste..."}
                className="w-full px-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Send size={15} />
              {isSubmitting
                ? (isRtl ? "جاري الإرسال..." : "Envoi en cours...")
                : (isRtl ? "إرسال طلب الانضمام لسوق المصممين" : "Soumettre ma Candidature")}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
