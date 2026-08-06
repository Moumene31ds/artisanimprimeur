"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext"; // استيراد AuthProvider
import SyncManager from "@/components/SyncManager";
import PWALifecycle from "@/components/PWALifecycle";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // 1. AuthProvider يجب أن يلف التطبيق دائماً وفي كل الحالات
    <AuthProvider>
      {/* SyncManager لإدارة مزامنة سلة التسوق والمفضلة مع قاعدة البيانات */}
      <SyncManager />

      {/* 2. ThemeProvider لإدارة الوضع الليلي */}
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
        
        {/* 4. محتوى التطبيق (Navbar, Pages, Chatbot...) */}
        {children}
      </ThemeProvider>

      {/* دورة حياة PWA: تسجيل السيرفس ووركر + تحديثات + حالة الاتصال */}
      <PWALifecycle />
    </AuthProvider>
  );
}
