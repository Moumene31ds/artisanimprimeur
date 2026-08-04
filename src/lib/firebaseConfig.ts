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

// إعادة استخدام التطبيق إن سبق تهيئته (يمنع الخطأ الشهير "already initialized")
export const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth: Auth = getAuth(app);

// عنصر حاوية reCAPTCHA الخفي المستخدم في كل إرسال رمز
export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";
