import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description:
    "Politique de confidentialité de L'Artisan Imprimeur : quelles données nous collectons, comment nous les protégeons et vos droits. / سياسة الخصوصية الخاصة بنا.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
    languages: { fr: `${SITE_URL}/privacy`, ar: `${SITE_URL}/privacy` },
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/privacy`,
    siteName: SITE_NAME,
    title: "Politique de Confidentialité",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary", title: "Politique de Confidentialité" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
