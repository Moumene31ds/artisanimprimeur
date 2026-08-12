import type { Metadata } from "next";
import FluxImageGenerator from "@/components/FluxImageGenerator";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Générateur d'Images IA Gratuit — FLUX.1 | L'Artisan Imprimeur",
  description:
    "Générez des designs d'impression avec l'IA FLUX.1 (Pollinations.ai) : cartes de visite, flyers, affiches, logos. 100% gratuit, sans inscription, téléchargement direct.",
  alternates: {
    canonical: `${SITE_URL}/ai-generator`,
    languages: { fr: `${SITE_URL}/ai-generator`, ar: `${SITE_URL}/ai-generator` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/ai-generator`,
    siteName: SITE_NAME,
    title: "Générateur d'Images IA — FLUX.1",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "Générateur d'images IA FLUX.1" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Générateur d'Images IA — FLUX.1",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function AiGeneratorPage() {
  return (
    <div className="min-h-screen pb-24 pt-10 max-w-5xl mx-auto px-4 space-y-8">
      <header className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-black uppercase tracking-wider">
          FLUX.1 · Pollinations.ai · 100% Gratuit
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
          Générateur d&apos;Images IA
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
          Décrivez votre design (carte de visite, flyer, affiche, logo…) et laissez
          l&apos;intelligence artificielle FLUX.1 le créer en quelques secondes.
          Aucune inscription, aucun paiement.
        </p>
      </header>

      <FluxImageGenerator />
    </div>
  );
}
