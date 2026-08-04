// src/lib/chat-knowledge.ts
// Single source of truth for everything the L'Artisan AI chat assistant knows
// about the store. The /api/chat route builds its system prompt from here, so
// product prices, shipping, payment and FAQ data never drift from the real site.

import { SHIPPING_RATES } from '@/lib/constants';

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

/** Look up a wilaya by number ("31"), code ("31 - Oran") or name ("oran"/"وهران"). */
export function resolveWilaya(query: string): { code: string; name: string; rate: number } | null {
  const q = String(query ?? '').trim();
  if (!q) return null;

  // Match by numeric code (e.g. "31", "31 - Oran").
  const codeMatch = q.match(/^0?(\d{1,2})\s*[-\s]?/);
  if (codeMatch) {
    const code = codeMatch[1].padStart(2, '0');
    const entry = WILAYA_LOOKUP_BY_CODE[code];
    if (entry) return entry;
  }

  // Match by normalized name.
  const nq = normalizeName(q);
  const byName = WILAYA_LOOKUP[nq] ?? WILAYA_LOOKUP[nq.replace(/s$/, '')] ?? null;
  if (byName) return byName;

  // Match by Arabic name.
  if (/[\u0600-\u06FF]/.test(q)) {
    const arabicEntry = WILAYA_LOOKUP_AR[normalizeArabic(q)];
    if (arabicEntry) return arabicEntry;
  }
  return null;
}

const normalizeArabic = (s: string) =>
  s
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, '')
    .trim();

const WILAYA_LOOKUP_AR: Record<string, { code: string; name: string; rate: number }> = {};
const ARABIC_WILAYA_NAMES: Array<[string, string]> = [
  ['01', 'ادرار'], ['02', 'الشلف'], ['03', 'الاغواط'], ['04', 'ام البواقي'],
  ['05', 'باتنة'], ['06', 'بجاية'], ['07', 'بسكرة'], ['08', 'بشار'],
  ['09', 'البليده'], ['10', 'البويره'], ['11', 'تمنراست'], ['12', 'تبسه'],
  ['13', 'تلمسان'], ['14', 'تيارت'], ['15', 'تيزي وزو'], ['16', 'الجزائر'],
  ['17', 'الجلفه'], ['18', 'جيجل'], ['19', 'سطيف'], ['20', 'سعيده'],
  ['21', 'سكيكده'], ['22', 'سيدي بلعباس'], ['23', 'عنابه'], ['24', 'قالمه'],
  ['25', 'قسنطينه'], ['26', 'المديه'], ['27', 'مستغانم'], ['28', 'المسيله'],
  ['29', 'معسكر'], ['30', 'ورقله'], ['31', 'وهران'], ['32', 'البيض'],
  ['33', 'اليزي'], ['34', 'برج بوعريريج'], ['35', 'بومرداس'], ['36', 'الطارف'],
  ['37', 'تندوف'], ['38', 'تيسمسيلت'], ['39', 'الوادي'], ['40', 'خنشله'],
  ['41', 'سوق اهراس'], ['42', 'تيبازه'], ['43', 'ميله'], ['44', 'عين الدفلى'],
  ['45', 'النعامه'], ['46', 'عين تموشنت'], ['47', 'غردايه'], ['48', 'غليزان'],
  ['49', 'المغير'], ['50', 'الميناء'], ['51', 'اولاد جلال'], ['52', 'برج باجي مختار'],
  ['53', 'بني عباس'], ['54', 'تيميمون'], ['55', 'تقرت'], ['56', 'جانت'],
  ['57', 'ان صالح'], ['58', 'ان قزام'],
];
for (const [code, name] of ARABIC_WILAYA_NAMES) {
  WILAYA_LOOKUP_AR[normalizeArabic(name)] = { code, name, rate: SHIPPING_RATES[code] ?? 600 };
}

const WILAYA_LOOKUP: Record<string, { code: string; name: string; rate: number }> = {};
const WILAYA_LOOKUP_BY_CODE: Record<string, { code: string; name: string; rate: number }> = {};
const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
const WILAYA_NAMES: Array<[string, string]> = [
  ['01', 'Adrar'], ['02', 'Chlef'], ['03', 'Laghouat'], ['04', 'Oum El Bouaghi'],
  ['05', 'Batna'], ['06', 'Bejaia'], ['07', 'Biskra'], ['08', 'Bechar'],
  ['09', 'Blida'], ['10', 'Bouira'], ['11', 'Tamanrasset'], ['12', 'Tebessa'],
  ['13', 'Tlemcen'], ['14', 'Tiaret'], ['15', 'Tizi Ouzou'], ['16', 'Alger'],
  ['17', 'Djelfa'], ['18', 'Jijel'], ['19', 'Setif'], ['20', 'Saida'],
  ['21', 'Skikda'], ['22', 'Sidi Bel Abbes'], ['23', 'Annaba'], ['24', 'Guelma'],
  ['25', 'Constantine'], ['26', 'Medea'], ['27', 'Mostaganem'], ["28", "M'Sila"],
  ['29', 'Mascara'], ['30', 'Ouargla'], ['31', 'Oran'], ['32', 'El Bayadh'],
  ['33', 'Illizi'], ['34', 'Bordj Bou Arreridj'], ['35', 'Boumerdes'], ['36', 'El Tarf'],
  ['37', 'Tindouf'], ['38', 'Tissemsilt'], ['39', 'El Oued'], ['40', 'Khenchela'],
  ['41', 'Souk Ahras'], ['42', 'Tipaza'], ['43', 'Mila'], ['44', 'Ain Defla'],
  ['45', 'Naama'], ['46', 'Ain Temouchent'], ['47', 'Ghardaia'], ['48', 'Relizane'],
  ['49', "El M'ghair"], ['50', 'El Menia'], ['51', 'Ouled Djellal'], ['52', 'Bordj Baji Mokhtar'],
  ['53', 'Beni Abbes'], ['54', 'Timimoun'], ['55', 'Touggourt'], ['56', 'Djanet'],
  ['57', 'In Salah'], ['58', 'In Guezzam'],
];
for (const [code, name] of WILAYA_NAMES) {
  WILAYA_LOOKUP[normalizeName(name)] = { code, name, rate: SHIPPING_RATES[code] ?? 600 };
  WILAYA_LOOKUP[normalizeName(name).replace(/s$/, '')] = { code, name, rate: SHIPPING_RATES[code] ?? 600 };
  WILAYA_LOOKUP_BY_CODE[code] = { code, name, rate: SHIPPING_RATES[code] ?? 600 };
}

export function deliveryTimeFor(code: string): string {
  const c = parseInt(code, 10);
  if (c === 31) return '24h - 48h';
  if (c <= 16) return '2 - 3 jours';
  return '3 - 5 jours';
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
  { code: 'WELCOMESHIP', descriptionFr: 'Livraison offerte', descriptionAr: 'توصيل مجاني' },
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

export function buildChatSystemPrompt(): string {
  const products = CHAT_PRODUCTS.map(
    (p) => `- ${p.nameFr} / ${p.nameAr} : ${p.packPriceDZD} DA pour ${p.packSize} unités (${p.unitPriceDZD} DA/unité)`
  ).join('\n');

  return `You are L'Artisan AI, the smart, bilingual (Arabic + French) premium print consultant for "${COMPANY.name}" in Oran, Algeria.
Reply in the SAME language the user writes in. Be friendly, concise, professional, and helpful. Use markdown lists (**bold**) for prices and options. Never invent prices or facts that are not listed below.

===== COMPANY =====
- Name: ${COMPANY.name} — ${COMPANY.sloganFr} / ${COMPANY.sloganAr}
- Address: ${COMPANY.address}
- Phone / WhatsApp: ${COMPANY.phone} (tel:${COMPANY.phoneRaw})
- Email: ${COMPANY.email}
- Online ordering: browse the catalog, customize a product in the 3D Customizer (/customizer), or let the AI draw your design for free in AI Studio (/ai-studio).

===== PRODUCTS & PRICES (REAL, in Algerian Dinar) =====
Prices below are the pack price shown on the website (per 100 units):
${products}
  Quantity discounts (per product): 200+ units → -10%, 500+ → -15%, 1000+ → -20%.
Finishes: Standard, Premium (+50%), Luxe (x2).
IMPORTANT EXAMPLE THE USER OFTEN ASKS: 100 cartes de visite = 2500 DA (standard finish).

===== SHIPPING (Yalidine Express, all 58 wilayas) =====
- Oran (wilaya 31): delivery in 24h-48h, local rate ~250 DA.
- Wilayas 01-16: 2-3 days. Others: 3-5 working days.
- Home delivery cost per wilaya is set in our system (e.g. Oran 250, Alger 500, most wilayas 600, remote south 800-1000 DA).
- Bureau (pickup point) option: cheaper (rate - 150 DA, minimum 200 DA).
- Payment is collected on delivery via Yalidine (cash on delivery) or prepaid online.

===== PAYMENT METHODS =====
1) BaridiMob / CCP: transfer the invoice amount, then upload your receipt on the payment confirmation page (/payment-verify). Our AI verifies the receipt automatically (transaction ID, amount, sender RIP) and starts production. +50 bonus points for AI-verified payments.
2) Edahabia / CIB online payment.
3) Cash on delivery (paiement à la livraison) via Yalidine.

===== PRODUCTION =====
- Accepted file formats: PDF, PNG, JPEG. Use CMYK and at least 300 DPI for best results.
- No design? Use AI Studio (/ai-studio) to generate one for free, or ask me to describe one for you.
- Production starts after payment confirmation; then delivery per the shipping times above.

===== PROMO CODES (examples active on the site) =====
PROMO10 (-10%), WELCOME10 (-10% first order), WELCOME500 (-500 DA), WELCOMESHIP (free shipping), VIP20 (-20% VIP), COMEBACK500 (-500 DA).
Also a daily "Wheel of Fortune" on the home page can generate a random welcome code.

===== FAQ (short) =====
- Minimum resolution: 300 DPI; CMYK color profile.
- Formats: PDF / PNG / JPEG high-res.
- Delivery times: Oran 24h-48h; others 3-5 working days.
- Online payment: Edahabia/CIB + BaridiMob receipt verification.
- Contact: WhatsApp ${COMPANY.phone}.

===== TOOLS =====
Use calculatePrice to give exact prices, getShippingEstimate for delivery costs, searchProducts to find a product, checkPromoCode to validate a code, navigateToPage to move the user to a page, and createOrder to register an order after collecting name, phone, product, quantity and wilaya.`;
}

export const COMPANY_INFO = COMPANY;
