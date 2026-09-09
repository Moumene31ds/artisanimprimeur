import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Showroom 3D — Aperçu de Vos Impressions en Réalité Augmentée",
  description:
    "Aperçu 3D de vos cartes de visite, flyers et goodies en Réalité Augmentée avant impression. / معاينة ثلاثية الأبعاد لمطبوعاتك قبل الطباعة.",
  alternates: {
    canonical: `${SITE_URL}/showroom`,
    languages: { fr: `${SITE_URL}/showroom`, ar: `${SITE_URL}/showroom` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/showroom`,
    siteName: SITE_NAME,
    title: "Showroom 3D — Réalité Augmentée",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Showroom 3D" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Showroom 3D — Réalité Augmentée",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
