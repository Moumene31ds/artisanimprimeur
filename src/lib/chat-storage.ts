// src/lib/chat-storage.ts
// مشاركة بيانات الشات بين مكوّن الشات وصفحة الإعدادات: مفتاح التخزين،
// أحداث الفتح/المسح، وقراءة/تصدير سجل المحادثة.

export const CHAT_STORAGE_KEY = "lartisan_chat_history";
export const OPEN_CHAT_EVENT = "lartisan:open-chat";
export const CHAT_CLEARED_EVENT = "lartisan:chat-cleared";

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

/** قراءة سجل المحادثة المحفوظ محلياً مع حجمه بالبايت. */
export function getChatHistory(): ChatHistoryInfo {
  if (typeof window === "undefined") return { messages: [], bytes: 0 };
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return { messages: [], bytes: 0 };
    const parsed = JSON.parse(raw);
    return { messages: Array.isArray(parsed) ? parsed : [], bytes: raw.length * 2 };
  } catch {
    return { messages: [], bytes: 0 };
  }
}

/** مسح سجل المحادثة بالكامل مع إعلام الشات. */
export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_STORAGE_KEY);
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
