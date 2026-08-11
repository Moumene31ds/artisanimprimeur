import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Facture",
  description:
    "Facture de votre commande d'impression chez L'Artisan Imprimeur. / فاتورة طلب الطباعة الخاص بك.",
  alternates: {
    canonical: `${SITE_URL}/invoice`,
    languages: { fr: `${SITE_URL}/invoice`, ar: `${SITE_URL}/invoice` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/invoice`,
    siteName: SITE_NAME,
    title: "Facture",
  },
  twitter: { card: "summary", title: "Facture" },
};

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
