// src/lib/applock.ts
// ---------------------------------------------------------------------------
// قفل التطبيق المتقدم — PIN (6 أرقام) + بصمة/وجه + أوضاع القفل + قفل تلقائي +
// مهلة الإهمال + قفل بعد المحاولات الفاشلة + حماية الخصوصية (منع التصوير).
// كل الحالة محفوظة في localStorage وتُدار عبر zustand للتفاعل الحي مع الواجهة.
// ---------------------------------------------------------------------------

import { create } from "zustand";
import {
  isNative,
  getBiometryKind,
  biometricPrompt,
  type BiometryKind,
  type BiometricPromptResult,
} from "./native";

export type LockMode = "off" | "launch" | "background" | "timeout";

export const PIN_LENGTH = 6;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;
export const DEFAULT_TIMEOUT_MINUTES = 1;

const K = {
  pinHash: "applock_pin_hash",
  pinSalt: "applock_pin_salt",
  mode: "applock_mode",
  timeout: "applock_timeout",
  biometric: "applock_biometric",
  privacy: "applock_privacy",
  attempts: "applock_attempts",
  lockoutUntil: "applock_lockout_until",
  lastActivity: "applock_last_activity",
} as const;

function read(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** تشفير PIN بجزء ملح (salt) عشوائي عبر SHA-256 (Web Crypto). */
export async function hashPin(pin: string, salt: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${pin}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    let h = 5381;
    const s = salt + pin;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return "fb_" + h.toString(36);
  }
}

export function randomSalt(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function isLockoutActive(lockoutUntil: number): boolean {
  return lockoutUntil > Date.now();
}

export function lockoutRemaining(lockoutUntil: number): number {
  return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
}

export interface AppLockState {
  ready: boolean;
  isLocked: boolean;
  pinSet: boolean;
  pinHash: string | null;
  pinSalt: string | null;
  mode: LockMode;
  timeoutMinutes: number;
  biometricEnabled: boolean;
  privacyEnabled: boolean;
  biometryKind: BiometryKind;
  failedAttempts: number;
  lockoutUntil: number;
  lastActivity: number;
  init: () => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  removePin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  unlockByBiometric: (reason: string) => Promise<BiometricPromptResult>;
  lock: () => void;
  unlock: () => void;
  touch: () => void;
  setMode: (mode: LockMode) => void;
  setTimeoutMinutes: (minutes: number) => void;
  setBiometric: (enabled: boolean) => void;
  setPrivacy: (enabled: boolean) => void;
}

export const useAppLock = create<AppLockState>()((set, get) => ({
  ready: false,
  isLocked: false,
  pinSet: false,
  pinHash: null,
  pinSalt: null,
  mode: "off",
  timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
  biometricEnabled: false,
  privacyEnabled: false,
  biometryKind: "unknown",
  failedAttempts: 0,
  lockoutUntil: 0,
  lastActivity: Date.now(),

  init: async () => {
    const pinHash = read(K.pinHash, "") || null;
    const pinSalt = read(K.pinSalt, "") || null;
    const pinSet = !!pinHash && !!pinSalt;
    const mode = (read(K.mode, "off") as LockMode) || "off";
    const now = Date.now();
    const biometryKind = await getBiometryKind();
    const shouldLock = pinSet && mode !== "off";
    set({
      ready: true,
      pinSet,
      pinHash,
      pinSalt,
      mode,
      timeoutMinutes: Number(read(K.timeout, String(DEFAULT_TIMEOUT_MINUTES))) || DEFAULT_TIMEOUT_MINUTES,
      biometricEnabled: read(K.biometric, "0") === "1",
      privacyEnabled: read(K.privacy, "0") === "1",
      biometryKind,
      failedAttempts: Number(read(K.attempts, "0")) || 0,
      lockoutUntil: Number(read(K.lockoutUntil, "0")) || 0,
      lastActivity: Number(read(K.lastActivity, String(now))) || now,
      isLocked: shouldLock,
    });
  },

  setupPin: async (pin) => {
    const salt = randomSalt();
    const hash = await hashPin(pin, salt);
    write(K.pinHash, hash);
    write(K.pinSalt, salt);
    write(K.lastActivity, String(Date.now()));
    set({
      pinSet: true,
      pinHash: hash,
      pinSalt: salt,
      failedAttempts: 0,
      lockoutUntil: 0,
      isLocked: false,
      lastActivity: Date.now(),
    });
  },

  removePin: () => {
    removeKey(K.pinHash);
    removeKey(K.pinSalt);
    write(K.mode, "off");
    write(K.attempts, "0");
    write(K.lockoutUntil, "0");
    set({
      pinSet: false,
      pinHash: null,
      pinSalt: null,
      mode: "off",
      isLocked: false,
      failedAttempts: 0,
      lockoutUntil: 0,
    });
  },

  verifyPin: async (pin) => {
    const { pinHash, pinSalt, failedAttempts, lockoutUntil } = get();
    if (lockoutUntil > Date.now()) return false;
    if (!pinHash || !pinSalt) return false;

    const hash = await hashPin(pin, pinSalt);
    const now = Date.now();
    if (hash === pinHash) {
      write(K.attempts, "0");
      write(K.lockoutUntil, "0");
      write(K.lastActivity, String(now));
      set({ failedAttempts: 0, lockoutUntil: 0, isLocked: false, lastActivity: now });
      return true;
    }

    const attempts = failedAttempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const until = now + LOCKOUT_MS;
      write(K.attempts, "0");
      write(K.lockoutUntil, String(until));
      set({ failedAttempts: 0, lockoutUntil: until });
    } else {
      write(K.attempts, String(attempts));
      set({ failedAttempts: attempts });
    }
    return false;
  },

  unlockByBiometric: async (reason) => {
    if (!isNative()) return { ok: false, reason: "unavailable" };
    const result = await biometricPrompt(reason, { allowDeviceCredential: true });
    if (result.ok) {
      write(K.attempts, "0");
      write(K.lockoutUntil, "0");
      write(K.lastActivity, String(Date.now()));
      set({ failedAttempts: 0, lockoutUntil: 0, isLocked: false, lastActivity: Date.now() });
    }
    return result;
  },

  lock: () => {
    const { pinSet } = get();
    if (!pinSet) return;
    set({ isLocked: true });
  },

  unlock: () => {
    const now = Date.now();
    write(K.attempts, "0");
    write(K.lastActivity, String(now));
    set({ isLocked: false, failedAttempts: 0, lastActivity: now });
  },

  touch: () => {
    const now = Date.now();
    write(K.lastActivity, String(now));
    set({ lastActivity: now });
  },

  setMode: (mode) => {
    write(K.mode, mode);
    set({ mode });
  },

  setTimeoutMinutes: (minutes) => {
    write(K.timeout, String(minutes));
    set({ timeoutMinutes: minutes });
  },

  setBiometric: (enabled) => {
    write(K.biometric, enabled ? "1" : "0");
    set({ biometricEnabled: enabled });
  },

  setPrivacy: (enabled) => {
    write(K.privacy, enabled ? "1" : "0");
    set({ privacyEnabled: enabled });
  },
}));

// ---------------------------------------------------------------------------
// حماية الخصوصية الأصلية (منع التصوير + إخفاء المعاينة) عبر
// @capacitor-community/privacy-screen — على أندرويد يفعّل FLAG_SECURE.
// ---------------------------------------------------------------------------

export async function enablePrivacyProtection(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { PrivacyScreen } = await import("@capacitor-community/privacy-screen");
    await PrivacyScreen.enable();
    return true;
  } catch {
    return false;
  }
}

export async function disablePrivacyProtection(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { PrivacyScreen } = await import("@capacitor-community/privacy-screen");
    await PrivacyScreen.disable();
    return true;
  } catch {
    return false;
  }
}

/** تطبيق/إلغاء الحماية الأصلية حسب حالة الإعداد المحفوظ. */
export async function syncPrivacyProtection(enabled: boolean): Promise<void> {
  if (enabled) {
    await enablePrivacyProtection();
  } else {
    await disablePrivacyProtection();
  }
}

/** نوع البيومترية المتوفرة على الجهاز (بصمة/وجه/بلا). */
export async function checkBiometricSupport(): Promise<BiometryKind> {
  return getBiometryKind();
}
