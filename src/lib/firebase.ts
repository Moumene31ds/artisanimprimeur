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

export { app, auth, db };
