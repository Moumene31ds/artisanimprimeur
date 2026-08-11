import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Imprimerie en Ligne — Qualité Premium & Retrait à Oran",
  description:
    "Qualité premium CMYK, papier de luxe 350g, service rapide 24/48h et retrait à l'atelier d'Oran. Réimpression gratuite en cas de défaut. / جودة عالية وسرعة وتسليم من وهران.",
  alternates: {
    canonical: `${SITE_URL}/landing`,
    languages: { fr: `${SITE_URL}/landing`, ar: `${SITE_URL}/landing` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/landing`,
    siteName: SITE_NAME,
    title: "Imprimerie en Ligne — Qualité Premium",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Qualité Premium" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Imprimerie en Ligne — Qualité Premium",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
