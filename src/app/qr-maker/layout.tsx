import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "QR Code Maker — Générer des QR Codes Personnalisés",
  description:
    "Générateur de QR codes personnalisés pour menus, cartes de visite et flyers. Qualité d'impression HD. / مولّد رموز QR مخصصة لمطبوعة بجودة عالية.",
  alternates: {
    canonical: `${SITE_URL}/qr-maker`,
    languages: { fr: `${SITE_URL}/qr-maker`, ar: `${SITE_URL}/qr-maker` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/qr-maker`,
    siteName: SITE_NAME,
    title: "QR Code Maker",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — QR Code Maker" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Maker",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function QrMakerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
