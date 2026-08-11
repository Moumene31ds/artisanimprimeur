import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à votre compte L'Artisan Imprimeur pour suivre vos commandes, gérer vos favoris et profiter du programme de fidélité. / تسجيل الدخول إلى حسابك.",
  alternates: {
    canonical: `${SITE_URL}/login`,
    languages: { fr: `${SITE_URL}/login`, ar: `${SITE_URL}/login` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/login`,
    siteName: SITE_NAME,
    title: "Connexion — L'Artisan Imprimeur",
  },
  twitter: { card: "summary", title: "Connexion — L'Artisan Imprimeur" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
