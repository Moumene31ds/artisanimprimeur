// src/lib/chat-knowledge.ts
// Single source of truth for everything the L'Artisan AI chat assistant knows
// about the store. The /api/chat route builds its system prompt from here, so
// product prices, payment and FAQ data never drift from the real site.

export interface ChatProduct {
  key: string;
  nameFr: string;
  nameAr: string;
  /** Unit price in DZD (catalog price is per 100 units unless packSize says otherwise). */
  unitPriceDZD: number;
  /** Retail pack price shown on the site. */
  packPriceDZD: number;
  packSize: number;
  categoryFr: string;
  categoryAr: string;
}

// Real catalog prices (see src/lib/catalog.ts): the site sells packs of 100.
export const CHAT_PRODUCTS: ChatProduct[] = [
  {
    key: 'cartes',
    nameFr: 'Cartes de visite premium',
    nameAr: 'بطاقات زيارة فاخرة',
    unitPriceDZD: 25,
    packPriceDZD: 2500,
    packSize: 100,
    categoryFr: 'Cartes',
    categoryAr: 'بطاقات',
  },
  {
    key: 'flyers',
    nameFr: 'Flyers publicitaires A5',
    nameAr: 'منشورات إعلانية A5',
    unitPriceDZD: 45,
    packPriceDZD: 4500,
    packSize: 100,
    categoryFr: 'Flyers',
    categoryAr: 'منشورات',
  },
  {
    key: 'stickers',
    nameFr: 'Stickers personnalisés',
    nameAr: 'ملصقات مخصصة',
    unitPriceDZD: 12,
    packPriceDZD: 1200,
    packSize: 100,
    categoryFr: 'Goodies',
    categoryAr: 'هدايا',
  },
  {
    key: 'affiches',
    nameFr: 'Affiches de luxe A3',
    nameAr: 'أفيسات فاخرة A3',
    unitPriceDZD: 30,
    packPriceDZD: 3000,
    packSize: 100,
    categoryFr: 'Impression',
    categoryAr: 'طباعة',
  },
  {
    key: 'invitations',
    nameFr: 'Invitations de mariage',
    nameAr: 'دعوات زفاف',
    unitPriceDZD: 50,
    packPriceDZD: 5000,
    packSize: 100,
    categoryFr: 'Cartes',
    categoryAr: 'بطاقات',
  },
];

export interface PriceBreakdown {
  productKey: string;
  quantity: number;
  finish: 'standard' | 'premium' | 'luxe';
  unitPriceDZD: number;
  subtotalDZD: number;
  discountPercent: number;
  discountDZD: number;
  totalDZD: number;
  nextTier: { neededQty: number; discountPercent: number } | null;
  perUnitDZD: number;
}

export function getProductByKey(key: string): ChatProduct | undefined {
  return CHAT_PRODUCTS.find((p) => p.key === key);
}

/**
 * Real pricing engine used by the calculatePrice chat tool.
 * Mirrors src/lib/pricing.ts (quantity tiers) + catalog pack prices.
 */
export function computePrice(
  productKey: string,
  quantity: number,
  finish: 'standard' | 'premium' | 'luxe' = 'standard'
): PriceBreakdown {
  const product = getProductByKey(productKey) ?? CHAT_PRODUCTS[0];
  const finishMultiplier = finish === 'luxe' ? 2 : finish === 'premium' ? 1.5 : 1;
  const unitPrice = Math.round(product.unitPriceDZD * finishMultiplier);

  let discountPercent = 0;
  if (quantity >= 1000) discountPercent = 20;
  else if (quantity >= 500) discountPercent = 15;
  else if (quantity >= 200) discountPercent = 10;

  const subtotal = unitPrice * quantity;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const total = subtotal - discount;

  let nextTier: PriceBreakdown['nextTier'] = null;
  if (quantity < 200) nextTier = { neededQty: 200 - quantity, discountPercent: 10 };
  else if (quantity < 500) nextTier = { neededQty: 500 - quantity, discountPercent: 15 };
  else if (quantity < 1000) nextTier = { neededQty: 1000 - quantity, discountPercent: 20 };

  return {
    productKey: product.key,
    quantity,
    finish,
    unitPriceDZD: unitPrice,
    subtotalDZD: subtotal,
    discountPercent,
    discountDZD: discount,
    totalDZD: total,
    nextTier,
    perUnitDZD: unitPrice,
  };
}

export interface PromoInfo {
  code: string;
  descriptionFr: string;
  descriptionAr: string;
}

// Promo codes used by the site's marketing campaigns.
export const KNOWN_PROMOS: PromoInfo[] = [
  { code: 'PROMO10', descriptionFr: '-10% sur votre commande', descriptionAr: 'خصم 10% على طلبك' },
  { code: 'WELCOME10', descriptionFr: '-10% sur votre première commande', descriptionAr: 'خصم 10% على أول طلب' },
  { code: 'WELCOME500', descriptionFr: '-500 DA sur votre commande', descriptionAr: 'خصم 500 دج على طلبك' },
  { code: 'VIP20', descriptionFr: '-20% réservé aux clients VIP', descriptionAr: 'خصم 20% للعملاء المميزين' },
  { code: 'COMEBACK500', descriptionFr: '-500 DA pour votre retour', descriptionAr: 'خصم 500 دج عند عودتك' },
];

export function lookupPromo(code: string): PromoInfo | undefined {
  const q = (code ?? '').trim().toUpperCase();
  return KNOWN_PROMOS.find((p) => p.code.toUpperCase() === q);
}

const COMPANY = {
  name: "L'Artisan Imprimeur",
  sloganFr: 'Votre partenaire premium pour l\'impression et le design en Algérie',
  sloganAr: 'شريكك المميز للطباعة والتصميم في الجزائر',
  address: 'Akid Lotfi, Oran, Algérie',
  phone: '+213 549 17 90 00',
  phoneRaw: '+213549179000',
  email: 'imprimeurlartisan@gmail.com',
};

// ---------------------------------------------------------------------------
// System prompt builder (bilingual — the assistant answers in the user's language)
// ---------------------------------------------------------------------------

export interface ChatPromptOptions {
  /** Preferred reply language from the app UI. */
  languageHint?: 'ar' | 'fr';
  /** Current page path (e.g. "/cart") so the AI can offer contextual help. */
  page?: string;
  /** Compact auto-summary of earlier turns (long-conversation memory). */
  summary?: string;
}

export function buildChatSystemPrompt(options: ChatPromptOptions = {}): string {
  const products = CHAT_PRODUCTS.map(
    (p) => `- ${p.nameFr} / ${p.nameAr} : ${p.packPriceDZD} DA pour ${p.packSize} unités (${p.unitPriceDZD} DA/unité)`
  ).join('\n');

  const langRule =
    options.languageHint === 'ar'
      ? 'Reply in ARABIC (Modern Standard, friendly and natural). Keep French terms in parentheses when useful.'
      : options.languageHint === 'fr'
        ? 'Reply in FRENCH. Keep Arabic terms in parentheses when useful.'
        : 'Reply in the SAME language the user writes in (Arabic or French).';

  const pageContext = options.page
    ? `\nThe user is currently browsing the page "${options.page}". Use this to give contextual help (e.g. on /cart talk about the cart, on /orders about their orders).`
    : '';

  const summarySection = options.summary
    ? `\n===== CONVERSATION SUMMARY (earlier turns, keep it consistent) =====\n${options.summary}`
    : '';

  return `You are L'Artisan AI, the smart, bilingual (Arabic + French) premium print consultant for "${COMPANY.name}" in Oran, Algeria.
${langRule}

===== STRICT RULES (NEVER break these) =====
1. NEVER invent or guess prices, discounts, delivery fees, production times, or company facts. Only use the data below and the tool results. If you are not sure, say so honestly and give the WhatsApp number ${COMPANY.phone}.
2. For ANY price question (e.g. "combien", "كلفة", "سعر", "prix") you MUST call the calculatePrice tool with the real product, quantity and finish — never calculate from memory.
3. If a product is not in the list below, call searchProducts to find its real catalog price before answering.
4. Promo codes: only validate with checkPromoCode. Never invent codes or discounts.
5. Do NOT promise home delivery or quote delivery prices/times to other wilayas — it does not exist yet.
6. Do NOT claim online card payment is available — it is not.
7. Keep answers concise and scannable: short lines, **bold** for prices/quantities, bullet lists, no long paragraphs.
8. When the user wants to order, collect step by step (name → phone → product → quantity), then confirm with createOrder.
9. When the user says something like "خذني إلى..." or "amène-moi à...", use navigateToPage.
${pageContext}

===== COMPANY =====
- Name: ${COMPANY.name} — ${COMPANY.sloganFr} / ${COMPANY.sloganAr}
- Address: ${COMPANY.address} (retrait des commandes sur place)
- Phone / WhatsApp: ${COMPANY.phone} (tel:${COMPANY.phoneRaw})
- Email: ${COMPANY.email}
- Online ordering: browse the catalog, customize a product in the 3D Customizer (/customizer), or let the AI draw your design for free in AI Studio (/ai-studio).

===== PRODUCTS & PRICES (REAL, in Algerian Dinar) =====
Prices below are the pack price shown on the website (per 100 units):
${products}
  Quantity discounts (per product): 200+ units → -10%, 500+ → -15%, 1000+ → -20%.
Finishes: Standard, Premium (+50%), Luxe (x2).
IMPORTANT EXAMPLE THE USER OFTEN ASKS: 100 cartes de visite = 2500 DA (standard finish).
COMMON COMBOS the user may ask about: "200 cartes de visite standard" = 5000 DA (10% off); "500 flyers A5" = 19125 DA (15% off, i.e. 45 DA x 500 x 0.85). Always prefer calculatePrice for the exact number.
${summarySection}

===== DELIVERY (BIENTÔT DISPONIBLE) =====
- Home delivery is NOT available yet — it will launch very soon.
- Orders are collected at the workshop: Cité Akid Lotfi, Oran (open 09:00–18:00, Sat–Thu). No delivery fee.
- Do NOT quote shipping prices or delivery times to other wilayas.

===== PAYMENT METHODS =====
1) BaridiMob / CCP: transfer the invoice amount, then upload your receipt on the payment confirmation page (/payment-verify). Our AI verifies the receipt automatically (transaction ID, amount, sender RIP) and starts production. +50 bonus points for AI-verified payments.
2) Cash on receipt: pay in cash when collecting the order at the workshop.
- IMPORTANT: Online card payment (Edahabia / CIB) is NOT available.

===== PRODUCTION =====
- Accepted file formats: PDF, PNG, JPEG. Use CMYK and at least 300 DPI for best results.
- No design? Use AI Studio (/ai-studio) to generate one for free, or ask me to describe one for you.
- Production starts after payment confirmation; the order is then ready for pickup at the Oran workshop.

===== PROMO CODES (examples active on the site) =====
PROMO10 (-10%), WELCOME10 (-10% first order), WELCOME500 (-500 DA), VIP20 (-20% VIP), COMEBACK500 (-500 DA).
Also a daily "Wheel of Fortune" on the home page can generate a random welcome code.

===== FAQ (short) =====
- Minimum resolution: 300 DPI; CMYK color profile.
- Formats: PDF / PNG / JPEG high-res.
- Collection: at the workshop, Cité Akid Lotfi, Oran (09:00–18:00). Home delivery coming soon.
- Payment: BaridiMob receipt verification or cash on collection. Online card payment not available.
- Contact: WhatsApp ${COMPANY.phone}.

===== TOOLS =====
Use calculatePrice to give exact prices, searchProducts to find a product, checkPromoCode to validate a code, navigateToPage to move the user to a page, and createOrder to register an order after collecting name, phone, product and quantity.`;
}

// ---------------------------------------------------------------------------
// Conversation context helpers
// ---------------------------------------------------------------------------

/** Parse the "[Context: Page ..., Lang ...]" prefix the client prepends. */
export function parseUserContext(
  content: string | undefined
): { page?: string; lang?: 'ar' | 'fr' } {
  if (!content || typeof content !== 'string') return {};
  const m = content.match(/\[Context:([^\]]*)\]/);
  if (!m) return {};
  const raw = m[1] || '';
  const page = raw.match(/Page\s*([^,]+)/i)?.[1]?.trim() || undefined;
  const langMatch = raw.match(/Lang\s*(ar|fr)/i);
  const lang = langMatch ? (langMatch[1].toLowerCase() as 'ar' | 'fr') : undefined;
  return { page, lang };
}

/** Strip the internal "[Context: ...]" marker from user text. */
export function stripUserContext(content: string): string {
  return (content || '').replace(/\[Context:[^\]]*\]\.?\s*/g, '').trim();
}

function getMessagePlainText(m: any): string {
  if (!m) return '';
  if (typeof m.content === 'string' && m.content) return m.content;
  if (Array.isArray(m.parts)) {
    const text = m.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join(' ')
      .trim();
    if (text) return text;
  }
  return '';
}

/**
 * Build a compact summary of the early turns of a long conversation so the
 * model keeps facts (products, quantities, prices, decisions) across many
 * messages without blowing up the prompt. The most recent KEEP_LAST messages
 * are passed verbatim by the client anyway, so we only compress the older ones.
 */
export function buildConversationSummary(messages: any[], keepLast = 6): string | null {
  if (!Array.isArray(messages) || messages.length <= keepLast + 2) return null;
  const older = messages.slice(0, messages.length - keepLast);
  const lines: string[] = [];

  for (const m of older) {
    const text = getMessagePlainText(m);
    const roleLabel = m.role === 'user' ? 'Client' : 'Assistant';
    // Include calculated prices so later answers stay consistent.
    let toolInfo = '';
    if (m.role === 'assistant' && Array.isArray(m.parts)) {
      const price = m.parts.find(
        (p: any) => p.toolName === 'calculatePrice' && p.state === 'output-available'
      );
      if (price?.output?.totalDZD != null) {
        toolInfo = ` [prix: ${price.output.totalDZD} DA pour ${price.output.quantity} ${price.output.productKey}]`;
      }
    }
    if (text) lines.push(`${roleLabel}: ${stripUserContext(text).slice(0, 140)}${toolInfo}`);
  }
  return lines.length ? lines.join('\n') : null;
}

export const COMPANY_INFO = COMPANY;
