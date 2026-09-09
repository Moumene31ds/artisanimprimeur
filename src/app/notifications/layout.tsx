import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Notifications de commandes, promotions et rappels de votre compte L'Artisan Imprimeur. / إشعارات الطلبات والعروض.",
  alternates: {
    canonical: `${SITE_URL}/notifications`,
    languages: { fr: `${SITE_URL}/notifications`, ar: `${SITE_URL}/notifications` },
  },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/notifications`,
    siteName: SITE_NAME,
    title: "Notifications",
  },
  twitter: { card: "summary", title: "Notifications" },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
