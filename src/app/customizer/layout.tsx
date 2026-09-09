import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Personnalisateur de Produits — Cartes, Flyers & Plus",
  description:
    "Personnalisez vos cartes de visite, flyers, stickers et affiches en ligne avec les polices arabes, vos logos et aperçu en Réalité Augmentée. / صمّم منتجاتك مباشرة بالخطوط العربية.",
  alternates: {
    canonical: `${SITE_URL}/customizer`,
    languages: { fr: `${SITE_URL}/customizer`, ar: `${SITE_URL}/customizer` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/customizer`,
    siteName: SITE_NAME,
    title: "Personnalisateur de Produits",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Personnalisateur" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personnalisateur de Produits",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function CustomizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
