// src/lib/ai-runtime.ts
// إعدادات الذكاء الاصطناعي الحيّة — يتحكم فيها المشرف من لوحة التحكم مباشرة
// (وثيقة settings/ai في Firestore). لا تُخزَّن أي أسرار هنا: مفاتيح API تبقى
// في متغيرات البيئة. القراءة عامة مثل settings/ui لأن نفس البيانات تظهر عملياً
// في سلوك المساعد، والكتابة محصورة بالمشرف حسب قواعد Firestore.
//
// ذاكرة مؤقتة 15 ثانية على الخادم حتى لا يُقرأ Firestore مع كل رسالة شات.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AiProviderChoice = 'auto' | 'ollama' | 'openrouter';

export interface AiRuntimeConfig {
  /** اختيار الموفر: تلقائي (أولما محلياً ثم OpenRouter) أو فرض موفر */
  provider: AiProviderChoice;
  /** أسماء الموديلات (فارغة = القيمة الافتراضية من بيئة النشر) */
  ollamaModel: string;
  ollamaVisionModel: string;
  openrouterModel: string;
  /** درجة الإبداع 0 → 1 */
  temperature: number;
  lengthPref: 'short' | 'balanced' | 'detailed';
  languagePolicy: 'auto' | 'fr' | 'ar';
  /** شخصية المساعد: معرف قالب جاهز أو 'custom' */
  personality: string;
  /** نص أسلوب حر عند اختيار 'custom' (يُضاف دائماً إن وُجد) */
  customStyle: string;
  /** تعليمات إضافية يكتبها المشرف (عروض، سياسات، ردود رسمية...) */
  extraInstructions: string;
  /** مفاتيح تشغيل الميزات */
  enabledChatbot: boolean;
  enabledOrders: boolean;
  enabledImageGen: boolean;
  /** ===== Ollama بعيد (production) =====
   * عنوان خادم Ollama (VPS/Docker...) يتجاوز OLLAMA_BASE_URL من البيئة.
   * ملاحظة: هذه الوثيقة مقروءة للعموم — احمِ خادمك بمفتاح OLLAMA_API_KEY. */
  ollamaBaseUrl: string;
  /** ===== هوية المساعد في الواجهة ===== */
  assistantName: string;
  assistantEmoji: string;
  welcomeMessageFr: string;
  welcomeMessageAr: string;
  /** اقتراحات سريعة تظهر كأزرار داخل الشات */
  suggestedPromptsFr: string[];
  suggestedPromptsAr: string[];
  /** ===== التحويل لموظف بشري عبر واتساب ===== */
  whatsappNumber: string;
  handoffKeywords: string;
  handoffMessageFr: string;
  handoffMessageAr: string;
  /** ===== أوقات العمل ===== */
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  outsideHoursNoteFr: string;
  outsideHoursNoteAr: string;
  /** ===== حدود ورسائل ===== */
  /** حد رسائل الشات لكل IP/ساعة (0 = بلا حد) */
  chatRateLimitPerHour: number;
  unavailableMessageFr: string;
  unavailableMessageAr: string;
}

export const DEFAULT_AI_CONFIG: AiRuntimeConfig = {
  provider: 'auto',
  ollamaModel: '',
  ollamaVisionModel: '',
  openrouterModel: '',
  temperature: 0.4,
  lengthPref: 'balanced',
  languagePolicy: 'auto',
  personality: 'professional',
  customStyle: '',
  extraInstructions: '',
  enabledChatbot: true,
  enabledOrders: true,
  enabledImageGen: true,
  ollamaBaseUrl: '',
  assistantName: '',
  assistantEmoji: '',
  welcomeMessageFr: '',
  welcomeMessageAr: '',
  suggestedPromptsFr: [],
  suggestedPromptsAr: [],
  whatsappNumber: '',
  handoffKeywords: '',
  handoffMessageFr: '',
  handoffMessageAr: '',
  workingHoursEnabled: false,
  workingHoursStart: '08:00',
  workingHoursEnd: '18:00',
  outsideHoursNoteFr: '',
  outsideHoursNoteAr: '',
  chatRateLimitPerHour: 40,
  unavailableMessageFr: '',
  unavailableMessageAr: '',
};

/** تنظيف ودمج القيم القادمة من Firestore مع الافتراضيات (حماية من القيم الفاسدة). */
export function sanitizeAiConfig(raw: any): AiRuntimeConfig {
  const d = DEFAULT_AI_CONFIG;
  if (!raw || typeof raw !== 'object') return { ...d };
  const num = (v: any, min: number, max: number, fb: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
  };
  const str = (v: any, max = 4000) =>
    typeof v === 'string' ? v.slice(0, max) : '';
  const strList = (v: any): string[] =>
    Array.isArray(v)
      ? v
          .map((x: any) => (typeof x === 'string' ? x.trim().slice(0, 120) : ''))
          .filter(Boolean)
          .slice(0, 6)
      : [];
  const isTime = (v: any) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  return {
    provider: ['auto', 'ollama', 'openrouter'].includes(raw.provider)
      ? raw.provider
      : d.provider,
    ollamaModel: str(raw.ollamaModel, 120),
    ollamaVisionModel: str(raw.ollamaVisionModel, 120),
    openrouterModel: str(raw.openrouterModel, 120),
    temperature: num(raw.temperature, 0, 1, d.temperature),
    lengthPref: ['short', 'balanced', 'detailed'].includes(raw.lengthPref)
      ? raw.lengthPref
      : d.lengthPref,
    languagePolicy: ['auto', 'fr', 'ar'].includes(raw.languagePolicy)
      ? raw.languagePolicy
      : d.languagePolicy,
    personality: typeof raw.personality === 'string' && raw.personality ? raw.personality.slice(0, 40) : d.personality,
    customStyle: str(raw.customStyle, 2000),
    extraInstructions: str(raw.extraInstructions, 4000),
    enabledChatbot: raw.enabledChatbot !== false,
    enabledOrders: raw.enabledOrders !== false,
    enabledImageGen: raw.enabledImageGen !== false,
    ollamaBaseUrl: str(raw.ollamaBaseUrl, 300).trim(),
    assistantName: str(raw.assistantName, 60).trim(),
    assistantEmoji: str(raw.assistantEmoji, 8).trim(),
    welcomeMessageFr: str(raw.welcomeMessageFr, 800),
    welcomeMessageAr: str(raw.welcomeMessageAr, 800),
    suggestedPromptsFr: strList(raw.suggestedPromptsFr),
    suggestedPromptsAr: strList(raw.suggestedPromptsAr),
    whatsappNumber: str(raw.whatsappNumber, 24).replace(/[^\d+]/g, ''),
    handoffKeywords: str(raw.handoffKeywords, 300),
    handoffMessageFr: str(raw.handoffMessageFr, 400),
    handoffMessageAr: str(raw.handoffMessageAr, 400),
    workingHoursEnabled: raw.workingHoursEnabled === true,
    workingHoursStart: isTime(raw.workingHoursStart) ? raw.workingHoursStart : d.workingHoursStart,
    workingHoursEnd: isTime(raw.workingHoursEnd) ? raw.workingHoursEnd : d.workingHoursEnd,
    outsideHoursNoteFr: str(raw.outsideHoursNoteFr, 400),
    outsideHoursNoteAr: str(raw.outsideHoursNoteAr, 400),
    chatRateLimitPerHour: Math.round(num(raw.chatRateLimitPerHour, 0, 500, d.chatRateLimitPerHour)),
    unavailableMessageFr: str(raw.unavailableMessageFr, 400),
    unavailableMessageAr: str(raw.unavailableMessageAr, 400),
  };
}

// ---------------------------------------------------------------------------
// كاش من جانب الخادم (15s) — يوازن بين "تحكم فوري" وتكلفة القراءة
// ---------------------------------------------------------------------------

let cache: { cfg: AiRuntimeConfig; at: number } | null = null;
const CACHE_TTL_MS = 15_000;

export function invalidateAiConfigCache() {
  cache = null;
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.cfg;
  try {
    const snap = await getDoc(doc(db, 'settings', 'ai'));
    const cfg = sanitizeAiConfig(snap.exists() ? snap.data() : null);
    cache = { cfg, at: Date.now() };
    return cfg;
  } catch {
    // Firestore غير متاح؟ نرجع الافتراضي دون كسر الشات أبداً.
    return { ...DEFAULT_AI_CONFIG };
  }
}

// ---------------------------------------------------------------------------
// قوالب الشخصيات الجاهزة (تُشارك بين لوحة الأدمن وباني البرومبت)
// ---------------------------------------------------------------------------

export interface PersonalityPreset {
  id: string;
  emoji: string;
  labelFr: string;
  labelAr: string;
  instructions: string;
}

export const AI_PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: 'professional',
    emoji: '🎩',
    labelFr: 'Consultant Expert',
    labelAr: 'خبير استشاري',
    instructions:
      'Tone: professional, precise and structured like a premium print consultant. Give expert advice on paper types, finishes and print quality. Use clean formatting.',
  },
  {
    id: 'friendly',
    emoji: '😊',
    labelFr: 'Amical & Chaleureux',
    labelAr: 'ودود ودافئ',
    instructions:
      'Tone: warm, friendly and casual like a helpful shopkeeper friend. Light use of emojis (1-2 max per message). Make the customer feel welcome.',
  },
  {
    id: 'sales',
    emoji: '🚀',
    labelFr: 'Star du Commercial',
    labelAr: 'نجم المبيعات',
    instructions:
      'Tone: enthusiastic sales star. Proactively suggest relevant products, quantity discounts (200+ → -10%, 500+ → -15%, 1000+ → -20%), premium/luxe finishes and active promo codes when they genuinely help the customer. Always end with a subtle call-to-action.',
  },
  {
    id: 'concise',
    emoji: '⚡',
    labelFr: 'Ultra-Direct',
    labelAr: 'مباشر جداً',
    instructions:
      'Tone: ultra-concise. Answer in the fewest words possible while staying accurate. No filler sentences, no long lists unless asked.',
  },
  {
    id: 'creative',
    emoji: '🎨',
    labelFr: 'Directeur Artistique',
    labelAr: 'مدير فني',
    instructions:
      'Tone: creative art director. When discussing designs, propose vivid visual ideas (colors, fonts, layouts, paper textures). Inspire the customer.',
  },
];

export function getPresetById(id: string): PersonalityPreset | undefined {
  return AI_PERSONALITY_PRESETS.find((p) => p.id === id);
}
