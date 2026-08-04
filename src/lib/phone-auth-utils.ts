// src/lib/phone-auth-utils.ts
// دوال خالصة (بدون Firebase) خاصة بمنطق تسجيل الدخول بالهاتف — سهلة الاختبار

export type Language = "ar" | "fr";

/** هل رقم الهاتف بصيغة دولية صحيحة؟ */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.\-()]/g, "");
  return /^\+\d{7,15}$/.test(cleaned);
}

/** تنسيق أرقام الإدخال أثناء الكتابة: 555123456 → 555 12 34 56 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";

  const groups: string[] = [];
  let first = true;
  let i = 0;
  while (i < digits.length) {
    const size = first ? 3 : 2;
    groups.push(digits.slice(i, i + size));
    i += size;
    first = false;
  }
  return groups.join(" ");
}

/** إخفاء معظم أرقام الهاتف مع إبقاء البداية والنهاية ظاهرتين */
export function maskPhone(fullPhone: string): string {
  const digits = fullPhone.replace(/\D/g, "");
  if (digits.length <= 4) return fullPhone;

  const first = digits.slice(0, 3);
  const last = digits.slice(-2);
  const hidden = digits.slice(3, -2).replace(/./g, "•");
  return `+${first}${hidden}${last}`;
}

/** تحويل الثواني إلى صيغة mm:ss */
export function secondsToTime(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** رسائل أخطاء Firebase الأكثر شيوعًا بلغتين */
export function getAuthErrorMessage(error: unknown, language: Language): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : undefined;

  const messages: Record<string, Record<Language, string>> = {
    "auth/invalid-phone-number": {
      ar: "رقم الهاتف غير صحيح. تحقق من الصيغة الدولية (مثال: +213...).",
      fr: "Numéro de téléphone invalide. Vérifiez le format international (+213...).",
    },
    "auth/missing-phone-number": {
      ar: "الرجاء إدخال رقم الهاتف.",
      fr: "Veuillez saisir le numéro de téléphone.",
    },
    "auth/too-many-requests": {
      ar: "طلبات كثيرة جدًا. انتظر قليلًا ثم حاول مجددًا.",
      fr: "Trop de tentatives. Veuillez patienter et réessayer.",
    },
    "auth/quota-exceeded": {
      ar: "تم تجاوز حد الرسائل اليومي. حاول لاحقًا.",
      fr: "Quota de messages dépassé. Réessayez plus tard.",
    },
    "auth/captcha-check-failed": {
      ar: "فشل التحقق الأمني. أعد المحاولة.",
      fr: "La vérification de sécurité a échoué. Réessayez.",
    },
    "auth/code-expired": {
      ar: "انتهت صلاحية الرمز. أرسل رمزًا جديدًا.",
      fr: "Le code a expiré. Renvoyez un nouveau code.",
    },
    "auth/invalid-verification-code": {
      ar: "رمز التحقق غير صحيح. تحقق وأعد المحاولة.",
      fr: "Code de vérification incorrect. Vérifiez et réessayez.",
    },
    "auth/invalid-verification-id": {
      ar: "التحقق غير صالح. أرسل رمزًا جديدًا.",
      fr: "Vérification invalide. Renvoyez un nouveau code.",
    },
    "auth/missing-verification-code": {
      ar: "أدخل رمز التحقق المكون من 6 أرقام.",
      fr: "Saisissez le code de vérification à 6 chiffres.",
    },
    "auth/network-request-failed": {
      ar: "تعذر الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.",
      fr: "Erreur réseau. Vérifiez votre connexion internet.",
    },
    "auth/user-disabled": {
      ar: "هذا الحساب معطّل.",
      fr: "Ce compte est désactivé.",
    },
    "auth/operation-not-allowed": {
      ar: "تسجيل الدخول بالهاتف غير مفعّل في Firebase Console.",
      fr: "La connexion par téléphone n'est pas activée dans Firebase Console.",
    },
    "auth/invalid-app-credential": {
      ar: "تعذر التحقق من التطبيق. حاول مجددًا.",
      fr: "Impossible de vérifier l'application. Réessayez.",
    },
    "auth/missing-recaptcha-token": {
      ar: "رمز الحماية مفقود. أعد المحاولة.",
      fr: "Jeton de sécurité manquant. Réessayez.",
    },
    "auth/invalid-recaptcha-token": {
      ar: "رمز الحماية غير صالح. أعد المحاولة.",
      fr: "Jeton de sécurité invalide. Réessayez.",
    },
    "auth/provider-already-linked": {
      ar: "هذا الرقم مرتبط بحساب آخر.",
      fr: "Ce numéro est déjà lié à un autre compte.",
    },
    "auth/credential-already-in-use": {
      ar: "هذا الرقم مستخدم من قبل حساب آخر.",
      fr: "Ce numéro est déjà utilisé par un autre compte.",
    },
    "auth/session-expired": {
      ar: "انتهت الجلسة. أرسل رمزًا جديدًا.",
      fr: "Session expirée. Renvoyez un nouveau code.",
    },
    "auth/session-cookie-expired": {
      ar: "انتهت صلاحية الجلسة. أعد المحاولة.",
      fr: "Session expirée. Réessayez.",
    },
    "auth/internal-error": {
      ar: "خطأ داخلي من الخادم. أعد المحاولة.",
      fr: "Erreur interne du serveur. Réessayez.",
    },
    "auth/missing-app-credential": {
      ar: "تعذر التحقق من التطبيق (appVerifier ناقص).",
      fr: "Identifiants de l'application manquants (appVerifier).",
    },
    "auth/missing-client-identifier": {
      ar: "تعذر تحديد العميل. أعد المحاولة.",
      fr: "Identifiant client manquant. Réessayez.",
    },
    "auth/unauthorized-domain": {
      ar: "النطاق غير مسموح به في Firebase Console (Authentication → Authorized domains).",
      fr: "Domaine non autorisé dans Firebase Console (Authentication → Authorized domains).",
    },
    "auth/unsupported-environment": {
      ar: "البيئة غير مدعومة. تأكد من تشغيل التطبيق على متصفح حديث عبر HTTPS.",
      fr: "Environnement non pris en charge. Utilisez un navigateur moderne via HTTPS.",
    },
    "auth/app-not-authorized": {
      ar: "هذا التطبيق غير مصرح به في Firebase.",
      fr: "Cette application n'est pas autorisée dans Firebase.",
    },
    "auth/unverified-email": {
      ar: "يرجى تأكيد البريد الإلكتروني أولًا.",
      fr: "Veuillez d'abord vérifier votre e-mail.",
    },
    "auth/expired-action-code": {
      ar: "انتهت صلاحية هذا الإجراء. أعد المحاولة.",
      fr: "Ce code d'action a expiré. Réessayez.",
    },
  };

  if (code && messages[code]) return messages[code][language];

  // كود غير معروف: سجّله في وحدة التحكم وأظهره للمستخدم ليساعد في التشخيص
  if (code) {
    console.error(`[PhoneAuth] Unmapped auth error code: ${code}`, error);
    return language === "ar"
      ? `حدث خطأ غير متوقع (${code}). أعد المحاولة.`
      : `Une erreur inattendue est survenue (${code}). Réessayez.`;
  }

  console.error("[PhoneAuth] Unexpected error without a code", error);
  return language === "ar"
    ? "حدث خطأ غير متوقع. أعد المحاولة."
    : "Une erreur inattendue est survenue. Réessayez.";
}
