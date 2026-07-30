export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const score =
    Number(hasLength) +
    Number(hasUpper) +
    Number(hasLower) +
    Number(hasNumber) +
    Number(hasSymbol);
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateSignupForm({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  if (!name.trim()) return { ok: false, message: 'name' };
  if (!validateEmail(email)) return { ok: false, message: 'email' };
  if (getPasswordStrength(password) === 'weak') return { ok: false, message: 'password' };
  return { ok: true, message: '' };
}

/**
 * Returns a user-friendly bilingual (FR/AR) error message for Firebase Auth error codes.
 * Includes all common codes + Google/popup-specific codes.
 */
export function getAuthErrorMessage(errorCode: string, isRtl = false): string {
  const messages: Record<string, { fr: string; ar: string }> = {
    'auth/invalid-credential': {
      fr: 'Identifiants incorrects. Vérifiez votre email et mot de passe.',
      ar: 'بيانات الاعتماد غير صحيحة. تحقق من البريد الإلكتروني وكلمة المرور.',
    },
    'auth/user-not-found': {
      fr: 'Aucun compte trouvé avec cet email.',
      ar: 'لا يوجد حساب بهذا البريد الإلكتروني.',
    },
    'auth/wrong-password': {
      fr: 'Mot de passe incorrect.',
      ar: 'كلمة المرور غير صحيحة.',
    },
    'auth/email-already-in-use': {
      fr: 'Cette adresse email est déjà utilisée par un autre compte.',
      ar: 'هذا البريد الإلكتروني مستخدم بالفعل.',
    },
    'auth/weak-password': {
      fr: 'Mot de passe trop faible. Utilisez au moins 8 caractères avec chiffres et symboles.',
      ar: 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع أرقام ورموز.',
    },
    'auth/network-request-failed': {
      fr: 'Problème de connexion réseau. Vérifiez votre connexion internet.',
      ar: 'مشكلة في الاتصال بالإنترنت. تحقق من اتصالك.',
    },
    'auth/too-many-requests': {
      fr: 'Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.',
      ar: 'محاولات كثيرة جداً. انتظر بضع دقائق قبل المحاولة مجدداً.',
    },
    'auth/user-disabled': {
      fr: 'Ce compte a été désactivé. Contactez le support.',
      ar: 'هذا الحساب معطّل. تواصل مع الدعم الفني.',
    },
    // Google / Social login errors
    'auth/popup-closed-by-user': {
      fr: 'La fenêtre de connexion a été fermée. Veuillez réessayer.',
      ar: 'تم إغلاق نافذة تسجيل الدخول. حاول مرة أخرى.',
    },
    'auth/popup-blocked': {
      fr: 'Le navigateur a bloqué la fenêtre. Autorisez les popups ou utilisez la connexion par email.',
      ar: 'المتصفح حجب النافذة المنبثقة. اسمح بها أو استخدم تسجيل الدخول بالبريد الإلكتروني.',
    },
    'auth/cancelled-popup-request': {
      fr: 'Demande de connexion annulée.',
      ar: 'تم إلغاء طلب تسجيل الدخول.',
    },
    'auth/unauthorized-domain': {
      fr: 'Ce domaine n\'est pas autorisé. Ajoutez "localhost" dans Firebase Console > Authentication > Authorized Domains.',
      ar: 'هذا النطاق غير مصرح به. أضف "localhost" في Firebase Console > Authentication > Authorized Domains.',
    },
    'auth/account-exists-with-different-credential': {
      fr: 'Un compte existe déjà avec cet email via une autre méthode de connexion.',
      ar: 'يوجد حساب بهذا البريد الإلكتروني عبر طريقة تسجيل دخول أخرى.',
    },
    'auth/operation-not-allowed': {
      fr: 'Cette méthode de connexion n\'est pas activée dans Firebase Console.',
      ar: 'طريقة تسجيل الدخول هذه غير مفعّلة في Firebase Console.',
    },
    'auth/invalid-email': {
      fr: 'Adresse email invalide.',
      ar: 'عنوان البريد الإلكتروني غير صالح.',
    },
  };

  const entry = messages[errorCode];
  if (entry) {
    return isRtl ? entry.ar : entry.fr;
  }

  return isRtl
    ? 'حدث خطأ غير متوقع. حاول مرة أخرى.'
    : 'Une erreur inattendue est survenue. Veuillez réessayer.';
}
