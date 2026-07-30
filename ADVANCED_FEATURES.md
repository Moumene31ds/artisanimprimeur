# 🚀 النظام المتقدم - Artisan Imprimeur

## 📊 الميزات الجديدة المضافة

### ✅ نظام الدفع (Stripe فقط)
- **جلسات دفع آمنة** - تشفير كامل
- **معالجة الويبهوك** - تحديثات فورية للحالة
- **إدارة المبالغ المسترجعة** - معالجة كاملة
- **سجل المعاملات** - تتبع شامل

### 📈 نظام التقسيم والتحليل المتقدم
- **تقسيم العملاء التلقائي** - 6 أنواع من الأقسام
- **تحليل RFM** - تقييم قيمة العملاء
- **رؤى ذكية** - توصيات مخصصة
- **لوحات تحكم تحليلية** - مؤشرات الأداء الرئيسية
- **التنبؤات** - توقع الإيرادات والنمو

## 🗑️ ما تم حذفه

- ❌ **PayPal** - تم إزالة جميع التكاملات والملفات
- ❌ **Chargily Pay** - تم إزالة جميع التكاملات والملفات

---

## 📁 هيكل المشروع الجديد

```
src/
├── lib/
│   ├── payment-services-stripe.ts     # خدمات Stripe
│   ├── payment-types.ts                # أنواع البيانات
│   ├── transaction-db.ts               # إدارة قاعدة البيانات
│   ├── segmentation-types.ts           # أنواع التقسيم
│   └── segmentation-service.ts         # خدمات التقسيم
│
├── app/api/
│   ├── payment/
│   │   ├── stripe/route.ts            # إنشاء جلسة Stripe
│   │   ├── refund/route.ts            # معالجة المبالغ المستردة
│   │   ├── transactions/route.ts      # سجل المعاملات
│   │   └── webhooks/stripe/route.ts   # أحداث Stripe
│   │
│   └── analytics/
│       ├── segmentation/route.ts      # بيانات التقسيم
│       └── customer-insights/route.ts # الرؤى الشخصية
│
└── components/
    ├── PaymentForm.tsx                 # نموذج الدفع
    ├── PaymentMethodSelector.tsx       # اختيار الدفع
    ├── TransactionHistory.tsx          # السجل
    ├── PaymentAnalytics.tsx            # تحليلات الدفع
    ├── SegmentationDashboard.tsx       # لوحة التقسيم
    └── CustomerInsights.tsx            # رؤى العملاء
```

---

## 🔧 البدء السريع

### 1. تثبيت الحزم المطلوبة

```bash
npm install stripe recharts
```

### 2. تكوين متغيرات البيئة

```bash
# انسخ .env.example إلى .env.local
cp .env.example .env.local

# أضف مفاتيحك من Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. استخدام المكونات

#### عرض نموذج الدفع

```tsx
import { PaymentForm } from '@/components/PaymentForm';

export default function CheckoutPage() {
  return (
    <PaymentForm
      orderId="ORDER-001"
      amount={99.99}
      currency="USD"
      customerName="John Doe"
      customerEmail="john@example.com"
      onSuccess={(data) => console.log('Payment successful!', data)}
      onError={(error) => console.log('Payment failed!', error)}
    />
  );
}
```

#### عرض تحليل العملاء

```tsx
import { SegmentationDashboard } from '@/components/SegmentationDashboard';

export default function AnalyticsPage() {
  return <SegmentationDashboard />;
}
```

#### عرض رؤى عميل محدد

```tsx
import { CustomerInsights } from '@/components/CustomerInsights';

export default function CustomerPage({ params }) {
  return <CustomerInsights userId={params.userId} />;
}
```

---

## 📊 نقاط النهاية (API)

### الدفع

```bash
# إنشاء جلسة دفع
POST /api/payment/stripe
Content-Type: application/json

{
  "orderId": "ORDER-123",
  "amount": 99.99,
  "currency": "USD",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890"
}

# معالجة المبالغ المسترجعة
POST /api/payment/refund
Content-Type: application/json

{
  "transactionId": "tx-123",
  "amount": 50,
  "reason": "Customer request"
}

# الحصول على السجل
GET /api/payment/transactions?userId=user-123
GET /api/payment/transactions?orderId=ORDER-123
GET /api/payment/transactions?transactionId=tx-123
```

### التحليلات

```bash
# البيانات التحليلية الشاملة
GET /api/analytics/segmentation?action=analytics

# عملاء قطاع محدد
GET /api/analytics/segmentation?action=segment&segment=vip

# جميع العملاء
GET /api/analytics/segmentation

# رؤى شخصية لعميل
GET /api/analytics/customer-insights?userId=user-123
```

---

## 🎯 أقسام العملاء

### الأنواع الستة:

| القسم | الوصف | الحد الأدنى |
|------|-------|----------|
| **VIP** | عملاء عالي القيمة جداً | 5000€ إجمالي |
| **High Value** | قيمة عالية | 2000€ أو متوسط 200€ |
| **Regular** | عملاء عاديون | نشطون |
| **New** | عملاء جدد | أول طلبية |
| **At Risk** | معرضون للمغادرة | 90-180 يوم بدون نشاط |
| **Inactive** | غير نشطين | +180 يوم |

---

## 📈 مؤشرات الأداء الرئيسية

### البيانات المتوفرة:

- 👥 **إجمالي العملاء** - العدد الكلي
- 🟢 **العملاء النشطون** - آخر 180 يوم
- 📉 **معدل التراجع** - نسبة المغادرين
- 💰 **القيمة الدائمة (LTV)** - متوسط الإنفاق
- 🛒 **متوسط الطلبية** - قيمة كل طلبية
- 📊 **التنبؤات** - الإيرادات والنمو

---

## 🔐 الأمان

### تدابير الحماية المطبقة:

✅ **مفاتيح API سرية على الخادم فقط**
✅ **التحقق من توقيع Webhook**
✅ **تشفير HTTPS إلزامي**
✅ **عزل البيانات حسب المستخدم**
✅ **معالجة آمنة للأخطاء**

---

## 🚀 حالات الاستخدام

### 1. حملات تسويقية مستهدفة

```typescript
// الحصول على عملاء VIP
const vipCustomers = await getCustomersBySegment('vip');

// إرسال عروض حصرية
vipCustomers.forEach(customer => {
  sendExclusiveOffer(customer.email);
});
```

### 2. منع فقدان العملاء

```typescript
// عملاء معرضون للمخاطر
const atRisk = await getCustomersBySegment('at_risk');

// عروض الاحتفاظ
atRisk.forEach(customer => {
  sendRetentionOffer(customer, { discount: 20 });
});
```

### 3. تحسين القيمة الدائمة

```typescript
// عملاء جدد - متابعة شخصية
const newCustomers = await getCustomersBySegment('new');

newCustomers.forEach(customer => {
  sendWelcomeEmail(customer);
  scheduleFollowUp(customer);
});
```

---

## 📝 أمثلة API

### إنشاء جلسة دفع

```bash
curl -X POST http://localhost:3000/api/payment/stripe \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER-123",
    "amount": 99.99,
    "currency": "USD",
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }'
```

### الحصول على بيانات التقسيم

```bash
curl -X GET "http://localhost:3000/api/analytics/segmentation?action=analytics"
```

### الحصول على عملاء VIP

```bash
curl -X GET "http://localhost:3000/api/analytics/segmentation?action=segment&segment=vip"
```

---

## 🧪 الاختبار

### في بيئة التطوير:

1. استخدم مفاتيح الاختبار من Stripe
2. استخدم بطاقات الاختبار:
   - `4242 4242 4242 4242` - دفع ناجح
   - `4000 0000 0000 0002` - دفع مرفوض

### في الإنتاج:

1. استبدل مفاتيح الاختبار بمفاتيح الإنتاج
2. فعّل التحقق من الويبهوك
3. اختبر كل حالات الاستثناء

---

## 🔄 مسار تطور المشروع

### ما تم إضافته:
- ✅ نظام دفع Stripe كامل
- ✅ نظام تقسيم العملاء المتقدم
- ✅ تحليل RFM
- ✅ لوحات تحكم تحليلية
- ✅ رؤى ذكية مخصصة

### المخطط مستقبلاً:
- 🔜 حملات بريد إلكتروني مؤتمتة
- 🔜 برامج ولاء ديناميكية
- 🔜 A/B testing للعروض
- 🔜 التنبؤ بـ ML
- 🔜 دعم العملات المتعددة

---

## 📞 الدعم

**البريد الإلكتروني:** imprimeurlartisan@gmail.com
**الهاتف:** +213549179000
**وثائق Stripe:** https://stripe.com/docs
**Firebase:** https://firebase.google.com/docs

---

## 📄 الترخيص

جميع الملفات المضافة موجودة في المشروع وجاهزة للاستخدام.

---

**تم الإنشاء بواسطة:** GitHub Copilot
**التاريخ:** 07/06/2026
**الإصدار:** 1.0.0
