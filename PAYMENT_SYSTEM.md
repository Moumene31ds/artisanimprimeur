# نظام الدفع والتحليلات المتقدم - التوثيق

## 📋 نظرة عامة

تم تطوير نظام متكامل يجمع بين:
- ✅ **نظام دفع Stripe** - آمن وموثوق
- ✅ **تحليل وتقسيم العملاء المتقدم** (Customer Segmentation)
- ✅ **تحليل RFM** - تقييم قيمة العملاء
- ✅ **رؤى وتوصيات ذكية** - مخصصة لكل عميل
- ✅ **لوحة تحكم تحليلية** - مؤشرات الأداء الرئيسية

## 🗑️ ما تم حذفه

- ❌ **PayPal** - تم إزالة كل التكاملات
- ❌ **Chargily Pay** - تم إزالة كل التكاملات
- ✅ تم تنظيف جميع الملفات والمراجع المرتبطة

## 📁 هيكل الملفات الجديد

```
src/
├── lib/
│   ├── payment-services-stripe.ts     # خدمات Stripe فقط
│   ├── payment-types.ts               # أنواع البيانات
│   ├── transaction-db.ts              # إدارة قاعدة البيانات
│   ├── segmentation-types.ts          # أنواع التقسيم
│   └── segmentation-service.ts        # خدمات التقسيم
├── app/api/
│   ├── payment/
│   │   ├── stripe/route.ts           # إنشاء جلسة Stripe
│   │   ├── refund/route.ts           # معالجة المبالغ المستردة
│   │   ├── transactions/route.ts     # الحصول على السجل
│   │   └── webhooks/stripe/route.ts  # معالجة أحداث Stripe
│   └── analytics/
│       ├── segmentation/route.ts     # البيانات التحليلية
│       └── customer-insights/route.ts # الرؤى الشخصية
└── components/
    ├── PaymentForm.tsx                # نموذج الدفع
    ├── PaymentMethodSelector.tsx      # اختيار طريقة الدفع (Stripe فقط)
    ├── TransactionHistory.tsx         # السجل
    ├── PaymentAnalytics.tsx           # التحليلات
    ├── SegmentationDashboard.tsx      # لوحة تحكم التقسيم
    └── CustomerInsights.tsx           # الرؤى الذكية
```

## 🎯 ميزات التقسيم والتحليل

### 1. **التقسيم التلقائي للعملاء**

#### أنواع الأقسام:
- **VIP** - عملاء عالي القيمة (أكثر من 5000€ إجمالي)
- **Regular** - عملاء منتظمون
- **High Value** - ذو قيمة عالية
- **New** - عملاء جدد (أول طلبية فقط)
- **Inactive** - غير نشطين (أكثر من 180 يوماً)
- **At Risk** - معرضون للمغادرة (90-180 يوم)

### 2. **تحليل RFM**

```typescript
// Recency: عدد الأيام منذ آخر عملية شراء
// Frequency: عدد الطلبيات
// Monetary: المبلغ الإجمالي المنفق

const rfmScore = (recency + frequency + monetary) / 3; // 1-5
```

**الأقسام:**
- Champions: 4.5+ (أفضل العملاء)
- Loyal: 4+ (عملاء مخلصون)
- Potential: 3+ (بإمكان تطويرهم)
- At Risk: 2+ (معرضون للمغادرة)
- Lost: <2 (فقدناهم)

### 3. **درجة المخاطر (Risk Score)**

- 0-20: منخفض جداً
- 20-40: منخفض
- 40-70: متوسط
- 70-100: مرتفع جداً

## 🔌 نقاط النهاية (API Endpoints)

### الدفع (Stripe فقط)

```bash
# إنشاء جلسة دفع
POST /api/payment/stripe
{
  "orderId": "ORDER-123",
  "amount": 99.99,
  "currency": "USD",
  "customerName": "John Doe",
  "customerEmail": "john@example.com"
}

# معالجة المبالغ المستردة
POST /api/payment/refund
{
  "transactionId": "tx-123",
  "amount": 50,
  "reason": "Customer request"
}

# الحصول على السجل
GET /api/payment/transactions?userId=user-123
GET /api/payment/transactions?orderId=ORDER-123
```

### التحليلات والتقسيم

```bash
# البيانات التحليلية الشاملة
GET /api/analytics/segmentation?action=analytics

# عملاء قطاع معين
GET /api/analytics/segmentation?action=segment&segment=vip

# جميع العملاء
GET /api/analytics/segmentation

# رؤى شخصية لعميل
GET /api/analytics/customer-insights?userId=user-123
```

## 📊 المكونات المرئية

### 1. **لوحة التحكم الرئيسية (SegmentationDashboard)**

```tsx
<SegmentationDashboard
  title="تحليل وتقسيم العملاء"
/>
```

**المميزات:**
- مؤشرات الأداء الرئيسية (KPIs)
- توزيع الأقسام (Pie Chart)
- التنبؤات والنمو
- تفاصيل كل قطاع

### 2. **رؤى العميل (CustomerInsights)**

```tsx
<CustomerInsights userId="user-123" />
```

**المميزات:**
- ملف تعريفي شامل
- تحليل RFM
- رؤى ذكية
- توصيات مخصصة
- درجة المخاطر

### 3. **نموذج الدفع (PaymentForm)**

```tsx
<PaymentForm
  orderId="ORDER-123"
  amount={99.99}
  currency="USD"
  customerName="John Doe"
  customerEmail="john@example.com"
  onSuccess={(data) => console.log(data)}
/>
```

### 4. **السجل (TransactionHistory)**

```tsx
<TransactionHistory
  userId="user-123"
/>
```

## 🔐 الأمان

### متطلبات البيئة

```env
# Stripe فقط
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# التطبيق
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### تدابير الأمان

✅ مفاتيح API السرية على الخادم فقط
✅ التحقق من توقيع Webhook
✅ تشفير HTTPS إلزامي
✅ عزل البيانات حسب المستخدم
✅ التحقق من الأذونات

## 📈 حالات الاستخدام

### 1. **حملات التسويق المستهدفة**

```typescript
// الحصول على عملاء VIP
const vipCustomers = await getCustomersBySegment('vip');

// إرسال عروض حصرية
vipCustomers.forEach(customer => {
  sendEmail(customer.email, 'exclusive_offer');
});
```

### 2. **منع الفقدان (Churn Prevention)**

```typescript
// عملاء معرضون للمخاطر
const atRiskCustomers = await getCustomersBySegment('at_risk');

// عرض حوافز للبقاء
atRiskCustomers.forEach(customer => {
  sendRetention(customer, { discount: 20 });
});
```

### 3. **تحسين القيمة الدائمة (LTV)**

```typescript
// جدد أولاً، بعد ذلك محتملون
const newCustomers = await getCustomersBySegment('new');

// برنامج المتابعة الشخصية
newCustomers.forEach(customer => {
  startFollowUp(customer);
});
```

## 🚀 الإحصائيات المتقدمة

### البيانات المتوفرة

- **إجمالي العملاء**: العدد الكلي
- **العملاء النشطون**: آخر 180 يوم
- **معدل التراجع**: العملاء الغير نشطين
- **القيمة الدائمة (LTV)**: متوسط الإنفاق مدى الحياة
- **متوسط الطلبية**: متوسط قيمة كل طلبية
- **التنبؤات**: الإيرادات والنمو المتوقع

### المؤشرات المحسوبة

```typescript
// درجة الخطر
riskScore = (daysSinceLastOrder / 365) * 100;

// تقييم RFM
rfmScore = (recencyScore + frequencyScore + monetaryScore) / 3;

// معدل الحفظ
retentionRate = (activeCustomers / totalCustomers) * 100;

// القيمة الدائمة
ltv = totalRevenue / numberOfCustomers;
```

## 📝 أمثلة الاستخدام

### 1. **عرض لوحة التحكم التحليلية**

```tsx
import { SegmentationDashboard } from '@/components/SegmentationDashboard';

export default function AdminPage() {
  return <SegmentationDashboard />;
}
```

### 2. **عرض رؤى العميل**

```tsx
import { CustomerInsights } from '@/components/CustomerInsights';

export default function CustomerPage({ params }) {
  return <CustomerInsights userId={params.userId} />;
}
```

### 3. **الحصول على البيانات برمجياً**

```typescript
import { getSegmentationAnalytics, getCustomersBySegment } from '@/lib/segmentation-service';

const analytics = await getSegmentationAnalytics();
const vipCustomers = await getCustomersBySegment('vip');
```

## 🔄 تحديث البيانات

يتم تحديث بيانات التقسيم تلقائياً عند:
- إنشاء عميل جديد
- إكمال طلبية جديدة
- تحديث معلومات العميل

```typescript
// تحديث ملف تعريفي للعميل
const profile = await createOrUpdateCustomerProfile({
  userId: 'user-123',
  email: 'john@example.com',
  totalSpent: 1500,
  orderCount: 3,
  // ...
});
```

## 🎯 المؤشرات الرئيسية

| المؤشر | الهدف | التحذير |
|--------|-------|--------|
| معدل النمو | >10% شهرياً | <5% |
| تحويل جديد إلى منتظم | >50% | <30% |
| الاحتفاظ بـ VIP | >95% | <80% |
| الحد من الخسارة | <10% | >20% |

## 🔮 الميزات المستقبلية

- [ ] التنبؤ بالعملاء من أفضل العملاء باستخدام ML
- [ ] حملات بريد إلكتروني مؤتمتة
- [ ] برامج الولاء الديناميكية
- [ ] A/B testing للعروض
- [ ] توقع القيمة الدائمة
- [ ] تصنيف المخاطر الآلي

## 📞 الدعم والمساعدة

- **وثائق Stripe**: https://stripe.com/docs
- **Firebase Firestore**: https://firebase.google.com/docs/firestore
- **البريد الإلكتروني**: imprimeurlartisan@gmail.com
- **الهاتف**: +213549179000

