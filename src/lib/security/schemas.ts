// ---------------------------------------------------------------------------
// src/lib/security/schemas.ts — تحقق صارم من مخططات البيانات (Zod v4)
// ---------------------------------------------------------------------------
// جميع المدخلات التي تعبر إلى منطق العمل تُمرَّر عبر هذه المخططات أولاً
// (منع SQLi/NoSQLi عبر أنواع صارمة، ومنع XSS/حمولات خبيثة عبر حدود الحقول).
// `parseBody` يعيد نتيجة آمنة بدلاً من رمي استثناءات في كل مسار.
// ---------------------------------------------------------------------------

import { z } from 'zod';

// ---------------------------------------------------------------
// بدائيات مشدّدة
// ---------------------------------------------------------------

export const emailSchema = z.email({ message: 'Adresse email invalide' }).max(254);

export const nameSchema = z
  .string({ message: 'Nom requis' })
  .trim()
  .min(1, 'Nom requis')
  .max(120, 'Nom trop long')
  .regex(/^[\p{L}\p{M}\p{N}\s'.\-]+$/u, 'Nom invalide'); // حروف وأرقام ومسافات فقط

export const phoneSchema = z
  .string({ message: 'Téléphone requis' })
  .trim()
  .regex(/^\+?\d{8,15}$/, 'Numéro de téléphone invalide')
  .max(16);

export const firebaseIdSchema = z
  .string({ message: 'Identifiant requis' })
  .trim()
  .regex(/^[a-zA-Z0-9]{1,128}$/, 'Identifiant invalide'); // معرفات Firestore آمنة (بدون `/` أو أحرف التحكم)

export const orderIdSchema = firebaseIdSchema;

export const promoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,24}$/, 'Code promo invalide');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Mot de passe trop long')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir un chiffre');

export const quantitySchema = z
  .number({ message: 'Quantité invalide' })
  .int('Quantité entière requise')
  .positive('Quantité positive requise')
  .max(100_000, 'Quantité trop grande');

export const moneySchema = z
  .number({ message: 'Montant invalide' })
  .finite('Montant invalide')
  .nonnegative('Montant non négatif')
  .max(100_000_000, 'Montant trop grand');

/** تحوّل رقمي آمن: يقبل "12" أو 12 ويأبى NaN/Infinity والسلاسل العشوائية. */
export const numericString = z
  .union([z.number().finite(), z.string().trim().regex(/^\d+(\.\d+)?$/, 'Valeur numérique invalide')])
  .transform((v) => Number(v));

/** نص حرّ آمن للتخزين: يرفض وسوم HTML ورموز التحكم ويحدّ الطول. */
export const textSchema = (max = 1000, label = 'Texte') =>
  z
    .string({ message: `${label} requis` })
    .trim()
    .min(1, `${label} requis`)
    .max(max, `${label} trop long`)
    .refine((s) => !/[<>{}]/u.test(s), { message: `${label} contient des caractères non autorisés` });

/** أسماء مسار آمنة لقوالب Firestore / معرفات مدمجة. */
export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9\-_]+$/i, 'Slug invalide')
  .max(64);

// ---------------------------------------------------------------
// نتيجة تحليل آمنة
// ---------------------------------------------------------------

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: z.ZodError<T> };

/**
 * تحليل نص JSON خام إلى مخطط — يبتلع أخطاء JSON (400) وأخطاء التحقق (422).
 * الاستخدام: `const parsed = parseBody<CreateOrderInput>(body, orderSchema);`
 */
export function parseBody<T extends z.ZodTypeAny>(
  body: unknown,
  schema: T
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: result.error as unknown as z.ZodError<z.infer<T>> };
}

// ---------------------------------------------------------------
// مخططات مركّبة جاهزة للاستخدام في المسارات
// ---------------------------------------------------------------

/** مخطط تطبيق رمز إحالة من نموذج تسجيل. */
export const applyReferralSchema = z.object({
  referralCode: z.string().trim().min(4).max(24),
});

/** مخطط إنشاء طلب عربون مخصّص. */
export const depositRequestSchema = z.object({
  orderId: orderIdSchema,
  requestedDeposit: moneySchema,
  reason: textSchema(500, 'Raison'),
});

/** مخطط إدخال رقم هاتف للتحقق. */
export const phoneRequestSchema = z.object({
  phone: phoneSchema,
});

/** مخطط البحث عن كود خصم أثناء السلة. */
export const promoApplySchema = z.object({
  code: promoCodeSchema,
});

/** مخطط إدخال وصفة الدفع (باريدي موب) — يُستخدم في verify-receipt. */
export const receiptSchema = z.object({
  orderId: orderIdSchema,
  txId: z.string().trim().regex(/^\d{5,22}$/, 'Numéro de transaction invalide'),
  ripSender: z.string().trim().regex(/^[0-9\s]{0,26}$/).optional().or(z.literal('')),
  paymentProofUrl: z.string().url().max(1024).optional().or(z.literal('')),
});
