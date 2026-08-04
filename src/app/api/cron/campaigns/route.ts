// src/app/api/cron/campaigns/route.ts
// معالجة الحملات المجدولة: يبحث عن حملات status='scheduled' مع startDate <= now
// ويرسلها عبر محرّك الإرسال الفعلي (campaign-engine).
//
// ملاحظة النشر: بدون خادم معتمد (service account) لا يمكن للـ cron قراءة
// Firestore تحت القواعد. لإيفال هذا المسار فعلياً ضع FIREBASE_SERVICE_ACCOUNT
// (JSON) في بيئة الخادم — عندها يعمل بصلاحيات كاملة. في غيابه يعيد
// `{ skipped: true, reason: 'service-account-not-configured' }` دون إرسال أي شيء.

import { NextRequest, NextResponse } from 'next/server';
import { dispatchCampaign, type CampaignChannel, type CampaignRecipient } from '@/lib/campaign-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type AdminFirestore = any;

function toDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    return NextResponse.json({
      skipped: true,
      reason: 'service-account-not-configured',
      hint: 'Set FIREBASE_SERVICE_ACCOUNT (JSON) to enable scheduled campaign sends.',
    });
  }

  try {
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      const parsed = JSON.parse(serviceAccount);
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
        projectId: parsed.project_id,
      });
    }
    const firestore: AdminFirestore = admin.firestore();
    const now = new Date();

    const snap = await firestore.collection('marketing_campaigns').where('status', '==', 'scheduled').limit(20).get();

    const due: any[] = [];
    snap.forEach((doc: any) => {
      const data = doc.data();
      const start = toDate(data.schedule?.startDate);
      if (start && start <= now) due.push({ id: doc.id, ...data });
    });

    let processed = 0;
    for (const campaign of due) {
      try {
        const segmentType = campaign.segmentation?.segmentType || 'all';

        // قراءة قائمة المستلمين (marketing_customers ثم users كاحتياط)
        let recipients: CampaignRecipient[] = [];
        try {
          const customers = await firestore.collection('marketing_customers').limit(1000).get();
          recipients = customers.docs.map((d: any) => {
            const c = d.data();
            return {
              id: d.id,
              userId: c.userId || d.id,
              email: c.email,
              phone: c.phone,
              name: c.name || c.firstName || '',
              segments: c.segments || [],
              preferences: c.preferences || {},
            };
          });
        } catch {
          const users = await firestore.collection('users').limit(1000).get();
          recipients = users.docs
            .map((d: any) => {
              const u = d.data();
              return {
                id: d.id,
                userId: d.id,
                email: u.email,
                phone: u.phone,
                name: u.displayName || u.name || '',
                preferences: { emailFrequency: 'weekly', smsOptIn: true, pushOptIn: true },
              };
            })
            .filter((r: CampaignRecipient) => r.email || r.phone);
        }

        // تطبيق معيار التقسيم بالكود (نفس منطق resolveRecipients)
        const nowMs = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        const spent = (r: any) => Number(r.totalSpent || 0);
        const purchases = (r: any) => Number(r.purchaseCount || 0);
        const createdMs = (r: any) => toDate(r.createdAt)?.getTime() ?? 0;
        const lastMs = (r: any) => toDate(r.lastInteraction || r.lastLoginAt || r.updatedAt)?.getTime() ?? 0;

        const targets = recipients.filter((r: any) => {
          switch (segmentType) {
            case 'premium': return spent(r) >= 10000;
            case 'high_value': return purchases(r) >= 3 || spent(r) >= 15000;
            case 'new': return nowMs - createdMs(r) < 30 * DAY;
            case 'inactive': return nowMs - lastMs(r) > 30 * DAY;
            default: return true;
          }
        });

        const channel: CampaignChannel = campaign.type === 'sms' ? 'sms' : campaign.type === 'push' ? 'push' : 'email';
        const template = campaign.template || {};
        const summary = await dispatchCampaign(targets, {
          channel,
          subject: template.subject || campaign.content?.title || '',
          body: template.body || campaign.content?.title || '',
        });

        await firestore.collection('marketing_campaigns').doc(campaign.id).update({
          status: 'active',
          lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
          performance: {
            ...(campaign.performance || {}),
            sentCount: (campaign.performance?.sentCount || 0) + summary.sent,
            deliveredCount: (campaign.performance?.deliveredCount || 0) + summary.sent,
            updatedAt: new Date().toISOString(),
          },
        });

        await firestore.collection('marketing_send_logs').add({
          campaignId: campaign.id,
          title: campaign.name,
          channel,
          segment: segmentType,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          by: 'cron',
          total: summary.total,
          sent: summary.sent,
          skipped: summary.skipped,
          failed: summary.failed,
        });

        processed++;
      } catch (campaignErr) {
        console.error(`[cron/campaigns] campaign ${campaign.id} failed:`, campaignErr);
      }
    }

    return NextResponse.json({ success: true, due: due.length, processed });
  } catch (err: any) {
    console.error('[cron/campaigns] failed:', err);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
