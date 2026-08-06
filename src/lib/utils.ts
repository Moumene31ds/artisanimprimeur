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

let notifAudioCtx: AudioContext | null = null;

/**
 * تشغيل صوت إشعار قصير (نغمة ثنائية) عبر Web Audio API — بدون ملفات صوتية.
 * لا يحتاج أذونات ويُستخدم عند وصول إشعار جديد أو تحديث حالة طلب.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!notifAudioCtx) notifAudioCtx = new Ctx();
    const ctx = notifAudioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, dur = 0.18, gainVal = 0.12) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };
    playTone(880, now);
    playTone(1174.66, now + 0.15);
  } catch {
    /* الصوت غير مدعوم — تجاهل */
  }
}
