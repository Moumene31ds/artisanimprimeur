// src/app/login/phone/page.tsx
// صفحة تسجيل الدخول برقم الهاتف (Firebase Phone Auth + WebOTP)
"use client";

import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import { useEffect, useState } from "react";
import { PhoneAuth } from "@/components/PhoneAuth";
import { useAppStore } from "@/lib/store";
import { normalizeLanguage } from "@/lib/translations";
import { db } from "@/lib/firebase";
import type { CaptchaConfig } from "@/lib/phoneAuth";

export default function PhoneLoginPage() {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const isRtl = normalizeLanguage(language) === "ar";
  const [captchaConfig, setCaptchaConfig] = useState<CaptchaConfig | undefined>();

  // تحميل نفس إعدادات الحماية المستخدمة في السلة (settings/ui)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "ui"));
        if (!cancelled && snap.exists()) {
          const data = snap.data();
          const mode =
            data.captchaMode === "recaptcha" || data.captchaMode === "recaptcha_v3"
              ? data.captchaMode
              : "disabled";
          setCaptchaConfig({ mode, siteKey: data.recaptchaSiteKey || "" });
        }
      } catch (err) {
        console.error("Error loading captcha settings:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuccess = async (user: FirebaseUser) => {
    try {
      // إنشاء سجل المستخدم في Firestore إن لم يكن موجودًا
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(
          userRef,
          {
            phone: user.phoneNumber ?? "",
            displayName: user.phoneNumber ?? "Phone User",
            authMethod: "phone",
            points: 0,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // تحديث رقم الهاتف إن تغيّر
        if (user.phoneNumber && snap.data().phone !== user.phoneNumber) {
          await setDoc(userRef, { phone: user.phoneNumber }, { merge: true });
        }
      }

      // تسجيل حدث أمني
      await addDoc(collection(db, "securityLogs"), {
        event: "login_success",
        phone: user.phoneNumber ?? "phone-user",
        timestamp: serverTimestamp(),
        type: "phone",
        status: "success",
        ip: "client-logged",
      });
    } catch (err) {
      console.error("Phone login side-effect error:", err);
    }

    router.push("/");
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="relative min-h-dvh">
      {/* شريط علوي: رجوع + تبديل اللغة */}
      <div className="relative z-20 flex items-center justify-between max-w-md mx-auto px-4 pt-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} className={isRtl ? "rotate-180" : ""} />
          {isRtl ? "تسجيل الدخول بالبريد" : "Connexion par email"}
        </Link>
        <button
          onClick={() => setLanguage(language === "ar" ? "fr" : "ar")}
          className="px-4 py-2 bg-slate-200/60 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          {language === "ar" ? "Français" : "العربية"}
        </button>
      </div>

      {/* مكوّن تسجيل الدخول برقم الهاتف */}
      <PhoneAuth
        language={language === "fr" ? "fr" : "ar"}
        onSuccess={handleSuccess}
        captchaConfig={captchaConfig}
      />

      {/* رابط المساعدة */}
      <div className="relative z-20 -mt-24 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <UserIcon size={14} />
          {isRtl
            ? "لم تحصل على الرمز؟ تأكد من إدخال رقمك بالصيغة الدولية (+213...)"
            : "Code non reçu ? Assurez-vous du format international (+213...)"}
        </p>
      </div>
    </div>
  );
}
