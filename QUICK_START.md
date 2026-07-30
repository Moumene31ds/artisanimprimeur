# 🚀 دليل البدء السريع

## الملفات المهمة

### 1️⃣ خدمات الدفع (Stripe)
```
src/lib/payment-services-stripe.ts    - تطبيق خدمات Stripe
src/lib/payment-types.ts              - أنواع البيانات
src/app/api/payment/stripe/route.ts   - إنشاء جلسة الدفع
```

**مثال الاستخدام:**
```typescript
import { createStripeSession } from '@/lib/payment-services-stripe';

const session = await createStripeSession({
  orderId: 'order123',
  amount: 5000, // بالسنتات
  customerEmail: 'customer@example.com'
});

window.location.href = session.url;
```

---

### 2️⃣ تقسيم العملاء والتحليلات
```
src/lib/segmentation-types.ts              - تعريفات القطاعات
src/lib/segmentation-service.ts            - منطق RFM والتقسيم
src/app/api/analytics/segmentation/route.ts - API للإحصائيات
```

**مثال الاستخدام:**
```typescript
import { createOrUpdateCustomerProfile, getSegmentationAnalytics } from '@/lib/segmentation-service';

// تحديث ملف العميل
await createOrUpdateCustomerProfile({
  userId: 'user123',
  email: 'user@example.com',
  lastPurchaseDate: new Date(),
  orderCount: 5,
  totalSpent: 1500 // بالعملة
});

// الحصول على الإحصائيات
const analytics = await getSegmentationAnalytics();
console.log(analytics.segments); // توزيع القطاعات
```

---

### 3️⃣ مكونات React

**PaymentForm (نموذج الدفع)**
```tsx
import { PaymentForm } from '@/components/PaymentForm';

<PaymentForm
  amount={5000}
  customerEmail="customer@example.com"
  onSuccess={() => navigate('/success')}
  onError={(err) => console.error(err)}
/>
```

**SegmentationDashboard (لوحة التحكم)**
```tsx
import { SegmentationDashboard } from '@/components/SegmentationDashboard';

<SegmentationDashboard userId="admin123" />
```

**CustomerInsights (ملف العميل)**
```tsx
import { CustomerInsights } from '@/components/CustomerInsights';

<CustomerInsights customerId="customer123" />
```

---

## متغيرات البيئة المطلوبة

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (موجودة بالفعل)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
```

---

## API Endpoints

### الدفع
- `POST /api/payment/stripe` - إنشاء جلسة
- `POST /api/payment/refund` - استرجاع مبلغ
- `GET /api/payment/transactions` - سجل العمليات

### التحليلات
- `GET /api/analytics/segmentation` - بيانات التقسيم
- `GET /api/analytics/customer-insights?userId=X` - رؤى العميل

---

## القطاعات الستة

| القطاع | الوصف | معايير |
|--------|-------|---------|
| VIP 👑 | عملاء أساسيون | إنفاق >5000€ |
| High Value 💎 | ذوو قيمة | متوسط >200€ |
| Regular ⭐ | نشطون | إنفاق متوازن |
| New 🆕 | جدد | أول طلب |
| At Risk ⚠️ | معرضون | 90-180 يوم |
| Inactive 😴 | غير نشطين | >180 يوم |

---

## خطوات الدمج

### 1. صفحة الدفع
```tsx
// app/checkout/page.tsx
import { PaymentForm } from '@/components/PaymentForm';

export default function CheckoutPage() {
  return (
    <div>
      <h1>الدفع</h1>
      <PaymentForm amount={5000} />
    </div>
  );
}
```

### 2. لوحة التحكم
```tsx
// app/admin/analytics/page.tsx
import { SegmentationDashboard } from '@/components/SegmentationDashboard';

export default function AnalyticsPage() {
  return <SegmentationDashboard userId="admin" />;
}
```

### 3. ملف العميل
```tsx
// app/customer/profile/page.tsx
import { CustomerInsights } from '@/components/CustomerInsights';

export default function ProfilePage({ params }: { params: { id: string } }) {
  return <CustomerInsights customerId={params.id} />;
}
```

---

## ملفات التوثيق الإضافية

- **PAYMENT_SYSTEM.md** - توثيق شامل للنظام
- **ADVANCED_FEATURES.md** - ميزات متقدمة
- **SYSTEM_SUMMARY.md** - ملخص العمل المنجز
