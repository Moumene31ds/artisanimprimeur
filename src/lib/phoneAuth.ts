// src/lib/phoneAuth.ts
// الوظائف الأساسية لتسجيل الدخول برقم الهاتف عبر Firebase Phone Auth

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ApplicationVerifier,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth, RECAPTCHA_CONTAINER_ID } from "./firebaseConfig";

export {
  isValidPhone,
  getAuthErrorMessage,
  maskPhone,
  formatPhoneInput,
  secondsToTime,
  type Language,
} from "./phone-auth-utils";

/** التحقق الأمني المُفعّل في المشروع (من وثيقة settings/ui — نفس إعدادات السلة) */
export type CaptchaConfig = {
  mode: "disabled" | "slider" | "recaptcha" | "recaptcha_v3";
  siteKey: string;
};

/**
 * وضع الاختبار: يُفعّل reCAPTCHA الوهمي ويتيح إتمام تدفق OTP بالكامل
 * بدون إرسال SMS فعلي — أضف رقمك كرقم تجريبي في Firebase Console
 * (Authentication → Phone → Phone numbers for testing) واستخدم رمز الاختبار الذي حددته.
 */
export function configureAuthTestMode(enabled: boolean): void {
  auth.settings.appVerificationDisabledForTesting = enabled;
}

/**
 * Verifier مخصص يستخدم رمز reCAPTCHA الذي حصلنا عليه من مكوّن
 * SecurityVerification (نفس reCAPTCHA المستخدمة في السلة/صفحة الدفع).
 * يعتمد Firebase هذا النوع ويمرر الرمز إلى Google للتحقق.
 *
 * ملاحظة: يتطلب SDK الداخلي من الـ verifier توفير `_reset` — وإلا يرمي
 * `TypeError: verifier?._reset is not a function` بعد كل إرسال رمز.
 * لا يوجد widget حقيقي هنا لذا `_reset` فارغة.
 */
export function createTokenVerifier(
  token: string
): ApplicationVerifier & { _reset(): void } {
  return {
    type: "recaptcha",
    verify: () => Promise.resolve(token),
    _reset: () => {
      // لا حاجة: الرمز يُدار خارجيًا عبر SecurityVerification وليس هناك widget حقيقي
    },
  };
}

// يتتبع آخر verifier لتحريره (clear) قبل إنشاء جديد — يمنع تسرّب عناصر reCAPTCHA
let currentVerifier: RecaptchaVerifier | null = null;

/** تحرير الـ verifier السابق وتنظيف حاوية reCAPTCHA قبل إعادة الإرسال. */
export function resetRecaptcha(containerId: string = RECAPTCHA_CONTAINER_ID): void {
  if (currentVerifier) {
    try {
      currentVerifier.clear();
    } catch {
      // تجاهل: قد يكون مدمرًا بالفعل
    }
    currentVerifier = null;
  }
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = "";
}

/**
 * إرسال رمز التحقق إلى رقم الهاتف.
 * - إذا مُرر `appVerifier` (مثل رمز reCAPTCHA من السلة) يُستخدم مباشرة.
 * - وإلا يُستخدم reCAPTCHA غير المرئي الافتراضي من Firebase.
 * يجب أن يكون عنصر الحاوية موجودًا في الـ DOM قبل الاستدعاء.
 *
 * ملاحظة: رسالة "Failed to initialize reCAPTCHA Enterprise config. Triggering
 * the reCAPTCHA v2 verification." في وحدة التحكم طبيعية وتظهر عندما لا يكون
 * reCAPTCHA Enterprise مفعّلًا على مشروع Firebase — يتحول Firebase تلقائيًا
 * إلى reCAPTCHA v2 غير المرئي ويكمل العمل بشكل طبيعي.
 */
export async function sendOTP(
  phoneNumber: string,
  appVerifier?: ApplicationVerifier,
  containerId: string = RECAPTCHA_CONTAINER_ID
): Promise<ConfirmationResult> {
  // عند توفير verifier خارجي (رمز من السلة) نستخدمه مباشرة
  if (appVerifier) {
    return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  }

  // تنظيف أي verifier/حاوية سابقة قبل إنشاء واحد جديد
  resetRecaptcha(containerId);

  const container = document.getElementById(containerId);
  if (!container) {
    const err = new Error(
      `reCAPTCHA container "#${containerId}" not found in the DOM`
    ) as Error & { code: string };
    err.code = "auth/missing-recaptcha-token";
    throw err;
  }

  currentVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // يتم التنفيذ تلقائيًا عند نجاح التحقق من reCAPTCHA
    },
  });

  return signInWithPhoneNumber(auth, phoneNumber, currentVerifier);
}

/**
 * التحقق من رمز الـ OTP وإرجاع المستخدم عند النجاح.
 * يحمي من استدعاء verify بدون نتيجة إرسال سابقة.
 */
export async function verifyOTP(
  confirmationResult: ConfirmationResult | null,
  code: string
): Promise<User> {
  if (!confirmationResult) {
    const err = new Error("No confirmation result") as Error & { code: string };
    err.code = "auth/invalid-verification-id";
    throw err;
  }
  const result = await confirmationResult.confirm(code);
  return result.user;
}

/**
 * WebOTP API — التقاط الرمز تلقائيًا من الرسائل النصية فور وصولها.
 * تتطلب HTTPS + متصفح حديث. تعيد دالة إلغاء (abort).
 */
export function listenForWebOTP(
  onCode: (code: string) => void,
  timeoutMs = 60000
): () => void {
  if (typeof window === "undefined" || !("OTPCredential" in window)) {
    return () => {};
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  (navigator as any).credentials
    .get({
      otp: { transport: ["sms"] },
      signal: controller.signal,
    })
    .then((otp: any) => {
      if (otp?.code) onCode(otp.code);
    })
    .catch((err: any) => {
      if (err?.name !== "AbortError") {
        console.warn("[WebOTP]", err);
      }
    });

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort();
  };
}
