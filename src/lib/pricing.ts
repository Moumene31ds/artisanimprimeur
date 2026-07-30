// src/lib/pricing.ts

// واجهة لتعريف نظام شرائح الخصم
export interface PricingTier {
  minQty: number;
  discountPercent: number;
}

// يمكنك تعديل الكميات ونسب الخصم بما يتناسب مع أسعار مطبعتك
export const PRICING_TIERS: PricingTier[] = [
  { minQty: 1, discountPercent: 0 },     // من 1 إلى 99 حبة: السعر العادي (0% خصم)
  { minQty: 100, discountPercent: 10 },  // 100 حبة فما فوق: خصم 10%
  { minQty: 500, discountPercent: 15 },  // 500 حبة فما فوق: خصم 15%
  { minQty: 1000, discountPercent: 20 }, // 1000 حبة فما فوق: خصم 20%
];

export function calculateTierPrice(basePrice: number, quantity: number) {
  // 1. البحث عن أعلى شريحة خصم يستحقها العميل بناءً على الكمية
  const sortedTiers = [...PRICING_TIERS].sort((a, b) => b.minQty - a.minQty);
  const currentTier = sortedTiers.find((tier) => quantity >= tier.minQty) || PRICING_TIERS[0];

  const appliedDiscountPercent = currentTier.discountPercent;

  // 2. حساب السعر الفردي للقطعة بعد الخصم
  const discountAmount = (basePrice * appliedDiscountPercent) / 100;
  const finalUnitPrice = basePrice - discountAmount;

  // 3. حساب الإجمالي لهذه المادة في السلة
  const totalItemPrice = finalUnitPrice * quantity;

  // 4. إيجاد الشريحة التالية لتشجيع العميل (Upselling)
  const ascendingTiers = [...PRICING_TIERS].sort((a, b) => a.minQty - b.minQty);
  const nextTierInfo = ascendingTiers.find((tier) => tier.minQty > quantity);

  let nextTier = null;
  if (nextTierInfo) {
    nextTier = {
      neededQty: nextTierInfo.minQty - quantity, // كم حبة تنقصه ليصل للخصم التالي؟
      discountPercent: nextTierInfo.discountPercent, // كم نسبة الخصم القادمة؟
    };
  }

  return {
    totalItemPrice,
    appliedDiscountPercent,
    finalUnitPrice,
    nextTier
  };
}
