// src/lib/firebaseConfig.ts
// التهيئة المركزية لتطبيق Firebase — أضف مفاتيحك في ملف .env.local

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { config } from "@/config";

export const firebaseConfig = {
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

// إعادة استخدام التطبيق إن سبق تهيئته (يمنع الخطأ الشهير "already initialized")
export const app: FirebaseApp = configured
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp()
  : (undefined as unknown as FirebaseApp);

export const auth: Auth = configured ? getAuth(app) : (undefined as unknown as Auth);

// عنصر حاوية reCAPTCHA الخفي المستخدم في كل إرسال رمز
export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";
