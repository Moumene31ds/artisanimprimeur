import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Vérification du paiement",
  description:
    "Vérification du reçu de paiement de votre commande d'impression. / التحقق من إيصال دفع طلبك.",
  alternates: {
    canonical: `${SITE_URL}/payment-verify`,
    languages: { fr: `${SITE_URL}/payment-verify`, ar: `${SITE_URL}/payment-verify` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/payment-verify`,
    siteName: SITE_NAME,
    title: "Vérification du paiement",
  },
  twitter: { card: "summary", title: "Vérification du paiement" },
};

export default function PaymentVerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
