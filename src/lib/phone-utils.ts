// src/lib/phone-utils.ts
// أدوات التحقق من أرقام الهواتف الجزائرية وتوحيد صيغتها للرسائل الدولية.

const DZ_PHONE_REGEX = /^(0)(5|6|7)[0-9]{8}$/;

/** التحقق من أن الرقم هاتف جزائري صحيح يبدأ بـ 05/06/07 ويتكون من 10 أرقام */
export function isValidDzPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s.\-()]/g, "");
  return DZ_PHONE_REGEX.test(cleaned);
}

/**
 * توحيد صيغة الرقم إلى الصيغة الدولية للواتساب (213…).
 * يقبل: 0550…، +213550…، 00213550…، 213550…
 */
export function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  cleaned = cleaned.replace(/^00/, "");
  if (cleaned.startsWith("0")) {
    cleaned = "213" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

/** إرجاع الرقم بالصيغة المحلية (0550…) إن أمكن، أو الأصل كما هو */
export function toLocalDzPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.startsWith("213") && cleaned.length === 12) {
    return "0" + cleaned.slice(3);
  }
  return phone;
}
