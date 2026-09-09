"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAppStore } from "@/lib/store";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { GlobalLoader } from "./GlobalLoader";
import { toast } from "sonner";

// 1. المكون الداخلي الذي يحتوي على المنطق البرمجي ويستخدم سلة الروابط
function MaintenanceGuardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams(); // الخطير هنا!
  const { isAdmin, loading: authLoading } = useAuth();
  const language = useAppStore((state) => state.language);

  const [uiConfig, setUiConfig] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ui"), (docSnap) => {
      if (docSnap.exists()) {
        setUiConfig(docSnap.data());
      }
      setLoadingSettings(false);
    });
    return () => unsub();
  }, []);

  // تفعيل كود العبور السري بأمان
  useEffect(() => {
    const bypassQuery = searchParams?.get("bypass");
    if (bypassQuery && uiConfig?.maintenanceBypassKey) {
      if (bypassQuery === uiConfig.maintenanceBypassKey) {
        localStorage.setItem("maintenance_bypass_token", bypassQuery);
        toast.success(language === "ar" ? "تم تفعيل كود العبور السري بنجاح" : "Bypass token activated!");
      }
    }
  }, [searchParams, uiConfig, language]);

  if (loadingSettings || authLoading) return <GlobalLoader />;

  const isAdminPage = pathname?.startsWith("/admin");
  const hasBypassToken = typeof window !== "undefined" && localStorage.getItem("maintenance_bypass_token") === uiConfig?.maintenanceBypassKey;

  const isAllowed = !uiConfig?.maintenanceMode || isAdmin || isAdminPage || hasBypassToken;

  if (!isAllowed) return <MaintenanceScreen uiConfig={uiConfig} />;

  return <>{children}</>;
}

// 2. المكون الأساسي المُصدّر والذي يغلّف المنطق بـ Suspense لحماية عملية الـ Build
export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<GlobalLoader />}>
      <MaintenanceGuardContent>{children}</MaintenanceGuardContent>
    </Suspense>
  );
}
