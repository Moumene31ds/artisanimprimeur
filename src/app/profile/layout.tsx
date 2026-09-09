import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mon Profil & Programme de Parrainage",
  description:
    "Gérez votre compte, vos points de fidélité et votre programme de parrainage chez L'Artisan Imprimeur. / إدارة حسابك ونقاط الولاء وبرنامج الإحالة.",
  alternates: {
    canonical: `${SITE_URL}/profile`,
    languages: { fr: `${SITE_URL}/profile`, ar: `${SITE_URL}/profile` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/profile`,
    siteName: SITE_NAME,
    title: "Mon Profil",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — Profil" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mon Profil",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
