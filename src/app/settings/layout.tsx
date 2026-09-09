import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Paramètres du compte",
  description:
    "Gérez vos paramètres : langue, notifications, confidentialité, verrouillage de l'application et plus encore. / إعدادات الحساب والتطبيق.",
  alternates: {
    canonical: `${SITE_URL}/settings`,
    languages: { fr: `${SITE_URL}/settings`, ar: `${SITE_URL}/settings` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/settings`,
    siteName: SITE_NAME,
    title: "Paramètres",
  },
  twitter: { card: "summary", title: "Paramètres" },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
