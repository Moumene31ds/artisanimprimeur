import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import StickyCartBar from "@/components/StickyCartBar";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Providers } from "@/components/Providers";
import { ScrollProgress } from "@/components/ScrollProgress";
import OfflineDetector from "@/components/OfflineDetector"; 
import AntigravityChat from "@/components/AntigravityChat";

import LiveSales from "@/components/LiveSales";
import QuickSupport from "@/components/QuickSupport";
import AnnouncementBar from "@/components/AnnouncementBar"; 
import MaintenanceGuard from "@/components/MaintenanceGuard"; 
import FlashSaleBanner from "@/components/FlashSaleBanner";
import WelcomeOfferPopup from "@/components/WelcomeOfferPopup";

import PWAPrompt from "@/components/PWAPrompt";
import CartReminder from "@/components/CartReminder";
import ScrollToTop from "@/components/ScrollToTop";
import MobileUXEnhancer from "@/components/MobileUXEnhancer";

import SettingsManager from "@/components/SettingsManager";

const cairo = Cairo({ 
  subsets: ["latin", "arabic"], 
  variable: "--font-main",
  display: "swap",
  weight: ['300', '400', '500', '600', '700', '800', '900']
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "L'Artisan Imprimeur | المطبعة الاحترافية في الجزائر",
    template: "%s | L'Artisan Imprimeur"
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Printing Algeria",
    "Impression Algérie",
    "طباعة الجزائر",
    "Cartes de visite",
    "Flyers",
    "imprimerie en ligne",
    "طباعة احترافية",
    "design graphique",
    "printshop Oran",
    "impression numérique",
    "أوراق عمل وهران",
  ],
  creator: "L'Artisan Imprimeur",
  publisher: "L'Artisan Imprimeur",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  category: "business",
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fr-FR": SITE_URL,
      "ar-DZ": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    alternateLocale: "ar_DZ",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "L'Artisan Imprimeur | المطبعة الاحترافية في الجزائر",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "L'Artisan Imprimeur — Plateforme d'impression premium en Algérie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Artisan Imprimeur | المطبعة الاحترافية في الجزائر",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "L'Artisan Imprimeur",
  },
  applicationName: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#0f172a",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
  colorScheme: "light dark",
  // Android Chrome: المحتوى يُعاد قياسه عند ظهور الكيبورد بدلاً من التمرير فوقه
  // (يتكامل مع useKeyboard/MobileUXEnhancer لتجربة إدخال سليمة على الهاتف).
  interactiveWidget: "resizes-content",
};

/**
 * شاشات إقلاع iOS — تُعرض لحظة فتح التطبيق المثبّت من الشاشة الرئيسية
 * قبل جاهزية الـ WebView (تجربة إقلاع أصلية بلا وميض أبيض).
 * تُولَّد الملفات عبر: node scripts/generate-ios-splash.mjs
 */
const IOS_SPLASHES: { w: number; h: number; media: string }[] = [
  {
    w: 1290, h: 2796,
    media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    w: 1284, h: 2778,
    media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    w: 1242, h: 2688,
    media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    w: 1179, h: 2556,
    media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    w: 1170, h: 2532,
    media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    w: 1125, h: 2436,
    media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
  },
  {
    w: 750, h: 1334,
    media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    w: 2048, h: 2732,
    media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    w: 1668, h: 2388,
    media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
  },
  {
    w: 1668, h: 2224,
    media: "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)",
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // اللغة الافتراضية للمتجر عربية → lang="ar" dir="rtl" (يحدّثها SettingsManager حسب تفضيل المستخدم)
    <html lang="ar" dir="rtl" className={`${cairo.variable} font-sans`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* شاشات إقلاع iOS — لكل جهاز صورة بمقاسه الدقيق */}
        {IOS_SPLASHES.map(({ w, h, media }) => (
          <link
            key={`${w}x${h}`}
            rel="apple-touch-startup-image"
            media={media}
            href={`/splash/apple-splash-${w}x${h}.png`}
          />
        ))}
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-accent selection:text-white transition-colors duration-300 min-h-dvh overflow-x-hidden relative">
        
        {/* تم إضافة will-change-transform و transform-gpu لتحسين أداء الرندرة */}
        <div className="noise-overlay fixed inset-0 z-0 pointer-events-none opacity-[0.015] dark:opacity-[0.025] will-change-transform transform-gpu" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

        <Providers>
          <MaintenanceGuard>

            {/* رابط تخطي التنقل لقارئات الشاشة ولوحة المفاتيح */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100000] focus:px-5 focus:py-2.5 focus:rounded-xl focus:bg-slate-900 focus:text-white focus:text-sm focus:font-black focus:shadow-2xl"
            >
              {`تخطي إلى المحتوى — Aller au contenu`}
            </a>

            <SettingsManager />
            <MobileUXEnhancer />
            <PWAPrompt />
            <CartReminder />
            <AnnouncementBar />
            <FlashSaleBanner />
            
            <OfflineDetector />
            <ScrollProgress />
            <LiveSales />
            <Navbar />
            
            <main id="main-content" className="min-h-dvh max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(6rem+env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-12 relative z-10">
              {children}
            </main>
            
            <QuickSupport /> 
            <AntigravityChat />
            <WhatsAppButton />
            <StickyCartBar />
            <ScrollToTop />
            <BottomNav />
            <WelcomeOfferPopup />
            
          </MaintenanceGuard>
        </Providers>

        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="decor-blob absolute top-[5%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-700/10 rounded-full blur-[120px] animate-blob"></div>
          <div className="decor-blob absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-700/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="decor-blob absolute top-[40%] right-[15%] w-[30%] h-[30%] bg-cyan-500/5 dark:bg-indigo-600/10 rounded-full blur-[140px] animate-blob animation-delay-1000"></div>
        </div>

        {/* التتبع مجاني 100%: GA4 (Measurement Protocol) + Meta CAPI — انظر src/lib/tracking.ts */}

      </body>
    </html>
  );
}
