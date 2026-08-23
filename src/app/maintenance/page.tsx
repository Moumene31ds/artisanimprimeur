"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { useAppStore } from "@/lib/store";

export default function MaintenancePage() {
  const language = useAppStore((state) => state.language);
  const [uiConfig, setUiConfig] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const isRtl = language === "ar";

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ui"), (docSnap) => {
      if (docSnap.exists()) {
        setUiConfig(docSnap.data());
      }
      setLoadingSettings(false);
    });
    return () => unsub();
  }, []);

  if (loadingSettings) {
    return (
      <div className="min-h-dvh w-full bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-xs text-indigo-400 font-bold tracking-widest uppercase">
            {isRtl ? "جاري التحميل..." : "Chargement..."}
          </span>
        </div>
      </div>
    );
  }

  return <MaintenanceScreen uiConfig={uiConfig} />;
}
