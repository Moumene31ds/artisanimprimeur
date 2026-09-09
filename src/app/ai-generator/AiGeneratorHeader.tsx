"use client";

import { useAppStore } from "@/lib/store";
import { normalizeLanguage } from "@/lib/translations";

export default function AiGeneratorHeader() {
  const { language } = useAppStore();
  const isRtl = normalizeLanguage(language) === "ar";

  return (
    <header className={`text-center space-y-3 max-w-2xl mx-auto ${isRtl ? "dir-rtl" : ""}`}>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider">
        {isRtl ? "FLUX.1 · Pollinations.ai · مجاني 100%" : "FLUX.1 · Pollinations.ai · 100% Gratuit"}
      </span>
      <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
        {isRtl ? "مولّد الصور بالذكاء الاصطناعي" : "Générateur d'Images IA"}
      </h1>
      <p className={`text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed ${isRtl ? "text-right" : ""}`}>
        {isRtl
          ? "صِف تصميمك (بطاقة زيارة، منشور، ملصق، شعار…) ودَع ذكاء FLUX.1 الاصطناعي يخلقه في ثوانٍ. بدون تسجيل، بدون دفع."
          : "Décrivez votre design (carte de visite, flyer, affiche, logo…) et laissez l'intelligence artificielle FLUX.1 le créer en quelques secondes. Aucune inscription, aucun paiement."}
      </p>
    </header>
  );
}
