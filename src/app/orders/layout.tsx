import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mes Commandes — Suivi en Temps Réel",
  description:
    "Suivez l'état de vos commandes d'impression en temps réel : en production, prête, récupérée. / تتبع حالة طلبات الطباعة الخاصة بك.",
  alternates: {
    canonical: `${SITE_URL}/orders`,
    languages: { fr: `${SITE_URL}/orders`, ar: `${SITE_URL}/orders` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/orders`,
    siteName: SITE_NAME,
    title: "Mes Commandes",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Commandes" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mes Commandes",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
