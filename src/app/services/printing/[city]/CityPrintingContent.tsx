"use client";

import Link from "next/link";
import { ArrowRight, Printer, MapPin, ShieldCheck, Truck, Clock, Phone } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { normalizeLanguage } from "@/lib/translations";
import type { CatalogProduct } from "@/lib/catalog";

interface CityInfo {
  fr: string;
  ar: string;
}

interface CityPrintingContentProps {
  cityName: CityInfo;
  products: CatalogProduct[];
  otherCities: [string, CityInfo][];
}

export default function CityPrintingContent({ cityName, products, otherCities }: CityPrintingContentProps) {
  const { language } = useAppStore();
  const isRtl = normalizeLanguage(language) === "ar";
  const city = isRtl ? cityName.ar : cityName.fr;

  const faqs = isRtl
    ? [
        {
          q: `أين أستلم مطبوعاتي في ${cityName.ar}؟`,
          a: `يتم استلام طلبات الطباعة في ${cityName.ar} (${cityName.fr}) حالياً من الورشة الرئيسية لـ L'Artisan Imprimeur في وهران، حي عقيد لطفي، مفتوحة من 09ص إلى 18م من الاثنين إلى السبت. التوصيل إلى المنزل في ${cityName.ar} قريباً جداً.`,
        },
        {
          q: `ما هي آجال الطباعة في ${cityName.ar}؟`,
          a: "نضمن خدمة سريعة خلال 24/48 ساعة لمعظم المنتجات (بطاقات الزيارة، المناشير، الملصقات). يخضع كل طلب لفحص آلي للملفات بالذكاء الاصطناعي قبل الطباعة لضمان جودة لا تشوبها شائبة.",
        },
        {
          q: `ما المنتجات التي يمكنني طلبها في ${cityName.ar}؟`,
          a: "بطاقات زيارة بريميوم، مناشير دعائية، ستيكرات مخصصة، ملصقات فاخرة، دعوات وهدايا تذكارية — كل ذلك بطباعة رقمية وأوفست عالية الدقة وتسعير تنازلي شفاف.",
        },
        {
          q: `كيف أدفع طلبي في ${cityName.ar}؟`,
          a: "الدفع عند الاستلام نقداً عند السحب، أو عبر تحويل بريدي موب مع إرسال صورة الوصل للتحقق السريع. التسعير التنازلي يضمن لك أفضل سعر حسب الكميات.",
        },
      ]
    : [
        {
          q: `Où retirer mes impressions à ${cityName.fr} ?`,
          a: `Le retrait de vos commandes d'impression à ${cityName.fr} (${cityName.ar}) se fait actuellement à l'atelier principal de L'Artisan Imprimeur à Oran, cité Akid Lotfi, ouvert de 09h à 18h du lundi au samedi. La livraison à domicile à ${cityName.fr} arrive très bientôt.`,
        },
        {
          q: `Quels délais pour l'impression à ${cityName.fr} ?`,
          a: "Nous assurons un service rapide 24h/48h pour la plupart des supports (cartes de visite, flyers, affiches). Chaque commande passe par un contrôle automatique de fichiers par IA avant impression pour garantir une qualité irréprochable.",
        },
        {
          q: `Quels produits puis-je commander à ${cityName.fr} ?`,
          a: "Cartes de visite premium, flyers publicitaires, stickers personnalisés, affiches de luxe, invitations et goodies — le tout en impression numérique et offset haute définition avec tarification dégressive transparente.",
        },
        {
          q: `Comment payer une commande à ${cityName.fr} ?`,
          a: "Paiement à la réception en espèces lors du retrait, ou par virement BaridiMob avec envoi du reçu pour vérification rapide. La tarification dégressive vous garantit le meilleur prix selon les quantités.",
        },
      ];

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4 space-y-16 mt-8">
      {/* Glassmorphic Localized Hero Banner */}
      <section className="relative overflow-hidden premium-glass p-8 md:p-12 rounded-[3.5rem] border border-white/60 dark:border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/15 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <div className={`flex-1 space-y-6 text-center md:text-left relative z-10 ${isRtl ? "md:text-right" : ""}`}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider">
            <MapPin size={12} />
            {isRtl ? `شريك محلي : ${cityName.ar} / ${cityName.fr}` : `Partenaire Local : ${cityName.fr} / ${cityName.ar}`}
          </span>

          <h1 className={`text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight ${isRtl ? "text-right md:text-right" : ""}`}>
            {isRtl ? (
              <>
                مطبعة إلكترونية <br />
                <span className="text-accent">بريميوم في {cityName.ar}</span>
              </>
            ) : (
              <>
                Imprimerie en ligne <br />
                <span className="text-accent">Premium à {cityName.fr}</span>
              </>
            )}
          </h1>

          <p className={`text-slate-500 dark:text-slate-400 font-bold text-sm max-w-2xl leading-relaxed ${isRtl ? "md:mr-auto" : ""}`}>
            {isRtl
              ? `تخدم L'Artisan Imprimeur مدينة ${cityName.ar} بخدمات طباعة عالية الدقة. استفد من تسعير تنازلي شفاف، وفحص آلي للملفات بالذكاء الاصطناعي، والاستلام من ورشة وهران. التوصيل قريباً.`
              : `L'Artisan Imprimeur dessert ${cityName.fr} avec des services d'impressions de haute précision. Profitez d'une tarification dégressive transparente, d'un contrôle automatique de fichiers par IA et d'un retrait à l'atelier d'Oran. La livraison arrive bientôt.`}
          </p>

          {/* Quick Benefits Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs font-black text-slate-700 dark:text-slate-350">
            <div className={`flex items-center gap-2 justify-center ${isRtl ? "md:justify-end" : "md:justify-start"}`}>
              <ShieldCheck className="text-emerald-500" size={18} />
              <span>{isRtl ? "جودة عالية الدقة" : "Qualité Haute Définition"}</span>
            </div>
            <div className={`flex items-center gap-2 justify-center ${isRtl ? "md:justify-end" : "md:justify-start"}`}>
              <Truck className="text-blue-500" size={18} />
              <span>{isRtl ? "الاستلام من وهران (التوصيل قريباً)" : "Retrait à Oran (Livraison bientôt)"}</span>
            </div>
            <div className={`flex items-center gap-2 justify-center ${isRtl ? "md:justify-end" : "md:justify-start"}`}>
              <Printer className="text-purple-500" size={18} />
              <span>{isRtl ? "طباعة رقمية وأوفست" : "Format Numérique & Offset"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Services Catalog Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? "وسائلنا الإعلانية المتوفرة" : "Nos Supports Publicitaires Disponibles"}
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {isRtl ? "اختر منتجك لبدء الإعداد" : "sélectionnez votre produit pour commencer la configuration"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-20 premium-glass rounded-[2rem] text-slate-400 text-sm font-black">
              {isRtl ? "لا توجد منتجات طباعة مهيأة حالياً." : "Aucun produit d'impression configuré pour le moment."}
            </div>
          ) : (
            products.map((product: CatalogProduct) => (
              <div
                key={product.id}
                className="premium-glass p-5 rounded-[2.5rem] border border-white/60 dark:border-white/10 flex flex-col justify-between hover:shadow-2xl hover:scale-101 transition-all group"
              >
                <div className="space-y-4">
                  {/* Product Image */}
                  <div className="w-full h-48 rounded-3xl bg-slate-100 dark:bg-slate-900 overflow-hidden relative border border-slate-200/40 dark:border-slate-800">
                    <img
                      src={product.image}
                      alt={`${product.name} à ${cityName.fr}`}
                      loading="lazy" decoding="async"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                  </div>
                  {/* Product Info */}
                  <div className={`px-1 ${isRtl ? "text-right" : "text-left"}`}>
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                      {product.category}
                    </span>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg mt-1 truncate">
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold mt-1">
                      {isRtl ? "الاستلام من ورشة وهران — التوصيل قريباً" : "Retrait à l'atelier d'Oran — Livraison bientôt"}
                    </p>
                  </div>
                </div>

                {/* Pricing and Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase">{isRtl ? "ابتداءً من" : "À partir de"}</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {Number(product.price).toLocaleString()} <span className="text-xs">DA</span>
                    </span>
                  </div>

                  <Link
                    href={`/services?item=${product.id}`}
                    className="p-3 bg-slate-900 dark:bg-accent text-white rounded-2xl flex items-center justify-center hover:bg-slate-850 dark:hover:bg-blue-650 transition-colors"
                  >
                    <ArrowRight size={18} className={isRtl ? "rotate-180" : ""} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? `الأسئلة الشائعة — الطباعة في ${cityName.ar}` : `Questions fréquentes — Impression à ${cityName.fr}`}
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {isRtl ? "كل ما تحتاج معرفته قبل الطلب" : "tout ce qu'il faut savoir avant de commander"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="premium-glass p-6 rounded-[2rem] border border-white/60 dark:border-white/10"
            >
              <h3 className="font-black text-slate-800 dark:text-white text-base mb-2">
                {faq.q}
              </h3>
              <p className={`text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed ${isRtl ? "text-right" : ""}`}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Internal Linking Hub */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? "خدمات الطباعة لدينا في كل ولايات الوطن" : "Nos services d'impression dans toute l'Algérie"}
          </h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {isRtl ? "التوصيل والاستلام في المدن الكبرى" : "livraison et retrait dans les grandes villes"}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {otherCities.map(([key, info]) => (
            <Link
              key={key}
              href={`/services/printing/${key}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-spotlight text-xs font-black text-slate-700 dark:text-slate-300 hover:text-accent hover:scale-105 transition-all"
            >
              <MapPin size={12} />
              {info.fr} / {info.ar}
            </Link>
          ))}
        </div>
      </section>

      {/* Local Contact Info */}
      <section className="premium-glass p-8 rounded-[2.5rem] border border-white/60 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
            <Clock size={22} />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-white text-sm">
              {isRtl ? "ساعات عمل الورشة (وهران)" : "Horaires de l'atelier (Oran)"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold" dir="ltr">
              {isRtl ? "الاثنين – السبت · 09:00 – 18:00" : "Lundi – Samedi · 09h00 – 18h00"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Phone size={22} />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-white text-sm">{isRtl ? "المساعدة" : "Assistance"}</p>
            <a
              href="tel:+213549179000"
              className="text-xs text-slate-500 dark:text-slate-400 font-bold hover:text-accent"
            >
              +213 549 17 90 00
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
