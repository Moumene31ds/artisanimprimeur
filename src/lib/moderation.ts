// src/lib/moderation.ts
// Lightweight, zero-cost content moderation for the AI chat assistant.
// Runs BEFORE any prompt reaches the model (or any paid inference happens) so
// abusive, harmful or spammy messages are rejected without consuming tokens.

export const MODERATION_VIOLATION_MESSAGE =
  "Cette conversation ne peut pas continuer sur ce sujet. Merci de rester courtois(e) et de poser des questions liées à nos services d'impression.";

// Interdictions prioritaires : danger immédiat (auto, explosifs, armes).
const BAN_PATTERNS: RegExp[] = [
  /explos|bombe|plastic\s*expl|محضر|متفج|قنبلة/i,
  /(how|faire|build|creat|fabric|make|تعلّم|اصنع|صنع).{0,40}(bomb|explos|weapon|gun|agent.?orange|سامة|سموم)/i,
  /terror|إرهاب|هجوم/i,
  /(child|enfant|minor|mineur).{0,20}(sex|porn|pédoph|إباح|استغلال)/i,
];

// Spam / hors-sujet : محاولات إعادة التوجيه أو البريد العشوائي.
const SPAM_PATTERNS: RegExp[] = [
  /(dont|ignore|disregard|ignorez|تجاهل).{0,40}(previous|system|instructions|الأسطر|الأوامر)/i,
  /(you are|tu es|you'?re|أنت).{0,20}(now|maintenant|الآن).{0,20}(an? )?(openai|gpt|chatgpt|claude|anthropic|bot|assistant|unconstrained|jailbre|DAN|do anything)/i,
  /jailbreak|bypass.*(filter|safety|guardrail)|(اعطني|اكتب|أخبرني).{0,20}(كود خبيث|برنامج ضار|malware|exploit|payload)/i,
  /(بيع|أبيع|رابح|ربح سريع|كسب|100%|double).{0,30}(مال|فلوس|بيتكوين|bitcoin|crypto)/i,
];

export function moderateMessage(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const text = content.replace(/!\[.*?\]\(data:[^)]*\)/g, ' ').replace(/\s+/g, ' ');
  if (text.length > 5000) return false;

  for (const re of BAN_PATTERNS) {
    if (re.test(text)) return true;
  }
  for (const re of SPAM_PATTERNS) {
    if (re.test(text)) return true;
  }
  return false;
}
