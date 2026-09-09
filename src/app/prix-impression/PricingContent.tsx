"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { normalizeLanguage } from "@/lib/translations";
import type { CatalogProduct } from "@/lib/catalog";

interface PricingContentProps {
  products: CatalogProduct[];
}

export default function PricingContent({ products }: PricingContentProps) {
  const { language } = useAppStore();
  const isRtl = normalizeLanguage(language) === "ar";

  const priceFaqs = isRtl
    ? [
        {
          q: "كم تكلفة طباعة بطاقات الزيارة في الجزائر؟",
          a: "في L'Artisan Imprimeur، تبدأ بطاقات الزيارة البريميوم من 2500 دج. ينخفض السعر مع الكميات بفضل تسعيرنا التنازلي الشفاف.",
        },
        {
          q: "ما هو سعر المناشير الدعائية؟",
          a: "تبدأ المناشير الدعائية من 4500 دج. نقبل ملفات PDF و PNG و JPEG بدقة 300 DPI بنظام CMYK لجودة طباعة عالية.",
        },
        {
          q: "هل تشمل الأسعار التصميم؟",
          a: "التصميم الأساسي مجاني عبر AI Studio. يمكنك أيضاً رفع ملفك القابل للطباعة (PDF، PNG، JPEG).",
        },
        {
          q: "كيف أحصل على عرض سعر لكمية كبيرة؟",
          a: "اتصل بنا على ‎+213 549 17 90 00 أو اطلب عبر الإنترنت: يُطبق التسعير التنازلي تلقائياً حسب الكميات.",
        },
      ]
    : [
        {
          q: "Combien coûte l'impression de cartes de visite en Algérie ?",
          a: "Chez L'Artisan Imprimeur, les cartes de visite premium commencent à 2500 DA. Le prix baisse avec les quantités grâce à notre tarification dégressive transparente.",
        },
        {
          q: "Quel est le prix des flyers publicitaires ?",
          a: "Les flyers publicitaires démarrent à 4500 DA. Nous acceptons les fichiers PDF, PNG et JPEG en 300 DPI CMYK pour un rendu haute définition.",
        },
        {
          q: "Les prix incluent-ils le design ?",
          a: "Le design de base est gratuit via notre AI Studio. Vous pouvez aussi téléverser votre propre fichier imprimable (PDF, PNG, JPEG).",
        },
        {
          q: "Comment obtenir un devis pour une grande quantité ?",
          a: "Contactez-nous au +213 549 17 90 00 ou passez commande en ligne : la tarification dégressive s'applique automatiquement selon les quantités.",
        },
      ];

  const sorted = [...products].sort((a, b) => Number(a.price) - Number(b.price));

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 space-y-16 mt-8">
      <header className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider">
          {isRtl ? "أسعار 2026 — الجزائر" : "Tarifs 2026 — Algérie"}
        </span>
        <h1 className={`text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight ${isRtl ? "text-right md:text-center" : ""}`}>
          {isRtl ? "أسعار الطباعة في الجزائر" : "Prix d'Impression en Algérie"}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
          {isRtl
            ? "أسعار شفافة لبطاقات الزيارة والمناشير والستيكرات والملصقات ودعوات الأعراس. التسعير التنازلي يخفض سعر الوحدة من أول الكميات. عرض سعر مجاني عبر الإنترنت، فحص آلي للملفات بالذكاء الاصطناعي والاستلام من ورشة وهران."
            : "Tarifs transparents pour vos cartes de visite, flyers, stickers, affiches et invitations. La tarification dégressive réduit le prix unitaire dès les premières quantités. Devis en ligne gratuit, contrôle IA des fichiers et retrait à l'atelier d'Oran."}
        </p>
      </header>

      <section className="space-y-6">
        <h2 className={`text-2xl md:text-3xl font-black text-slate-900 dark:text-white text-center`}>
          {isRtl ? "أسعار الطباعة لدينا" : "Nos tarifs d'impression"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((p) => (
            <div
              key={p.id}
              className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/10 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-black text-slate-800 dark:text-white text-lg">{p.name}</h3>
                <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2 py-1 rounded-full shrink-0">
                  {p.category}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {Number(p.price).toLocaleString("fr-DZ")}
                </span>
                <span className="text-sm font-black text-slate-500 dark:text-slate-400">DA</span>
              </div>
              <Link
                href={`/services?item=${p.id}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-accent text-white rounded-2xl text-sm font-black hover:opacity-90 transition-opacity"
              >
                {isRtl ? "اطلب الآن — عرض سعر مجاني" : "Commander — devis gratuit"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white text-center">
          {isRtl ? "كيف تحصل على أفضل سعر؟" : "Comment obtenir le meilleur prix ?"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/10 space-y-2">
            <h3 className="font-black text-accent text-sm uppercase tracking-wider">{isRtl ? "1 · الكميات" : "1 · Quantités"}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {isRtl
                ? "كلما زادت كميتك، انخفض سعر الوحدة. يُطبق التسعير التنازلي تلقائياً."
                : "Plus vous commandez, plus le prix unitaire baisse. La tarification dégressive s'applique automatiquement."}
            </p>
          </div>
          <div className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/10 space-y-2">
            <h3 className="font-black text-accent text-sm uppercase tracking-wider">{isRtl ? "2 · المقاسات" : "2 · Formats"}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {isRtl
                ? "اطبع رقمياً أو أوفست حسب احتياجاتك: المقاس، وزن الورق (حتى 350غ) والتشطيبات."
                : "Imprimez en numérique ou offset selon vos besoins : format, grammage (jusqu'à 350g) et finitions."}
            </p>
          </div>
          <div className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/10 space-y-2">
            <h3 className="font-black text-accent text-sm uppercase tracking-wider">{isRtl ? "3 · تصميم مجاني" : "3 · Design gratuit"}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              {isRtl
                ? "ينشئ AI Studio تصميمك مجاناً، أو ارفع ملفك الجاهز للطباعة (PDF/PNG/JPEG)."
                : "Notre AI Studio génère votre design gratuitement, ou téléversez votre fichier prêt à imprimer (PDF/PNG/JPEG)."}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white text-center">
          {isRtl ? "الأسئلة الشائعة حول الأسعار" : "Questions fréquentes sur les prix"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {priceFaqs.map((faq, i) => (
            <div key={i} className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/10 space-y-2">
              <h3 className="font-black text-slate-800 dark:text-white text-base">{faq.q}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white text-center">
          {isRtl ? "خدمات الطباعة متوفرة في كل ولايات الوطن" : "Impression disponible dans toute l'Algérie"}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "alger", "oran", "constantine", "annaba", "tlemcen",
            "setif", "blida", "batna", "bejaia", "chlef",
          ].map((city) => (
            <Link
              key={city}
              href={`/services/printing/${city}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-spotlight text-xs font-black text-slate-700 dark:text-slate-300 hover:text-accent hover:scale-105 transition-all"
            >
              {isRtl
                ? `طباعة ${cityArNames[city] || city}`
                : `Impression ${city.charAt(0).toUpperCase() + city.slice(1)}`}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const cityArNames: Record<string, string> = {
  alger: "الجزائر",
  oran: "وهران",
  constantine: "قسنطينة",
  annaba: "عنابة",
  tlemcen: "تلمسان",
  setif: "سطيف",
  blida: "البليدة",
  batna: "باتنة",
  bejaia: "بجاية",
  chlef: "الشلف",
};
