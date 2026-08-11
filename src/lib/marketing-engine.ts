// src/lib/marketing-engine.ts
// Client-side marketing engine for L'Artisan Imprimeur
//
// Powers: welcome offers, flash sales, event tracking and referrals.
// All configuration is read from Firestore `settings/marketing` with
// sensible offline fallbacks so the site never breaks.

import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WelcomeOffer {
  enabled: boolean;
  code: string;            // e.g. "WELCOME10"
  discountLabel: string;   // e.g. "10%"
  minAmount: number;       // minimum order amount (DA)
  expiresInMinutes: number;
  headlineFr: string;
  headlineAr: string;
  subheadFr: string;
  subheadAr: string;
}

export interface FlashSale {
  enabled: boolean;
  titleFr: string;
  titleAr: string;
  code: string;
  discountLabel: string;
  startAt: string;         // ISO
  endAt: string;           // ISO
}

export interface ReferralConfig {
  bonusPoints: number;
  sharedMessageFr: string;
  sharedMessageAr: string;
}

// ─── Fallbacks ──────────────────────────────────────────────────────────────

const DEFAULT_WELCOME: WelcomeOffer = {
  enabled: true,
  code: "WELCOME10",
  discountLabel: "10%",
  minAmount: 1000,
  expiresInMinutes: 60,
  headlineFr: "-10% sur votre première commande",
  headlineAr: "-10% على طلبك الأول",
  subheadFr: "Profitez-en avant la fin du compte à rebours !",
  subheadAr: "استفد قبل نهاية العد التنازلي!",
};

const DEFAULT_FLASH: FlashSale = {
  enabled: true,
  titleFr: "Vente Flash du jour",
  titleAr: "عرض اليوم الخاطف",
  code: "FLASH10",
  discountLabel: "10%",
  startAt: "",
  endAt: "",
};

export const DEFAULT_REFERRAL: ReferralConfig = {
  bonusPoints: 50,
  sharedMessageFr:
    "Rejoignez L'Artisan Imprimeur et obtenez -10% sur votre première commande ! Utilisez mon code de parrainage :",
  sharedMessageAr:
    "انضم إلى الحرفي للطباعة واحصل على خصم 10% على طلبك الأول! استخدم كود الإحالة الخاص بي:",
};

// ─── Firestore sync ─────────────────────────────────────────────────────────

let cachedMarketing: {
  welcome?: WelcomeOffer;
  flash?: FlashSale;
  referral?: ReferralConfig;
  loadedAt: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getMarketingConfig(): Promise<{
  welcome: WelcomeOffer;
  flash: FlashSale;
  referral: ReferralConfig;
}> {
  if (cachedMarketing && Date.now() - cachedMarketing.loadedAt < CACHE_TTL) {
    return {
      welcome: cachedMarketing.welcome || DEFAULT_WELCOME,
      flash: cachedMarketing.flash || DEFAULT_FLASH,
      referral: cachedMarketing.referral || DEFAULT_REFERRAL,
    };
  }

  try {
    const snap = await getDoc(doc(db, "settings", "marketing"));
    if (snap.exists()) {
      const data = snap.data();
      const result = {
        welcome: { ...DEFAULT_WELCOME, ...(data.welcome || {}) } as WelcomeOffer,
        flash: { ...DEFAULT_FLASH, ...(data.flash || {}) } as FlashSale,
        referral: { ...DEFAULT_REFERRAL, ...(data.referral || {}) } as ReferralConfig,
      };
      cachedMarketing = { ...result, loadedAt: Date.now() };
      return result;
    }
  } catch (err) {
    console.warn("Marketing config unavailable, using defaults:", err);
  }

  return { welcome: DEFAULT_WELCOME, flash: DEFAULT_FLASH, referral: DEFAULT_REFERRAL };
}

export function clearMarketingCache() {
  cachedMarketing = null;
}

// ─── Welcome offer gating (once per session / once per day) ────────────────

const WELCOME_KEY = "artisan_welcome_offer";
const LAST_SEEN_KEY = "artisan_welcome_seen_at";

export function shouldShowWelcomeOffer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Only show once per browser session
    if (sessionStorage.getItem(WELCOME_KEY)) return false;
    // And at most once per 24h
    const last = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
    if (Date.now() - last < 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export function markWelcomeOfferSeen() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WELCOME_KEY, "1");
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  } catch {}
}

export function applyWelcomeCodeLocally(code: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("marketing_welcome_code", code);
  } catch {}
}

// ─── Flash sale countdown helpers ───────────────────────────────────────────

export function getFlashSaleWindow(flash: FlashSale): { start: number; end: number } {
  const now = Date.now();
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const start = flash.startAt ? new Date(flash.startAt).getTime() : now;
  const end = flash.endAt
    ? new Date(flash.endAt).getTime()
    : Math.max(dayEnd.getTime(), start + 12 * 60 * 60 * 1000);
  return { start, end };
}

export function isFlashSaleLive(flash: FlashSale): boolean {
  if (!flash.enabled) return false;
  const { start, end } = getFlashSaleWindow(flash);
  const now = Date.now();
  return now >= start && now <= end;
}

// ─── Event tracking (fire-and-forget, throttled) ────────────────────────────

let lastEventSent: Record<string, number> = {};
const EVENT_THROTTLE_MS = 30 * 1000;

export async function trackMarketingEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - (lastEventSent[event] || 0) < EVENT_THROTTLE_MS) return;
  lastEventSent[event] = now;

  try {
    await addDoc(collection(db, "marketing_events"), {
      event,
      payload,
      sessionId: sessionStorage.getItem("artisan_session_id") || null,
      path: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 200),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to track event:", err);
  }
}

// Session id (used across tracking + referrals)
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem("artisan_session_id");
    if (!id) {
      id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("artisan_session_id", id);
    }
    return id;
  } catch {
    return "";
  }
}

// ─── Referral helpers ───────────────────────────────────────────────────────

export function buildReferralLink(code: string | null, appUrl = "http://localhost:3000"): string {
  const base = `${appUrl}/login`;
  if (!code) return base;
  return `${base}?ref=${encodeURIComponent(code)}`;
}

export function buildWhatsAppShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildFacebookShareLink(url: string, message: string): string {
  const q = encodeURIComponent(`${message}\n${url}`);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${q}`;
}

export function buildXShareLink(url: string, message: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
    message
  )}`;
}

// ─── Persist a generated referral code to the user doc ──────────────────────

export async function ensureReferralCode(
  userId: string,
  generate: () => Promise<string>
): Promise<string | null> {
  try {
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().referralCode) {
      return snap.data().referralCode as string;
    }
    const code = await generate();
    await setDoc(ref, { referralCode: code }, { merge: true });
    return code;
  } catch (err) {
    console.error("Error ensuring referral code:", err);
    return null;
  }
}
