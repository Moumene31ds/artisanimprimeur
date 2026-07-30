// src/lib/utils.ts

/**
 * دالة لتشغيل اهتزازات خفيفة (Haptic Feedback) في الأجهزة التي تدعمها.
 * لتعزيز تجربة المستخدم عند التفاعل مع الأزرار.
 * @param type نوع الاهتزاز ('light', 'medium', 'heavy')
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    if (type === 'light') {
      navigator.vibrate(50); // اهتزاز خفيف (50 مللي ثانية)
    } else if (type === 'medium') {
      navigator.vibrate(100); // اهتزاز متوسط
    } else if (type === 'heavy') {
      navigator.vibrate(200); // اهتزاز قوي
    }
  }
}

/**
 * دالة لوضع تأخير (Delay) غير مانع (Non-blocking)
 * @param ms عدد المللي ثانية للتأخير
 */
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * دالة للتحقق من أن العنوان (URL) الخارجي آمن.
 * @param url العنوان المراد فحصه
 * @returns boolean
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // السماح فقط بالبروتوكولات الآمنة (https)
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    return false;
  }
}
