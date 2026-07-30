// أنواع البيانات - نظام التسويق الذكي والحملات

export type CampaignType = 'email' | 'sms' | 'push' | 'in_app' | 'social';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
export type SegmentCriteria = 'all' | 'premium' | 'new' | 'inactive' | 'high_value' | 'custom';
export type AutomationTrigger = 'purchase' | 'signup' | 'abandoned_cart' | 'milestone' | 'inactivity' | 'custom';

// معلومات الحملة الأساسية
export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  template: CampaignTemplate;
  segmentation: TargetAudience;
  schedule: CampaignSchedule;
  content: CampaignContent;
  performance: CampaignMetrics;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// قالب الحملة
export interface CampaignTemplate {
  templateId: string;
  templateName: string;
  subject?: string;
  previewText?: string;
  body: string;
  cta?: CallToAction;
  variables: Record<string, string>; // {{{name}}} يتم استبدالها
}

// دعوة للعمل
export interface CallToAction {
  text: string;
  url: string;
  style: 'primary' | 'secondary' | 'tertiary';
  trackingId: string;
}

// الجمهور المستهدف
export interface TargetAudience {
  segmentType: SegmentCriteria;
  filters: AudienceFilter[];
  excludeSegments: string[];
  estimatedReach: number;
}

// مرشح الجمهور
export interface AudienceFilter {
  field: string; // مثل: age, location, purchase_count
  operator: 'equals' | 'gt' | 'lt' | 'contains' | 'in';
  value: string | number | string[];
}

// جدولة الحملة
export interface CampaignSchedule {
  startDate: Date;
  endDate?: Date;
  sendTime: string; // "HH:mm"
  timezone: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 للأسابيع
  recurringDays?: number; // عدد أيام التكرار
}

// محتوى الحملة
export interface CampaignContent {
  title: string;
  subtitle?: string;
  mainImage?: string;
  contentBlocks: ContentBlock[];
  attachments?: Attachment[];
  metadata: Record<string, any>;
}

// كتلة محتوى
export interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'button' | 'divider' | 'countdown';
  content: string;
  styling?: Record<string, string>;
}

// المرفقات
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  size: number;
}

// مقاييس الحملة
export interface CampaignMetrics {
  sentCount: number;
  deliveredCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  roi: number; // Return on Investment
  updatedAt: Date;
}

// الأتمتة التسويقية
export interface MarketingAutomation {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  triggerCondition?: Record<string, any>;
  actions: AutomationAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// إجراء الأتمتة
export interface AutomationAction {
  id: string;
  type: 'send_campaign' | 'send_email' | 'update_tag' | 'add_to_segment' | 'delay' | 'webhook';
  payload: Record<string, any>;
  delay?: number; // بالدقائق
  order: number;
}

// البيانات الشخصية للعميل
export interface CustomerData {
  id: string;
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  segments: string[];
  tags: string[];
  preferences: CustomerPreferences;
  engagement: EngagementMetrics;
  lastInteraction: Date;
}

// تفضيلات العميل
export interface CustomerPreferences {
  emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  smsOptIn: boolean;
  pushOptIn: boolean;
  categories: string[];
  language: string;
  timezone: string;
}

// مقاييس التفاعل
export interface EngagementMetrics {
  emailOpenCount: number;
  emailClickCount: number;
  websiteVisits: number;
  purchaseCount: number;
  lastPurchaseDate?: Date;
  totalSpent: number;
  engagementScore: number; // 0-100
}

// تقرير الحملة
export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  overview: CampaignMetrics;
  segmentBreakdown: SegmentPerformance[];
  topLinks: LinkPerformance[];
  engagement: {
    hourly: HourlyMetric[];
    daily: DailyMetric[];
  };
  insights: CampaignInsight[];
}

// أداء الجزء
export interface SegmentPerformance {
  segmentId: string;
  segmentName: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

// أداء الرابط
export interface LinkPerformance {
  url: string;
  text: string;
  clicks: number;
  uniqueClicks: number;
  clickRate: number;
}

// مقياس بالساعة
export interface HourlyMetric {
  hour: number;
  opens: number;
  clicks: number;
  conversions: number;
}

// مقياس يومي
export interface DailyMetric {
  date: string;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

// رؤية الحملة
export interface CampaignInsight {
  type: 'recommendation' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction?: string;
}

// نموذج الاختبار A/B
export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  variants: ABTestVariant[];
  trafficAllocation: Record<string, number>; // نسبة التوزيع
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'running' | 'completed';
  winnerVariant?: string;
}

// متغير الاختبار
export interface ABTestVariant {
  id: string;
  name: string;
  template: CampaignTemplate;
  metrics: CampaignMetrics;
  conversionRate: number;
}

// إحصائيات المسار
export interface PathAnalytics {
  campaignId: string;
  userPath: string[];
  conversions: number;
  dropOffPoint?: string;
  averageTimeSpent: number;
}

// قائمة البريد
export interface MailingList {
  id: string;
  name: string;
  description: string;
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// المشترك
export interface Subscriber {
  id: string;
  mailingListId: string;
  email: string;
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  subscribedAt: Date;
  unsubscribedAt?: Date;
}

// الفرقة (Cohort) - مجموعة عملاء بسلوك متشابه
export interface Cohort {
  id: string;
  name: string;
  description: string;
  criteria: AudienceFilter[];
  memberCount: number;
  createdAt: Date;
  analysis: CohortAnalysis;
}

// تحليل الفرقة
export interface CohortAnalysis {
  retentionRate: number;
  churnRate: number;
  averageLifetimeValue: number;
  conversionRate: number;
  engagementScore: number;
}

// نموذج التنبؤ
export interface PredictiveModel {
  id: string;
  name: string;
  type: 'churn' | 'ltv' | 'engagement' | 'conversion';
  accuracy: number;
  trainingData: {
    recordsUsed: number;
    featureCount: number;
  };
  predictions?: PredictionResult[];
  updatedAt: Date;
}

// نتيجة التنبؤ
export interface PredictionResult {
  userId: string;
  prediction: number; // نسبة أو قيمة
  confidence: number; // 0-1
  explanation?: string;
}
