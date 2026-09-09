import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Commande réussie",
  description:
    "Votre commande d'impression a été enregistrée avec succès. Suivez son statut en temps réel. / تم تسجيل طلب الطباعة بنجاح.",
  alternates: {
    canonical: `${SITE_URL}/success`,
    languages: { fr: `${SITE_URL}/success`, ar: `${SITE_URL}/success` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/success`,
    siteName: SITE_NAME,
    title: "Commande réussie",
  },
  twitter: { card: "summary", title: "Commande réussie" },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
