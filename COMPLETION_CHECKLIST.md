# ✅ قائمة التحقق من الإنجاز

## 🎯 المطلبات الأساسية

### ✅ الحذف الكامل (لا يوجد أي مزود دفع إلكتروني)

- [x] حذف PayPal تماماً (ملفات، API routes، واجهات، استيرادات)
- [x] حذف Chargily Pay تماماً (ملفات، API routes، واجهات، استيرادات)
- [x] حذف Stripe تماماً (ملفات، API routes، واجهات، استيرادات)
- [x] `src/config/index.ts` نظيف: `payment.method = 'cod'` فقط
- [x] الدفع حصرياً عند الاستلام (COD) + تحقق يدوي من وصل الدفع عبر `/api/payments/verify-receipt`

### ✅ الميزات الجديدة المتقدمة

- [x] مكتبات الحالة والتتبع الموحّدة
  - [x] `src/lib/order-status.ts`: قائمة `ORDER_STATUSES` (8 مراحل + Annulé)، `getStepIndex`، `isCompleted/isCancelled/isActive`، `statusLabel`، `buildStatusHistory` (إضافة + تقليم عند التراجع)، `formatDate/formatDateTime`
  - [x] `src/lib/phone-utils.ts`: `isValidDzPhone`، `formatWhatsAppPhone` (+213)، `toLocalDzPhone`
  - [x] اختبارات ناجحة: `order-status.test.ts` + `phone-utils.test.ts` (10/10)

- [x] نظام إخطارات الطلب الموحّد
  - [x] `src/app/api/orders/notify/route.ts`: واتساب + بريد عند الإنشاء/تغيير الحالة/BAT/الجاهزية، مع تحديد معدل طلبات
  - [x] `src/lib/automation-executor.ts`: تنفيذ أتمتة التسويق (send_whatsapp/send_email/webhook) من الخادم بتوكن الزبون
  - [x] `src/lib/email-service.ts`: `sendSimpleEmail` + `sendOrderStatusEmail`
  - [x] السلة تربط الإشعارات تلقائياً بعد إنشاء الطلب (fire-and-forget)

- [x] سجل `statusHistory` لكل طلب (يُنشأ عند الطلب ويُحدَّث عند كل انتقال حالة)

- [x] قواعد Firestore
  - [x] فتح `get` على `/orders/{orderId}` لتقاسم الفواتير عبر QR
  - [x] قواعد التسويق: `marketing_campaigns`، `marketing_automations`، `marketing_customers`، `marketing_predictions`

- [ ] النظام المتقدم التالي (قيد التنفيذ):
  - [x] لوحة تتبع الطلبات الزمنية للزبون (`/orders` + `statusHistory` + `StatusTimeline`)
  - [x] ربط التوصيات الذكية `SmartCartUpsell` بطبقة AI (`/api/recommendations` + fallback كلاسيكي)
  - [x] محرّك إرسال فعلي للحملات التسويقية:
    - `src/lib/campaign-engine.ts` (تخصيص قوالب، اختيار قناة حسب التفضيلات، إرسال Email/WhatsApp/Push)
    - `src/lib/marketing-recipients.ts` (بناء المستلمين حسب القطاع عبر Firestore REST)
    - `POST /api/marketing/send` (إرسال فوري بمصادقة المشرف + سجل + تحديث المقاييس)
    - `GET /api/marketing/campaigns` (سرد/جلب/تحديث الحملات بمصادقة المشرف)
    - `GET /api/marketing/send-logs` (مراجعة سجل الإرسال)
    - `GET /api/cron/campaigns` (الحملات المجدولة — يتطلب `FIREBASE_SERVICE_ACCOUNT`)
    - لوحة التسويق: زر "إرسال الحملة" حقيقي + ملخص النتائج
  - [ ] إعادة هندسة الشحن حسب الوزن/السعر
  - [ ] تحويل الفاتورة QR إلى PDF (jspdf)
