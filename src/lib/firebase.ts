// src/lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { config } from "@/config"; // <-- استيراد الإعدادات

// تهيئة Firebase باستخدام الإعدادات من ملف config
const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
  measurementId: config.firebase.measurementId,
};

// بدون مفاتيح صالحة لا يُهيَّأ Firebase حتى لا ينكسر `next build`
// (عند النشر على Vercel تكون المفاتيح موجودة فيعمل كل شيء طبيعياً).
const configured = Boolean(config.firebase.apiKey && config.firebase.projectId);

const app: FirebaseApp = configured
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp()
  : (undefined as unknown as FirebaseApp);

const auth: Auth = configured ? getAuth(app) : (undefined as unknown as Auth);
const db: Firestore = configured ? getFirestore(app) : (undefined as unknown as Firestore);

// ---------------------------------------------------------------------------
// Firebase App Check — معيار حماية الخدمات من الروبوتات والاستخدام المسيء.
// يُفعَّل تلقائياً فقط عند ضبط NEXT_PUBLIC_RECAPTCHA_SITE_KEY في البيئة
// (reCAPTCHA v3 مجاني)؛ بدون المفتاح يعمل التطبيق كالمعتاد دون أي أثر.
// ملاحظة: يجب أيضاً تسجيل نطاق reCAPTCHA في وحدة Firebase Console → App Check.
// ---------------------------------------------------------------------------
if (
  configured &&
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
) {
  import("firebase/app-check")
    .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      if (!getApps().length) return;
      // debugToken في التطوير فقط لتفادي رفض الطلبات المحلية.
      if (process.env.NODE_ENV !== "production") {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
          process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN || true;
      }
      try {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string;
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (e) {
        console.warn("[app-check] init skipped:", (e as Error)?.message ?? e);
      }
    })
    .catch(() => {});
}

export { app, auth, db };
