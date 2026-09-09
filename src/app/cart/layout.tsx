import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Panier — Vos Commandes d'Impression",
  description:
    "Consultez et gérez votre panier : cartes de visite, flyers, stickers et affiches. Paiement sécurisé et retrait à l'atelier d'Oran. / سلة مشترياتك للطباعة.",
  alternates: {
    canonical: `${SITE_URL}/cart`,
    languages: { fr: `${SITE_URL}/cart`, ar: `${SITE_URL}/cart` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/cart`,
    siteName: SITE_NAME,
    title: "Panier",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Panier" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panier",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
