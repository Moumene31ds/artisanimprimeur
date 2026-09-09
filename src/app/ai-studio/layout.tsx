import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Studio — تصميم بالذكاء الاصطناعي",
  description:
    "استوديو ذكاء اصطناعي لإنشاء بطاقات العمل، قوائم الطعام، الملصقات والفلير الإعلاني بجودة احترافية في ثوانٍ. / Studio IA pour créer cartes de visite, menus, étiquettes et flyers.",
  alternates: {
    canonical: `${SITE_URL}/ai-studio`,
    languages: { fr: `${SITE_URL}/ai-studio`, ar: `${SITE_URL}/ai-studio` },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: `${SITE_URL}/ai-studio`,
    siteName: SITE_NAME,
    title: "AI Studio — تصميم بالذكاء الاصطناعي",
    description: SITE_DESCRIPTION,
    images: [
      { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "L'Artisan Imprimeur — AI Studio" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Studio — تصميم بالذكاء الاصطناعي",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function AiStudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
