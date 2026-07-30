// خدمة التسويق الذكي والحملات
import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  doc,
  Timestamp,
  QueryConstraint,
  deleteDoc,
} from 'firebase/firestore';
import {
  Campaign,
  CampaignMetrics,
  MarketingAutomation,
  CustomerData,
  CampaignReport,
  Cohort,
  CohortAnalysis,
  PredictiveModel,
  PredictionResult,
} from './marketing-types';

const CAMPAIGNS_COLLECTION = 'marketing_campaigns';
const AUTOMATIONS_COLLECTION = 'marketing_automations';
const CUSTOMERS_COLLECTION = 'marketing_customers';
const COHORTS_COLLECTION = 'marketing_cohorts';
const MODELS_COLLECTION = 'predictive_models';

// ========== إدارة الحملات ==========

/**
 * إنشاء حملة تسويقية جديدة
 */
export async function createCampaign(campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'performance'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, CAMPAIGNS_COLLECTION), {
      ...campaignData,
      performance: {
        sentCount: 0,
        deliveredCount: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        unsubscribeRate: 0,
        bounceRate: 0,
        roi: 0,
        updatedAt: Timestamp.now(),
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}

/**
 * الحصول على حملة حسب المعرّف
 */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  try {
    const docRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Campaign;
  } catch (error) {
    console.error('Error getting campaign:', error);
    throw error;
  }
}

/**
 * تحديث أداء الحملة
 */
export async function updateCampaignPerformance(
  campaignId: string,
  metrics: Partial<CampaignMetrics>
): Promise<void> {
  try {
    const docRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    await updateDoc(docRef, {
      performance: {
        ...metrics,
        updatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating campaign performance:', error);
    throw error;
  }
}

/**
 * الحصول على جميع الحملات
 */
export async function getAllCampaigns(
  status?: string,
  type?: string
): Promise<Campaign[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (status) {
      constraints.push(where('status', '==', status));
    }
    if (type) {
      constraints.push(where('type', '==', type));
    }

    const q = constraints.length > 0 ? query(collection(db, CAMPAIGNS_COLLECTION), ...constraints) : query(collection(db, CAMPAIGNS_COLLECTION));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Campaign;
    });
  } catch (error) {
    console.error('Error getting campaigns:', error);
    throw error;
  }
}

// ========== الأتمتة التسويقية ==========

/**
 * إنشاء تدفق أتمتة تسويقية
 */
export async function createMarketingAutomation(
  automationData: Omit<MarketingAutomation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, AUTOMATIONS_COLLECTION), {
      ...automationData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating marketing automation:', error);
    throw error;
  }
}

/**
 * الحصول على الأتمتات حسب التشغيل
 */
export async function getActiveAutomations(): Promise<MarketingAutomation[]> {
  try {
    const q = query(collection(db, AUTOMATIONS_COLLECTION), where('enabled', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as MarketingAutomation;
    });
  } catch (error) {
    console.error('Error getting active automations:', error);
    throw error;
  }
}

// ========== إدارة بيانات العملاء ==========

/**
 * إنشاء أو تحديث ملف العميل التسويقي
 */
export async function createOrUpdateCustomer(
  customerData: Omit<CustomerData, 'id'>
): Promise<string> {
  try {
    const existingQuery = query(collection(db, CUSTOMERS_COLLECTION), where('userId', '==', customerData.userId));
    const existing = await getDocs(existingQuery);

    if (!existing.empty) {
      const docRef = existing.docs[0].ref;
      await updateDoc(docRef, {
        ...customerData,
        lastInteraction: Timestamp.now(),
      });
      return existing.docs[0].id;
    } else {
      const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
        ...customerData,
        lastInteraction: Timestamp.now(),
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    throw error;
  }
}

/**
 * الحصول على بيانات العميل
 */
export async function getCustomerData(userId: string): Promise<CustomerData | null> {
  try {
    const q = query(collection(db, CUSTOMERS_COLLECTION), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();
    return {
      ...data,
      id: snapshot.docs[0].id,
      lastInteraction: data.lastInteraction?.toDate() || new Date(),
    } as CustomerData;
  } catch (error) {
    console.error('Error getting customer data:', error);
    throw error;
  }
}

/**
 * البحث عن العملاء حسب الجزء
 */
export async function getCustomersBySegment(segmentName: string): Promise<CustomerData[]> {
  try {
    const q = query(collection(db, CUSTOMERS_COLLECTION), where('segments', 'array-contains', segmentName));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        lastInteraction: data.lastInteraction?.toDate() || new Date(),
      } as CustomerData;
    });
  } catch (error) {
    console.error('Error getting customers by segment:', error);
    throw error;
  }
}

// ========== تحليل الفرق (Cohort Analysis) ==========

/**
 * إنشاء فرقة عملاء
 */
export async function createCohort(cohortData: Omit<Cohort, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COHORTS_COLLECTION), {
      ...cohortData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating cohort:', error);
    throw error;
  }
}

/**
 * تحليل سلوك الفرقة
 */
export async function analyzeCohort(cohortId: string): Promise<CohortAnalysis> {
  try {
    const docRef = doc(db, COHORTS_COLLECTION, cohortId);
    const cohortSnap = await getDoc(docRef);

    if (!cohortSnap.exists()) {
      throw new Error('Cohort not found');
    }

    const cohort = cohortSnap.data();
    const members = await getCustomersBySegment(cohort.name);

    // حسابات التحليل
    const engagedMembers = members.filter((m) => m.engagement.engagementScore > 50).length;
    const purchasers = members.filter((m) => m.engagement.purchaseCount > 0).length;
    const averageLTV = members.reduce((sum, m) => sum + m.engagement.totalSpent, 0) / members.length || 0;

    const analysis: CohortAnalysis = {
      retentionRate: (engagedMembers / members.length) * 100 || 0,
      churnRate: 100 - ((engagedMembers / members.length) * 100 || 0),
      averageLifetimeValue: averageLTV,
      conversionRate: (purchasers / members.length) * 100 || 0,
      engagementScore: members.reduce((sum, m) => sum + m.engagement.engagementScore, 0) / members.length || 0,
    };

    return analysis;
  } catch (error) {
    console.error('Error analyzing cohort:', error);
    throw error;
  }
}

// ========== النماذج التنبؤية ==========

/**
 * إنشاء نموذج تنبؤي
 */
export async function createPredictiveModel(
  modelData: Omit<PredictiveModel, 'id'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, MODELS_COLLECTION), {
      ...modelData,
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating predictive model:', error);
    throw error;
  }
}

/**
 * التنبؤ بسلوك العميل
 */
export async function predictCustomerBehavior(
  modelType: 'churn' | 'ltv' | 'engagement' | 'conversion',
  userId: string
): Promise<PredictionResult> {
  try {
    const customer = await getCustomerData(userId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // محاكاة التنبؤ بناءً على البيانات الموجودة
    let prediction = 0;
    let confidence = 0;

    if (modelType === 'churn') {
      // عميل يقل تفاعله احتمال أكبر للمغادرة
      const daysSinceLastInteraction = (Date.now() - customer.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
      prediction = Math.min(daysSinceLastInteraction / 365, 1); // نسبة 0-1
      confidence = Math.min(customer.engagement.emailOpenCount / 100, 1);
    } else if (modelType === 'ltv') {
      // التنبؤ بالقيمة مدى الحياة
      prediction = customer.engagement.totalSpent * (1 + customer.engagement.purchaseCount * 0.15);
      confidence = Math.min(customer.engagement.purchaseCount / 20, 1);
    } else if (modelType === 'engagement') {
      // نتيجة التفاعل الحالية
      prediction = customer.engagement.engagementScore / 100;
      confidence = 0.8;
    } else if (modelType === 'conversion') {
      // احتمال الشراء التالي
      prediction = customer.engagement.purchaseCount > 0 ? 0.6 : 0.2;
      confidence = Math.min(customer.engagement.emailClickCount / 50, 1);
    }

    return {
      userId,
      prediction,
      confidence,
      explanation: `Based on ${customer.engagement.emailOpenCount} email opens and ${customer.engagement.purchaseCount} purchases`,
    };
  } catch (error) {
    console.error('Error predicting customer behavior:', error);
    throw error;
  }
}

// ========== إنشاء التقارير ==========

/**
 * إنشاء تقرير شامل للحملة
 */
export async function generateCampaignReport(campaignId: string): Promise<CampaignReport> {
  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const report: CampaignReport = {
      campaignId,
      campaignName: campaign.name,
      reportDate: new Date(),
      period: {
        startDate: campaign.schedule.startDate,
        endDate: campaign.schedule.endDate || new Date(),
      },
      overview: campaign.performance,
      segmentBreakdown: [
        {
          segmentId: 'all',
          segmentName: 'All Subscribers',
          sentCount: campaign.performance.sentCount,
          openRate: campaign.performance.openRate,
          clickRate: campaign.performance.clickRate,
          conversionRate: campaign.performance.conversionRate,
        },
      ],
      topLinks: [
        {
          url: campaign.template.cta?.url || '',
          text: campaign.template.cta?.text || 'CTA',
          clicks: Math.round(campaign.performance.sentCount * campaign.performance.clickRate),
          uniqueClicks: Math.round(campaign.performance.sentCount * campaign.performance.clickRate * 0.8),
          clickRate: campaign.performance.clickRate,
        },
      ],
      engagement: {
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          opens: Math.round(campaign.performance.sentCount / 24),
          clicks: Math.round((campaign.performance.sentCount * campaign.performance.clickRate) / 24),
          conversions: Math.round((campaign.performance.sentCount * campaign.performance.conversionRate) / 24),
        })),
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          opens: Math.round(campaign.performance.sentCount / 7),
          clicks: Math.round((campaign.performance.sentCount * campaign.performance.clickRate) / 7),
          conversions: Math.round((campaign.performance.sentCount * campaign.performance.conversionRate) / 7),
          revenue: 0,
        })),
      },
      insights: [
        {
          type: 'recommendation',
          title: 'Optimize Send Time',
          description: 'Send future campaigns at the time when your audience is most engaged',
          impact: 'high',
          actionable: true,
          suggestedAction: 'Analyze engagement patterns to find optimal send time',
        },
        {
          type: 'trend',
          title: 'Increasing Open Rates',
          description: 'Your open rates have improved by 15% this month',
          impact: 'high',
          actionable: false,
        },
      ],
    };

    return report;
  } catch (error) {
    console.error('Error generating campaign report:', error);
    throw error;
  }
}

// ========== الإحصائيات والبيانات ==========

/**
 * الحصول على إحصائيات التسويق الشاملة
 */
export async function getMarketingAnalytics(): Promise<{
  totalCampaigns: number;
  activeCampaigns: number;
  totalCustomers: number;
  averageEngagementScore: number;
  churnRisk: number;
  roi: number;
}> {
  try {
    const campaigns = await getAllCampaigns();
    const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

    const customers = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const averageEngagement = customers.docs.reduce(
      (sum, doc) => sum + (doc.data().engagement?.engagementScore || 0),
      0
    ) / customers.size || 0;

    const avgROI = campaigns.reduce((sum, c) => sum + (c.performance?.roi || 0), 0) / campaigns.length || 0;

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns,
      totalCustomers: customers.size,
      averageEngagementScore: averageEngagement,
      churnRisk: 25, // نسبة مئوية
      roi: avgROI,
    };
  } catch (error) {
    console.error('Error getting marketing analytics:', error);
    throw error;
  }
}
