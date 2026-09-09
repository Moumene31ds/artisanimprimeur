import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description:
    "Réinitialisez votre mot de passe L'Artisan Imprimeur par e-mail ou SMS. / استعادة كلمة المرور الخاصة بحسابك.",
  alternates: {
    canonical: `${SITE_URL}/forgot-password`,
    languages: { fr: `${SITE_URL}/forgot-password`, ar: `${SITE_URL}/forgot-password` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/forgot-password`,
    siteName: SITE_NAME,
    title: "Mot de passe oublié",
  },
  twitter: { card: "summary", title: "Mot de passe oublié" },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
