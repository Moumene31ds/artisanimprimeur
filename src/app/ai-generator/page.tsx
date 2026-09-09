import type { Metadata } from "next";
import FluxImageGenerator from "@/components/FluxImageGenerator";
import AiGeneratorHeader from "./AiGeneratorHeader";
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
      <AiGeneratorHeader />
      <FluxImageGenerator />
    </div>
  );
}
