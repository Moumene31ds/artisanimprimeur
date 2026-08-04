# 🚀 النظام المتقدم - Artisan Imprimeur

## 💳 نظام الدفع

- **لا يوجد أي مزود دفع إلكتروني** (لا Stripe، لا PayPal، لا Chargily).
- الدفع عند الاستلام (COD) حصرياً: `src/config/index.ts` يثبّت `payment.method = 'cod'`.
- التحقق اليدوي من وصولات الدفع (بريدي موب) عبر `/api/payments/verify-receipt` + سجلات `paymentVerifications` و `receiptTxIds` في Firestore.

## 📈 الميزات المنجزة حديثاً

### 🏷️ مكتبات الحالة والتتبع الموحّدة
- `src/lib/order-status.ts`:
  - `ORDER_STATUSES`: `En attente → Conception → Impression → Découpage → Façonnage → Contrôle qualité → Prêt → Terminé` + `Annulé`
  - `buildStatusHistory` تبني خطاً زمنياً صحيحاً: تلحق المرحلة الجديدة، وتُقصّ المراحل الأحدث عند التراجع، وتحفظ `Annulé` في النهاية.
  - `getStepIndex` يعيد `-1` للـ `Annulé` و`7` للمراحل المكتملة.
- `src/lib/phone-utils.ts`:
  - `isValidDzPhone`: 10 أرقام ببادئة `05|06|07`.
  - `formatWhatsAppPhone`: توحيد أي صيغة → `+213…` (يعالج `00` و`+` و`213`).
- اختبارات Node (tsx) ناجحة: `order-status.test.ts` + `phone-utils.test.ts` — شغّلها عبر:
  `node --import tsx --test src/lib/order-status.test.ts src/lib/phone-utils.test.ts`

### 🔔 نظام إخطارات الطلب الموحّد
- `POST /api/orders/notify` يقبل:
  - `{ type: 'created', order: { id, phone, customerName, customerEmail?, total?, ... } }` → واتساب (قالب تأكيد) + بريد (Resend) + أتمتة التسويق `purchase`.
  - `{ type: 'status', order: { …, status } }` → واتساب + بريد بتحديث الحالة.
  - `{ type: 'bat', order: { …, batUrl } }` → إشعار جاهزية Bon à Tirer.
  - `{ type: 'ready', order: { … } }` → إشعار الجاهزية للاستلام.
- الحماية: `SlidingWindowRateLimiter` (30 طلب / 10 دقائق لكل IP).
- السلة (`/cart`) تستدعيه تلقائياً بعد إنشاء الطلب دون إبطاء مسار الدفع.

### ⚙️ منفّذ الأتمتة التسويقية (الخادم)
- `src/lib/automation-executor.ts` يقرأ `marketing_automations` (بتوكن الزبون عبر `fsQuery`) ويفلتر بالـ `trigger` ثم ينفّذ الإجراءات بالترتيب:
  - `send_whatsapp` → `sendWhatsAppMessage`
  - `send_email` → `sendSimpleEmail` (Resend)
  - `webhook` → `fetch` خارجي
  - `add_to_segment` → مذكور كـ no-op على الخادم (يُدار من لوحة الإدارة)
- عند عدم وجود `RESEND_API_KEY` أو `WHATSAPP_*`، تُسجَّل الرسائل بسلام كـ `skipped` دون فشل الطلب.

### 🚀 محرّك إرسال الحملات الفعلي
- `src/lib/campaign-engine.ts`:
  - `personalize(template, vars)` — استبدال `{{name}}`، `{{firstName}}`، `{{code}}`...
  - `resolveChannel(channel, recipient)` — اختيار القناة الفعلية مع احترام التفضيلات (emailFrequency 'never'، smsOptIn=false، pushOptIn=false). `sms`/`social` → واتساب.
  - `sendToRecipient` / `dispatchCampaign` — إرسال عبر Resend (email)، WhatsApp، أو `/api/push/send` مع تزامن محدود (4) وتجميع `sent/skipped/failed`.
- `src/lib/marketing-recipients.ts` — بناء المستلمين من `marketing_customers` (أو `users` كاحتياط) حسب القطاع: `all/premium/new/inactive/high_value/custom`، عبر Firestore REST بتوكن المشرف.
- API routes:
  - `POST /api/marketing/send` — إرسال فوري بمصادقة المشرف (مثل بقية إدارة Firestore)، يسجّل في `marketing_send_logs` ويحدّث مقاييس الحملة.
  - `GET /api/marketing/campaigns` — سرد/جلب/تحديث الحملات (أُعيدت كتابتها على `firestore-rest` لتشتغل على الخادم).
  - `GET /api/marketing/send-logs` — مراجعة عمليات الإرسال الأخيرة.
  - `GET /api/cron/campaigns` — الحملات المجدولة (status='scheduled' مع بلوغ startDate)؛ يتطلب `FIREBASE_SERVICE_ACCOUNT` JSON في بيئة الخادم، وإلا يعيد `skipped:true` بأمان.
- لوحة التسويق: زر "إرسال الحملة" الحقيقي يرسل للحملة المُولّدة، مع ملخص نتائج (إرسال/تخطي/فشل).

### 🗄️ قواعد Firestore المحدثة
- `get` مفتوح على `/orders/{orderId}` لقراءة الفواتير عبر QR (مع بقاء `list` حصرياً للمالك/المشرف).
- أقسام التسويق الجديدة: `marketing_campaigns`، `marketing_automations`، `marketing_customers`، `marketing_predictions` (قراءة للمسجّلين، كتابة للمشرف، ملف الزبون خاص به).
- سجل الإرسال: `marketing_send_logs` (قراءة/كتابة حصرية للمشرف).

---

## 📁 هيكل الوحدات الجديدة

```
src/
├── lib/
│   ├── order-status.ts        # حالات الطلب + الخط الزمني
│   ├── phone-utils.ts         # أرقام الهواتف الجزائرية / واتساب
│   ├── automation-executor.ts # محرّك تنفيذ الأتمتة التسويقية
│   ├── campaign-engine.ts     # محرّك إرسال الحملات (Email/WhatsApp/Push)
│   ├── marketing-recipients.ts# بناء قائمة المستلمين حسب القطاع
│   ├── email-service.ts       # + sendSimpleEmail / sendOrderStatusEmail
│   └── whatsapp-service.ts    # يستخدم formatWhatsAppPhone الموحّد
│
├── app/api/orders/
│   ├── notify/route.ts        # إشعارات الطلبات الموحّدة
│   └── production/route.ts    # انتقال الحالة + إشعارات
```
