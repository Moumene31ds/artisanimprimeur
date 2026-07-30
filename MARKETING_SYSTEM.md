# 📊 نظام التسويق الذكي والحملات - دليل شامل

## نظرة عامة

نظام متكامل لإدارة حملات التسويق الذكية مع:
- ✅ إنشاء وجدولة حملات متعددة القنوات
- ✅ أتمتة تسويقية ذكية
- ✅ تحليل الفرق (Cohort Analysis)
- ✅ نماذج تنبؤية للسلوك
- ✅ تقارير مفصلة للأداء

---

## 🏗️ البنية المعمارية

### الطبقات الرئيسية:

```
src/lib/
├── marketing-types.ts      - أنواع البيانات (30+ واجهة)
└── marketing-service.ts    - الخدمات الأساسية

src/app/api/marketing/
├── campaigns/             - إدارة الحملات
├── automations/           - الأتمتة التسويقية
├── customers/             - بيانات العملاء
├── predictions/           - التنبؤات
└── reports/               - التقارير

src/components/
├── CampaignBuilder.tsx     - منشئ الحملات
└── MarketingDashboard.tsx  - لوحة التحكم
```

---

## 🎯 الميزات الرئيسية

### 1️⃣ إدارة الحملات

**أنواع الحملات:**
- البريد الإلكتروني
- الرسائل النصية
- الإشعارات الفورية
- وسائل التواصل الاجتماعي

**حالات الحملة:**
- مسودة (draft)
- مجدولة (scheduled)
- نشطة (active)
- موقوفة (paused)
- مكتملة (completed)

### 2️⃣ الأتمتة التسويقية

**المحفزات:**
```
- purchase      → عند الشراء
- signup        → عند التسجيل
- abandoned_cart → عند ترك السلة
- milestone     → عند معالم محددة
- inactivity    → عند عدم النشاط
- custom        → محفز مخصص
```

**الإجراءات:**
```
- send_campaign → إرسال حملة
- send_email    → إرسال بريد
- update_tag    → تحديث الوسم
- add_to_segment → إضافة للقطاع
- delay         → تأخير زمني
- webhook       → استدعاء خارجي
```

### 3️⃣ تقسيم الجمهور

**معايير التقسيم:**
```
- all           → جميع العملاء
- premium       → عملاء متميزون
- new           → عملاء جدد
- inactive      → غير نشطين
- high_value    → عالي القيمة
- custom        → مخصص
```

### 4️⃣ النماذج التنبؤية

**أنواع التنبؤ:**

**Churn Prediction:**
```
- يتنبأ باحتمال مغادرة العميل
- بناءً على أيام عدم النشاط والتفاعل
- النتيجة: 0-1 (0=لن يغادر، 1=سيغادر)
```

**LTV Prediction:**
```
- يتنبأ بقيمة العميل مدى الحياة
- بناءً على سجل الشراء
- النتيجة: رقم (القيمة المتوقعة)
```

**Engagement Prediction:**
```
- يتنبأ بمستوى التفاعل
- بناءً على النشاط السابق
- النتيجة: 0-1 (0=منخفض، 1=عالي)
```

**Conversion Prediction:**
```
- يتنبأ بمحتمل الشراء التالي
- بناءً على السلوك والنقرات
- النتيجة: 0-1 (0=منخفض، 1=عالي)
```

### 5️⃣ تحليل الفرق (Cohort)

**قياس الأداء:**
```
- معدل الاحتفاظ (Retention Rate)
- معدل الفقدان (Churn Rate)
- متوسط القيمة مدى الحياة (LTV)
- معدل التحويل (Conversion Rate)
- درجة التفاعل (Engagement Score)
```

---

## 📊 نماذج البيانات

### Campaign (الحملة)
```typescript
{
  id: string;
  name: string;
  description: string;
  type: 'email' | 'sms' | 'push' | 'in_app' | 'social';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  template: CampaignTemplate;
  segmentation: TargetAudience;
  schedule: CampaignSchedule;
  content: CampaignContent;
  performance: CampaignMetrics;
}
```

### MarketingAutomation (الأتمتة)
```typescript
{
  id: string;
  name: string;
  trigger: AutomationTrigger;
  triggerCondition?: Record<string, any>;
  actions: AutomationAction[];
  enabled: boolean;
}
```

### CustomerData (بيانات العميل)
```typescript
{
  id: string;
  userId: string;
  email: string;
  segments: string[];
  tags: string[];
  preferences: CustomerPreferences;
  engagement: EngagementMetrics;
  lastInteraction: Date;
}
```

---

## 🌐 API Endpoints

### الحملات
```bash
# إنشاء حملة
POST /api/marketing/campaigns
{
  "name": "عرض العطلة",
  "type": "email",
  "template": {...},
  "segmentation": {...}
}

# الحصول على الحملات
GET /api/marketing/campaigns
GET /api/marketing/campaigns?id=campaign123
GET /api/marketing/campaigns?status=active
GET /api/marketing/campaigns?type=email

# تحديث الأداء
PUT /api/marketing/campaigns
{
  "campaignId": "campaign123",
  "performance": {
    "sentCount": 5000,
    "openRate": 25.5
  }
}
```

### الأتمتة
```bash
# إنشاء أتمتة
POST /api/marketing/automations
{
  "name": "ترحيب بالعملاء الجدد",
  "trigger": "signup",
  "actions": [...]
}

# الحصول على الأتمتات النشطة
GET /api/marketing/automations
```

### العملاء
```bash
# إنشاء/تحديث ملف عميل
POST /api/marketing/customers
{
  "userId": "user123",
  "email": "user@example.com",
  "firstName": "أحمد",
  "segments": ["premium"]
}

# الحصول على بيانات عميل
GET /api/marketing/customers?userId=user123

# الحصول على عملاء من قطاع معين
GET /api/marketing/customers?segment=premium

# الحصول على إحصائيات شاملة
GET /api/marketing/customers?analytics=true
```

### التنبؤات
```bash
# التنبؤ بسلوك عميل
POST /api/marketing/predictions
{
  "modelType": "churn",
  "userId": "user123"
}

# خيارات modelType:
# - churn: احتمال المغادرة
# - ltv: القيمة مدى الحياة
# - engagement: مستوى التفاعل
# - conversion: احتمال الشراء

GET /api/marketing/predictions?modelType=churn&userId=user123
```

### التقارير
```bash
# إنشاء تقرير حملة
GET /api/marketing/reports?campaignId=campaign123
```

---

## 💻 أمثلة الاستخدام

### 1. إنشاء حملة بريد إلكتروني

```typescript
import { createCampaign } from '@/lib/marketing-service';

const campaignId = await createCampaign({
  name: 'عرض الربيع',
  description: 'عرض خاص للعملاء المتميزين',
  type: 'email',
  status: 'draft',
  template: {
    templateId: 'tmpl_001',
    templateName: 'Spring Offer',
    subject: 'عرض الربيع الخاص',
    body: 'اكتشف أفضل العروض...',
    cta: {
      text: 'اطلب الآن',
      url: 'https://example.com/shop',
      style: 'primary',
      trackingId: 'track_001',
    },
    variables: {},
  },
  segmentation: {
    segmentType: 'premium',
    filters: [],
    excludeSegments: [],
    estimatedReach: 5000,
  },
  schedule: {
    startDate: new Date('2024-03-20'),
    sendTime: '09:00',
    timezone: 'UTC',
    frequency: 'once',
  },
  content: {
    title: 'عرض الربيع',
    contentBlocks: [
      {
        id: 'block_1',
        type: 'text',
        content: 'اكتشف أفضل العروض...',
      },
    ],
  },
  createdBy: 'admin',
});
```

### 2. إعداد أتمتة تسويقية

```typescript
import { createMarketingAutomation } from '@/lib/marketing-service';

const automationId = await createMarketingAutomation({
  name: 'سلسلة ترحيب العملاء الجدد',
  description: 'ترحيب تلقائي مع عروض خاصة',
  trigger: 'signup',
  actions: [
    {
      id: 'action_1',
      type: 'send_email',
      payload: {
        template: 'welcome_email',
        subject: 'أهلاً وسهلاً!',
      },
      order: 1,
    },
    {
      id: 'action_2',
      type: 'delay',
      delay: 1440, // يوم واحد
      order: 2,
    },
    {
      id: 'action_3',
      type: 'send_campaign',
      payload: {
        campaignId: 'welcome_offer',
      },
      order: 3,
    },
  ],
  enabled: true,
});
```

### 3. التنبؤ بسلوك العميل

```typescript
import { predictCustomerBehavior } from '@/lib/marketing-service';

// التنبؤ بخطر المغادرة
const churnPrediction = await predictCustomerBehavior('churn', 'user123');
console.log(`خطر مغادرة: ${(churnPrediction.prediction * 100).toFixed(1)}%`);

// التنبؤ بالقيمة مدى الحياة
const ltvPrediction = await predictCustomerBehavior('ltv', 'user123');
console.log(`القيمة المتوقعة: ${ltvPrediction.prediction.toFixed(2)} €`);
```

### 4. تحليل الفرقة

```typescript
import { createCohort, analyzeCohort } from '@/lib/marketing-service';

const cohortId = await createCohort({
  name: 'عملاء Q1 2024',
  description: 'العملاء الذين اشتروا في الربع الأول',
  criteria: [
    {
      field: 'purchaseDate',
      operator: 'gte',
      value: '2024-01-01',
    },
  ],
  memberCount: 1500,
});

const analysis = await analyzeCohort(cohortId);
console.log(`معدل الاحتفاظ: ${analysis.retentionRate.toFixed(1)}%`);
console.log(`القيمة مدى الحياة: ${analysis.averageLifetimeValue.toFixed(2)} €`);
```

### 5. عرض لوحة التحكم

```tsx
import { MarketingDashboard } from '@/components/MarketingDashboard';

export default function Dashboard() {
  return <MarketingDashboard />;
}
```

---

## 📈 مقاييس الأداء

### KPIs الأساسية
- **Open Rate**: نسبة فتح الرسائل
- **Click Rate**: نسبة النقر على الروابط
- **Conversion Rate**: نسبة التحويل إلى مبيعات
- **Unsubscribe Rate**: نسبة إلغاء الاشتراك
- **Bounce Rate**: نسبة الرسائل المرتدة
- **ROI**: العائد على الاستثمار

### مقاييس التفاعل
- **Engagement Score**: درجة التفاعل (0-100)
- **Email Opens**: عدد فتحات البريد
- **Email Clicks**: عدد النقرات
- **Website Visits**: عدد زيارات الموقع
- **Purchase Count**: عدد المشتريات

---

## 🔒 الأمان والخصوصية

✅ **البيانات محفوظة في Firebase Firestore**
✅ **كل عملية تحتفظ بمعرف المستخدم**
✅ **لا يتم حفظ البيانات الحساسة**
✅ **التوافق مع GDPR**

---

## 🚀 خطوات البدء

1. **إنشاء حملة**:
   - استخدم `CampaignBuilder` أو API
   - حدد النوع والجمهور المستهدف

2. **تعيين الأتمتة**:
   - أضف محفزات وإجراءات
   - فعّل التدفق

3. **مراقبة الأداء**:
   - اعرض لوحة التحكم
   - ادرس التقارير

4. **استخدم التنبؤات**:
   - تنبأ بالسلوك
   - اتخذ قرارات مستنيرة

---

## 📚 الملفات ذات الصلة

- `marketing-types.ts` - التعريفات
- `marketing-service.ts` - الخدمات
- `CampaignBuilder.tsx` - منشئ الحملات
- `MarketingDashboard.tsx` - اللوحة
- API endpoints - `/api/marketing/*`

