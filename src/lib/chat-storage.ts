// src/lib/chat-storage.ts
// مشاركة بيانات الشات بين مكوّن الشات وصفحة الإعدادات: مفاتيح التخزين،
// أحداث الفتح/المسح، وقراءة/تصدير سجل المحادثة.
//
// منذ v6.9.3 أصبحت المحادثة **خاصة بكل حساب**: كل مستخدم مسجّل يملك محادثة
// مستقلة (مفتاح `lartisan_chat_history_<uid>`)، والزائر/الضيف له مفتاح عام
// مشترك. عند تسجيل الدخول يجد المستخدم محادثته القديمة سليمة دون اختلاطها
// بمحادثات الآخرين.

import { getChatUserKey } from "@/lib/auth-session";

/** مفتاح محادثة الضيف/الزوار (متوافق مع الإصدارات السابقة). */
export const CHAT_STORAGE_KEY = "lartisan_chat_history";

export const OPEN_CHAT_EVENT = "lartisan:open-chat";
export const CHAT_CLEARED_EVENT = "lartisan:chat-cleared";

/**
 * مفتاح التخزين الموحّد لمحادثة معيّنة.
 * - بدون `userKey`: مفتاح المستخدم الحالي (من الجلسة).
 * - `userKey="guest"` أو أي زائر غير مسجّل → المفتاح العام القديم.
 */
export function buildChatStorageKey(userKey?: string): string {
  const key = userKey || getChatUserKey();
  if (!key || key === "guest") return CHAT_STORAGE_KEY;
  return `${CHAT_STORAGE_KEY}_${key}`;
}

/** فتح الشات من أي مكان (صفحة الإعدادات...). */
export function dispatchOpenChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}

/** إعلام الشات بأن سجله مُسح خارجياً ليعيد تعيين الحالة فوراً. */
export function dispatchChatCleared(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_CLEARED_EVENT));
}

export interface StoredChatMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "data" | "function" | "tool";
  content?: string;
  parts?: any[];
  createdAt?: string | number | Date;
}

export interface ChatHistoryInfo {
  messages: StoredChatMessage[];
  bytes: number;
}

/**
 * قراءة سجل محادثة المستخدم الحالي (أو `userKey` صريح) مع حجمه بالبايت.
 */
export function getChatHistory(userKey?: string): ChatHistoryInfo {
  if (typeof window === "undefined") return { messages: [], bytes: 0 };
  try {
    const raw = localStorage.getItem(buildChatStorageKey(userKey));
    if (!raw) return { messages: [], bytes: 0 };
    const parsed = JSON.parse(raw);
    return { messages: Array.isArray(parsed) ? parsed : [], bytes: raw.length * 2 };
  } catch {
    return { messages: [], bytes: 0 };
  }
}

/**
 * حفظ سجل محادثة المستخدم الحالي (أو `userKey` صريح) محلياً.
 */
export function saveChatHistory(messages: StoredChatMessage[], userKey?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(buildChatStorageKey(userKey), JSON.stringify(messages));
  } catch {
    /* ignore (ممتلئ التخزين أو وضع خاص) */
  }
}

/**
 * مسح سجل محادثة المستخدم الحالي (أو `userKey` صريح) بالكامل مع إعلام الشات.
 */
export function clearChatHistory(userKey?: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(buildChatStorageKey(userKey));
  dispatchChatCleared();
}

/** تحويل سجل المحادثة إلى نص قابل للنسخ/التصدير (بدون بادئات السياق). */
export function buildChatExportText(messages: StoredChatMessage[], lang: "ar" | "fr"): string {
  const isRtl = lang === "ar";
  const lines: string[] = [];
  messages.forEach((m) => {
    const text = (m.content || "")
      .replace(/\[Context:.*?\]\.?\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return;
    const role = m.role === "assistant" ? (isRtl ? "المساعد" : "Assistant") : isRtl ? "أنت" : "Vous";
    let time = "";
    if (m.createdAt) {
      const d = new Date(m.createdAt);
      if (!isNaN(d.getTime())) time = " · " + d.toLocaleString();
    }
    lines.push(`[${role}${time}]`);
    lines.push(text);
    lines.push("");
  });
  return lines.join("\n").trim();
}
