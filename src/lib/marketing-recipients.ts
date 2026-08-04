// src/lib/marketing-recipients.ts
// بناء قائمة المستلمين للحملة على الخادم عبر Firestore REST (بتوكن المشرف):
// من marketing_customers إن وجدوا، وإلا من users الذين سمحوا بالتسويق.

import { fsQuery } from './firestore-rest';
import type { CampaignRecipient } from './campaign-engine';
import type { SegmentCriteria } from './marketing-types';

const toDate = (value: any): number | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d.getTime();
};

/**
 * يجلب القاعدة الكاملة للمستلمين دون تطبيق أي فلتر، لاستخدامه في المعاينة والإحصائيات.
 * المصادر بالترتيب: marketing_customers → users → العملاء الضيوف المستنتجون من الطلبات.
 */
export async function fetchRecipientBase(token: string): Promise<any[]> {
  let customers: any[] = [];
  try {
    customers = await fsQuery(token, { from: [{ collectionId: 'marketing_customers' }], limit: 1000 });
  } catch (err) {
    console.warn('[marketing-recipients] marketing_customers unavailable:', (err as Error)?.message);
  }

  if (customers.length === 0) {
    try {
      const users = await fsQuery(token, { from: [{ collectionId: 'users' }], limit: 1000 });
      customers = users
        .filter((u: any) => u.marketingOptIn !== false && (u.email || u.phone))
        .map((u: any) => ({
          id: u.id,
          userId: u.id,
          email: u.email,
          phone: u.phone,
          name: u.displayName || u.name || '',
          segments: [],
          preferences: { emailFrequency: 'weekly', smsOptIn: true, pushOptIn: true },
          _createdAt: u.createdAt,
          _lastInteraction: u.lastLoginAt || u.updatedAt || null,
          _totalSpent: u.totalSpent || 0,
          _purchaseCount: u.purchaseCount || 0,
        }));
    } catch (err) {
      console.warn('[marketing-recipients] users fallback unavailable:', (err as Error)?.message);
    }
  }

  // احتياط أخير: العملاء الضيوف من الطلبات (هاتف + اسم + بريد) — يجعل الحملات
  // تعمل حتى لمتجر لا يملك حسابات مسجلة بعد.
  if (customers.length === 0) {
    try {
      const orders = await fsQuery(token, {
        from: [{ collectionId: 'orders' }],
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit: 1000,
      });
      const byKey = new Map<string, any>();
      for (const o of orders) {
        const phone = o.phone;
        const email = o.customerEmail;
        if (!phone && !email) continue;
        const key = phone || email;
        const existing = byKey.get(key);
        const spent = Number(o.total || 0);
        if (existing) {
          existing._totalSpent += spent;
          existing._purchaseCount += 1;
        } else {
          byKey.set(key, {
            id: `guest-${key}`,
            userId: undefined,
            email: email || undefined,
            phone,
            name: o.customerName || '',
            segments: [],
            preferences: { emailFrequency: 'weekly', smsOptIn: true, pushOptIn: true },
            _createdAt: o.createdAt,
            _lastInteraction: o.createdAt || o.lastProductionUpdate || null,
            _totalSpent: spent,
            _purchaseCount: 1,
          });
        }
      }
      customers = Array.from(byKey.values());
    } catch (err) {
      console.warn('[marketing-recipients] orders fallback unavailable:', (err as Error)?.message);
    }
  }

  return customers;
}

/**
 * إحصائيات القاعدة وتطابق القطاع — للمعاينة قبل الإرسال:
 *  { totalBase, matched, sample }
 */
export async function previewRecipients(
  token: string,
  segment: SegmentCriteria,
  filters: any[] = []
): Promise<{ totalBase: number; matched: number; sample: CampaignRecipient[] }> {
  const base = await fetchRecipientBase(token);
  const matched = filterBySegment(base, segment, filters);
  return {
    totalBase: base.length,
    matched: matched.length,
    sample: matched.slice(0, 5).map((c) => ({
      id: c.id,
      userId: c.userId || c.id,
      email: c.email,
      phone: c.phone,
      name: c.name || c.displayName || c.firstName || '',
    })),
  };
}

function filterBySegment(customers: any[], segment: SegmentCriteria, filters: any[]): any[] {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const spent = (c: any) => Number(c.totalSpent || c._totalSpent || 0);
  const purchases = (c: any) => Number(c.purchaseCount || c._purchaseCount || 0);
  const created = (c: any) => toDate(c.createdAt || c._createdAt);
  const interacted = (c: any) => toDate(c.lastInteraction || c._lastInteraction || c.lastLoginAt || c.updatedAt);

  return customers.filter((c) => {
    switch (segment) {
      case 'all':
        return true;
      case 'premium':
        return spent(c) >= 10000;
      case 'high_value':
        return purchases(c) >= 3 || spent(c) >= 15000;
      case 'new': {
        const t = created(c);
        return !t || now - t < 30 * DAY;
      }
      case 'inactive': {
        const t = interacted(c);
        return !t || now - t > 30 * DAY;
      }
      case 'custom': {
        if (!Array.isArray(filters) || filters.length === 0) return true;
        return filters.every((f: any) => {
          const field = f?.field;
          const value = c[field] ?? c[`_${field}`];
          switch (f?.operator) {
            case 'equals': return value === f.value;
            case 'gt': return Number(value) > Number(f.value);
            case 'lt': return Number(value) < Number(f.value);
            case 'contains': return String(value ?? '').toLowerCase().includes(String(f.value).toLowerCase());
            default: return true;
          }
        });
      }
      default:
        return true;
    }
  });
}

/**
 * يبني قائمة المستلمين حسب معيار التقسيم:
 *  - all: كل العملاء
 *  - premium: عملاء مجموع مشترياتهم فوق 10000 دج
 *  - new: مسجلون منذ أقل من 30 يوماً
 *  - inactive: آخر تفاعل قبل أكثر من 30 يوماً
 *  - high_value: أكثر من 3 مشتريات
 *  - custom: فلاتر يدوية تُطبق بالكود
 */
export async function resolveRecipients(
  token: string,
  segment: SegmentCriteria,
  filters: any[] = []
): Promise<CampaignRecipient[]> {
  const customers = await fetchRecipientBase(token);

  const filtered = filterBySegment(customers, segment, filters);

  return filtered.map((c) => ({
    id: c.id,
    userId: c.userId || c.id,
    email: c.email,
    phone: c.phone,
    name: c.name || c.displayName || c.firstName || '',
    segments: Array.isArray(c.segments) ? c.segments : [],
    preferences: c.preferences || { emailFrequency: 'weekly', smsOptIn: true, pushOptIn: true },
    vars: { code: c.vars?.code || '' },
  }));
}
