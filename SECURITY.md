# SECURITY.md — طبقة الحماية المتقدمة (L'Artisan Imprimeur)

المنظومة الأمنية موزّعة على ملفات منفصلة كي تبقى قابلة للاختبار والإدارة:

| الطبقة | الملف | الوظيفة |
|--------|-------|---------|
| **Middleware / Network** | `middleware.ts` | تطبيق الرؤوس، كشف الطلبات المشبوهة، تقييد المعدل، فحص Origin/CSRF |
| **Security Utility** | `src/lib/security/index.ts` | رؤوس الأمان + CSP + كشف الأنماط + التعقيم |
| **Security Utility** | `src/lib/security/csrf.ts` | CSRF (Sec-Fetch-Site / Origin / Double-Submit) |
| **Security Utility** | `src/lib/security/cors.ts` | CORS صارم بلا Wildcard |
| **Security Utility** | `src/lib/security/redis-rate-limit.ts` | تقييد معدل موزّع (Upstash) مع تراجع للذاكرة |
| **Security Utility** | `src/lib/security/schemas.ts` | مخططات Zod لكل المدخلات |
| **Security Utility** | `src/lib/security/passwords.ts` | تجزئة scrypt بملح عالي (Node-only) |
| **Security Utility** | `src/lib/security/api-error.ts` | إخفاء الأخطاء + سجل تدقيق |
| **Server Config** | `next.config.js` | رؤوس HTTP على مستوى الخادم |
| **Database Layer** | `firestore.rules` | قواعد Firestore (RBAC/ABAC) |
| **Auth** | `src/lib/auth-verify.ts` + `src/lib/admin-auth.ts` | تحقق Bearer Token + RBAC للمشرفين |

---

## 1. تغطية المتطلبات

### Headers & Network
- `applySecurityHeaders()` في `index.ts` يضيف: **CSP** (قابل للتجاوز عبر `CSP_POLICY`)، **HSTS** مع `preload`، `X-Frame-Options: DENY`، `X-Content-Type-Options: nosniff`، `COOP`، `CORP`، `Referrer-Policy`، `Permissions-Policy`.
- **CORS**: `cors.ts` يعكس Origin المصرّح به فقط من `CORS_ALLOWED_ORIGINS` + `NEXT_PUBLIC_APP_URL`، مع `Vary: Origin` ومنع `*`.
- **Server Info**: لا نرسل `x-powered-by`/تفاصيل الخادم؛ على Vercel رأس `Server` يُدار مركزيّاً (غير قابل للإزالة من طبقة التطبيق).

### Authentication & Authorization
- Firebase ID Token في رأس `Authorization`، تحقق توقيعه في `auth-verify.ts`.
- RBAC للمشرفين عبر `requireAdmin()` (قائمة `ADMIN_EMAILS`).
- ABAC عبر `firestore.rules` (ملكية الوثيقة + القيود حسب الحقول).
- تقييد معدل للمصادقة/الدفع: `ROUTE_RATE_LIMITS` في `index.ts` + `verifyReceiptLimiter` في `rate-limit.ts`، وتقييد موزّع عبر `UPSTASH_REDIS_REST_URL`.

### Input Validation
- `schemas.ts` (Zod) لكل المدخلات: `receiptSchema`, `phoneSchema`, `nameSchema`, `emailSchema`...
- `sanitizeTextInput`, `sanitizeObject` (يمنع مفاتيح NoSQL `$`/`.`/`__proto__` ويحدّ العمق).
- `isSuspiciousRequest` يفحص المسار **المفكوك الترميز أيضاً** (منع الالتفاف بـ `%20OR%201=1`).

### Data Protection
- `passwords.ts`: scrypt `N=2^17, r=8, p=1` + ملح 16 بايت + مقارنة `timingSafeEqual`.
- الأسرار عبر `.env*` (معزولة في `.gitignore`) — لا تُقرأ المفاتيح من الكود.
- TLS 1.3 + HSTS preload عبر الخادم/Vercel.

### API & Edge
- WAF بأنماط OWASP Top 10 في `isSuspiciousRequest` + حجب ماسحات معروفة.
- حدود حمولات: `upload/route.ts` يرفض `content-length` الضخم قبل القراءة (منع DoS)، و`verify-receipt` يحدّ حجم الصورة.
- `api-error.ts` يُخفي كل خطأ داخلي (لا تسريب Stack)، ويسجّل في `securityLogs` عبر `audit.ts`.

---

## 2. المتغيرات البيئية الواجب ضبطها

```
# الصلاحيات/السماح
CORS_ALLOWED_ORIGINS=https://yoursite.com          # قائمة النطاقات المصرّح بها
NEXT_PUBLIC_APP_URL=https://yoursite.com
ADMIN_EMAILS=admin1@gmail.com,admin2@gmail.com
NEXT_PUBLIC_BYPASS_KEY=                           # اتركه فارغاً لتعطيل تجاوز الصيانة

# تقييد معدل موزّع (اختياري — Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# CSP مخصص صارم (اختياري — يتجاوز الافتراضي)
CSP_POLICY=default-src 'self'; object-src 'none'; ...

# تفعيل فرض CSRF الكامل (يتطلب إرسال x-csrf-token من العميل)
ENFORCE_CSRF_TOKEN=false

# Firebase App Check (اختياري — حماية الروبوتات، reCAPTCHA v3 مجاني)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
REQUIRE_APP_CHECK=false          # true = رفض صارم للطلبات بلا رمز App Check

# توقيع ويب هوك WhatsApp (X-Hub-Secret-256) — يُنصح به بشدة في الإنتاج
WHATSAPP_APP_SECRET=

# رمز تصحيح App Check للتطوير المحلي فقط
NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=
```

### 2.1 الطبقات الأمنية الجديدة (2026-08)

| الطبقة | الموقع | ملاحظات |
|---|---|---|
| توقيع Meta HMAC (timing-safe) | `whatsapp-service.ts` + webhook route | فعّل `WHATSAPP_APP_SECRET` لرفض الأحداث المنتحلة |
| قفل دخول خادمي تصاعدي | `/api/auth/login-guard` + `authLockouts` | مرجعي عبر firebase-admin — لا يمكن تجاوزه بمسح التخزين |
| تقارير انتهاكات CSP | `/api/security/csp-report` → `securityLogs` | إنذار مبكر لمحاولات XSS؛ تظهر في Firestore |
| Firebase App Check | `firebase.ts` (عميل) + `app-check.ts` (خادم) | شفاف بدون ضبط؛ `REQUIRE_APP_CHECK=true` للتشديد |
| حماية حقن CSV/Excel | `csv-export.ts` (بديل xlsx) | أزالت مكتبة SheetJS الثغرة (1 critical) نهائياً |

---

## 3. آلية الاختبار ضد الاختراق

### 3.1 الاختبار الآلي
```bash
npm test        # حزمة الأمان (41 اختباراً): WAF، تعقيم، معدل، CSRF، CORS، رؤوس، scrypt، Zod
npm run test:all
npm run build   # يتحقق من تجميع middleware بسلامة
```

### 3.2 فحص الرؤوس يدوياً
```bash
curl -sI https://yoursite.com | grep -iE "strict-transport|content-security|x-frame|x-content-type"
```
توقّع: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`، `X-Frame-Options: DENY`، `X-Content-Type-Options: nosniff`، وCSP تحتوي `frame-ancestors`.

### 3.3 اختبار WAF (الحقن)
```bash
# SQLi
curl -s "https://yoursite.com/api/orders?id=1%20OR%201=1"      # توقّع 403
curl -s "https://yoursite.com/api/orders?id='%20OR%20'1'='1"    # توقّع 403
# XSS عبر المسار
curl -s "https://yoursite.com/%3Cscript%3Ealert(1)%3C/script%3E" # توقّع 403
# Path Traversal
curl -s "https://yoursite.com/../../etc/passwd"                 # توقّع 403
```

### 3.4 اختبار CSRF
```bash
# طلب POST من نطاق خارجي (يمرر Sec-Fetch-Site: cross-site) → توقّع 403
curl -s -X POST https://yoursite.com/api/upload \
  -H "Origin: https://evil.com" -H "Sec-Fetch-Site: cross-site" \
  -H "Content-Type: application/json" -d '{}'   # توقّع 403 Cross-origin request rejected
```

### 3.5 اختبار تقييد المعدل
```bash
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\n" https://yoursite.com/api/auth/login; done
# بعد 10 طلبات في الدقيقة → 429 مع Retry-After
```

### 3.6 اختبار إخفاء الأخطاء
أرسل حمولة تكسر منطق الخادم وتأكد من: رد `{"error":"Internal server error"}` دون تفاصيل/Stack، بينما يظهر السبب في سجلات الخادم و`securityLogs`.

### 3.7 أدوات خارجية
- **OWASP ZAP** (Active Scan) على المسارات العامة — تحقّق من صفر ثغرات XSS/SQLi.
- **nuclei** لتأكيد حجب أسماء الماسحات: `nuclei -u https://yoursite.com` (توقّع عدم إرجاع نتائج حرجة، وحجب طلبات nuclei نفسها 403).
- **sqlmap --level=3** على `/api/geo` (نموذج للاختبار المعزول) — لا تجريه على بيانات حيّة.

### 3.8 اختبار Firestore Rules (Database Layer)
- طبّق القواعد: `firebase deploy --only firestore:rules`.
- تحقّق أن عميلاً غير مسجّل يقرأ `/products` (نعم) و`/users/{other}` (لا).
- تحقّق أن زبوناً لا يستطيع إنشاء كود خصم `percent: 50` (القواعد تقبله فقط للقيم 10/15/20).

---

## 4. طريق الترقية الأمنية (Roadmap)

1. **CSP صارم بالنوانس (Nonces)**: بعد فحص `next dev`، شغّل Next.js CSP nonces وأزل `'unsafe-inline'`/`'unsafe-eval'` من `script-src`.
2. **تفعيل `ENFORCE_CSRF_TOKEN=true`** بعد إضافة `x-csrf-token` في عميل التطبيق (يقرأ قيمة الكعكة عبر endpoint `/api/security` أو مرآة غير HttpOnly).
3. **Redis موزّع** (`UPSTASH_REDIS_REST_URL/TOKEN`) لنقل تقييد المعدل من الذاكرة المحلية إلى حد موحّد عبر كل المثيلات.
4. **خدمة CDN/WAF خارجية** (Cloudflare/Cloud Armor) لطبقة L3/L4 والجغرافية قبل الوصول إلى التطبيق.
5. **تناوب الأسرار** عبر Secret Manager وليس `.env` المحلي عند الإنتاج.
