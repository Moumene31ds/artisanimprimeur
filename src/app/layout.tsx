import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

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

import PWAPrompt from "@/components/PWAPrompt";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import SettingsManager from "@/components/SettingsManager";

const cairo = Cairo({ 
  subsets: ["latin", "arabic"], 
  variable: "--font-main",
  display: "swap",
  weight: ['300', '400', '500', '600', '700', '800', '900']
});

export const metadata: Metadata = {
  metadataBase: new URL('https://artisanimprimeur.vercel.app'),
  title: {
    default: "L'Artisan Imprimeur | المطبعة الاحترافية في الجزائر",
    template: "%s | L'Artisan Imprimeur"
  },
  description: "L'Artisan Imprimeur : Votre partenaire premium pour l'impression et le design en Algérie. Cartes de visite, flyers, et solutions publicitaires. تواصل معنا: +213549179000",
  keywords: ["Printing Algeria", "Impression Algérie", "طباعة الجزائر", "Cartes de visite", "Flyers"],
  manifest: "/manifest.json",
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
  applicationName: "L'Artisan Imprimeur",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#0f172a",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${cairo.variable} font-sans`} suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-accent selection:text-white transition-colors duration-300 min-h-dvh overflow-x-hidden relative">
        
        {/* تم إضافة will-change-transform و transform-gpu لتحسين أداء الرندرة */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.015] dark:opacity-[0.025] will-change-transform transform-gpu" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

        <Providers>
          <MaintenanceGuard>
            
            <SettingsManager />
            <PWAPrompt />
            <AnnouncementBar /> 
            
            <OfflineDetector />
            <ScrollProgress />
            <LiveSales />
            <Navbar />
            
            <main className="min-h-dvh max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(6rem+env(safe-area-inset-top))] pb-28 md:pb-12 relative z-10">
              {children}
            </main>
            
            <QuickSupport /> 
            <AntigravityChat />
            <WhatsAppButton />
            <StickyCartBar />
            <BottomNav />
            
          </MaintenanceGuard>
        </Providers>

        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="decor-blob absolute top-[5%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-700/10 rounded-full blur-[120px] animate-blob"></div>
          <div className="decor-blob absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-700/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="decor-blob absolute top-[40%] right-[15%] w-[30%] h-[30%] bg-cyan-500/5 dark:bg-indigo-600/10 rounded-full blur-[140px] animate-blob animation-delay-1000"></div>
        </div>

        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
