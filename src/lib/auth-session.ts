// src/lib/auth-session.ts
// جلسة مستخدم خفيفة على مستوى المتصفح (خارج React) يشاركها الشات والإعدادات
// وأي وحدة تحتاج معرفة "من هو المستخدم الحالي" دون الاشتراك في AuthContext.
// - يحافظ على نسخة واحدة من مستمع onAuthStateChanged.
// - يفرّق بين الحساب الحقيقي (uid) والضيف (guest) — لكل منهما محادثة مستقلة.

import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface ChatUser {
  uid: string;
  /** معرّف الحساب في المحادثة: "uid" للحسابات، و"guest" للضيوف. */
  key: string;
  displayName: string | null;
  email: string | null;
  isGuest: boolean;
}

let currentUser: ChatUser | null = null;
let initialized = false;
const listeners = new Set<(user: ChatUser | null) => void>();

function toChatUser(u: User | null): ChatUser | null {
  if (!u) return null;
  const anonymous = u.isAnonymous;
  return {
    uid: u.uid,
    key: anonymous ? "guest" : u.uid,
    displayName: u.displayName,
    email: u.email,
    isGuest: anonymous,
  };
}

/** تهيئة الجلسة (تُستدعى تلقائياً عند أول استهلاك). */
function ensureInit(): void {
  if (initialized) return;
  initialized = true;
  auth.onAuthStateChanged((u) => {
    const next = toChatUser(u);
    const changed =
      next?.key !== currentUser?.key || next?.uid !== currentUser?.uid;
    currentUser = next;
    if (changed) listeners.forEach((cb) => cb(next));
  });
}

/** المستخدم الحالي (أو null للزائر غير المسجّل). */
export function getChatUser(): ChatUser | null {
  ensureInit();
  return currentUser;
}

/** مفتاح التخزين الموحّد لمحادثة هذا المستخدم (يستعمله الشات والإعدادات). */
export function getChatUserKey(): string {
  return getChatUser()?.key ?? "guest";
}

/** الاشتراك في تغيّر هوية المستخدم (تسجيل دخول/خروج/تبديل حساب). */
export function onUserChange(cb: (user: ChatUser | null) => void): () => void {
  ensureInit();
  listeners.add(cb);
  // نبثّ القيمة الحالية فوراً (حتى لو بلا تغيير) ليعالج المستهلك الحالة الأولية.
  if (currentUser) cb(currentUser);
  return () => listeners.delete(cb);
}
