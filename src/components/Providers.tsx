"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext"; // استيراد AuthProvider
import SyncManager from "@/components/SyncManager";
import PWALifecycle from "@/components/PWALifecycle";
import NativeBootstrap from "@/components/NativeBootstrap";
import { MotionConfig } from "framer-motion";
import { useAppStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  // تعطيل حركات Framer Motion بالكامل عند إيقاف الحركات من الإعدادات
  const animationsEnabled = useAppStore((s) => s.animationsEnabled);
  const performanceMode = useAppStore((s) => s.performanceMode);

  return (
    // 1. AuthProvider يجب أن يلف التطبيق دائماً وفي كل الحالات
    <AuthProvider>
      {/* SyncManager لإدارة مزامنة سلة التسوق والمفضلة مع قاعدة البيانات */}
      <SyncManager />

      {/* 2. ThemeProvider لإدارة الوضع الليلي */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        {/* 3. إعدادات الإشعارات */}
        <Toaster 
          position="top-center" 
          richColors 
          toastOptions={{
            className: 'premium-glass border border-white/40 dark:border-slate-700',
            style: {
              background: 'var(--glass-bg)',
              color: 'var(--color-text)',
              backdropFilter: 'blur(16px)',
            }
          }}
        />
        
        {/* 4. محتوى التطبيق (Navbar, Pages, Chatbot...) مع التحكم في الحركات */}
        <MotionConfig reducedMotion={!animationsEnabled || performanceMode ? "always" : "never"}>
          {children}
        </MotionConfig>
      </ThemeProvider>

      {/* دورة حياة PWA: تسجيل السيرفس ووركر + تحديثات + حالة الاتصال */}
      <PWALifecycle />

      {/* إقلاع التطبيق الأصلي (أندرويد/iOS): شاشة البداية، الإشعارات، قفل البصمة */}
      <NativeBootstrap />
    </AuthProvider>
  );
}
