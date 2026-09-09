import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Récompenses & Fidélité — Gagnez des Points",
  description:
    "Programme de fidélité : gagnez des points à chaque commande et échangez-les contre des réductions et bons d'achat. / برنامج الولاء: اربح نقاطاً واستبدلها بتخفيضات.",
  alternates: {
    canonical: `${SITE_URL}/rewards`,
    languages: { fr: `${SITE_URL}/rewards`, ar: `${SITE_URL}/rewards` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/rewards`,
    siteName: SITE_NAME,
    title: "Récompenses & Fidélité",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Récompenses" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Récompenses & Fidélité",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
