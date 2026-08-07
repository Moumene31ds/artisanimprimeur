"use client";
// src/components/LockManager.tsx
// ---------------------------------------------------------------------------
// مدير قفل التطبيق: يقرر القفل عند الإقلاع، يراقب مهلة الإهمال، يقفل عند
// إخفاء التطبيق (وضع الخلفية)، يفعّل غشاوة الخصوصية، ويقفل عند تسجيل الشاشة
// على iOS. يُركَّب مرة واحدة في Providers.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useAppLock, syncPrivacyProtection } from "@/lib/applock";
import { AppLockScreen, PrivacyGuard } from "@/components/AppLockUI";
import { isNative } from "@/lib/native";

export default function LockManager() {
  const isLocked = useAppLock((s) => s.isLocked);
  const pinSet = useAppLock((s) => s.pinSet);
  const mode = useAppLock((s) => s.mode);
  const timeoutMinutes = useAppLock((s) => s.timeoutMinutes);
  const privacyEnabled = useAppLock((s) => s.privacyEnabled);
  const [privacyActive, setPrivacyActive] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    useAppLock.getState().init();

    if (isNative()) {
      import("@capacitor-community/privacy-screen")
        .then(({ PrivacyScreen }) => {
          PrivacyScreen.addListener("screenRecordingStarted", () => {
            useAppLock.getState().lock();
          }).catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  // مهلة الإهمال (وضع timeout) — يقفل تلقائياً بعد الخمول.
  useEffect(() => {
    if (mode !== "timeout" || !pinSet) return;
    const id = setInterval(() => {
      const s = useAppLock.getState();
      if (Date.now() - s.lastActivity > s.timeoutMinutes * 60_000) s.lock();
    }, 3000);
    return () => clearInterval(id);
  }, [mode, pinSet, timeoutMinutes]);

  // تتبّع النشاط — أي تفاعل يحدّث آخر نشاط (لحساب مهلة الإهمال).
  useEffect(() => {
    const onActivity = () => useAppLock.getState().touch();
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  // القفل عند إخفاء التطبيق (وضع الخلفية) + غشاوة الخصوصية + قفل عند العودة
  // بعد غياب أطول من المهلة (وضع timeout).
  useEffect(() => {
    const onVis = () => {
      const s = useAppLock.getState();
      if (document.hidden) {
        hiddenAt.current = Date.now();
        if (s.mode === "background" && s.pinSet) s.lock();
        if (s.privacyEnabled) setPrivacyActive(true);
      } else {
        if (hiddenAt.current !== null) {
          const elapsed = Date.now() - hiddenAt.current;
          if (s.mode === "timeout" && s.pinSet && elapsed > s.timeoutMinutes * 60_000) s.lock();
          hiddenAt.current = null;
        }
        setPrivacyActive(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onVis);
    };
  }, []);

  // مزامنة حماية الخصوصية الأصلية (FLAG_SECURE / iOS) مع الإعداد.
  useEffect(() => {
    syncPrivacyProtection(privacyEnabled);
  }, [privacyEnabled]);

  return (
    <>
      {isLocked && <AppLockScreen />}
      <PrivacyGuard active={privacyActive} />
    </>
  );
}
