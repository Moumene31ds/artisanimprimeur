import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Services d'Impression Professionnelle en Algérie",
  description:
    "Cartes de visite, flyers, stickers, affiches et goodies personnalisés. Qualité premium, tarification transparente et contrôle IA des fichiers — L'Artisan Imprimeur.",
  alternates: {
    canonical: `${SITE_URL}/services`,
    languages: {
      fr: `${SITE_URL}/services`,
      ar: `${SITE_URL}/services`,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/services`,
    siteName: SITE_NAME,
    title: "Services d'Impression Professionnelle en Algérie",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "L'Artisan Imprimeur — Services d'impression",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Services d'Impression Professionnelle en Algérie",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
