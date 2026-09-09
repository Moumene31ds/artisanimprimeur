import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mes favoris",
  description:
    "Retrouvez vos produits d'impression favoris : cartes de visite, flyers, stickers et affiches. / منتجات الطباعة المفضلة لديك.",
  alternates: {
    canonical: `${SITE_URL}/favorites`,
    languages: { fr: `${SITE_URL}/favorites`, ar: `${SITE_URL}/favorites` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/favorites`,
    siteName: SITE_NAME,
    title: "Mes favoris",
  },
  twitter: { card: "summary", title: "Mes favoris" },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
