import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Bat Scanner — Scanner de Fichiers d'Impression",
  description:
    "Scanner et analyse intelligente de vos fichiers d'impression avec contrôle automatique par IA avant envoi. / فحص ذكي لملفات الطباعة والتحكم الآلي بالجودة.",
  alternates: {
    canonical: `${SITE_URL}/bat-scanner`,
    languages: { fr: `${SITE_URL}/bat-scanner`, ar: `${SITE_URL}/bat-scanner` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/bat-scanner`,
    siteName: SITE_NAME,
    title: "Bat Scanner — Contrôle IA des Fichiers",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Bat Scanner" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bat Scanner",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function BatScannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
