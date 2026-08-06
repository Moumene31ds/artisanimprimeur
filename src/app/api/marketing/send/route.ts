import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, bearerToken } from '@/lib/auth-verify';
import { fsGet, fsPatch, fsCreate } from '@/lib/firestore-rest';
import { dispatchCampaign, type CampaignChannel, type CampaignMessage } from '@/lib/campaign-engine';
import { resolveRecipients, previewRecipients } from '@/lib/marketing-recipients';
import type { SegmentCriteria } from '@/lib/marketing-types';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit';

const sendLimiter = new SlidingWindowRateLimiter(60 * 60 * 1000, 20);

const RULES_ADMIN_EMAIL = 'attouabdelkarim2@gmail.com';
const ADMIN_EMAILS = new Set(
  [RULES_ADMIN_EMAIL, ...(process.env.ADMIN_EMAILS || '').split(',')]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

async function requireAdmin(request: NextRequest): Promise<{ uid: string; email: string } | null> {
  const user = await verifyIdToken(bearerToken(request.headers.get('authorization')));
  if (!user?.email) return null;
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return null;
  return { uid: user.uid, email: user.email };
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/marketing/send
 * محرّك الإرسال الفعلي للحملات.
 *
 * Body (إرسال مباشر):
 *  {
 *    segment: 'all'|'premium'|'new'|'inactive'|'high_value'|'custom',
 *    filters?: [],                    // لـ custom
 *    channel: 'email'|'sms'|'push',
 *    subject?: string,
 *    body: string,                    // يدعم {{name}} {{firstName}} ...
 *    campaignId?: string,             // إن وُجد تُحدَّث مقاييس الحملة ويسجَّل السجل تحتاها
 *    title?: string                   // لعناوين الحملات الجديدة
 *  }
 */
export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!sendLimiter.allow(ip).allowed) {
    return error('Rate limit exceeded', 429);
  }

  const admin = await requireAdmin(request);
  if (!admin) return error('Unauthorized', 401);
  const token = bearerToken(request.headers.get('authorization')) as string;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const segment: SegmentCriteria = body?.segment || 'all';
  const channel: CampaignChannel = body?.channel || 'email';
  const subject = String(body?.subject || '');
  const textBody = String(body?.body || '').trim();
  const campaignId = body?.campaignId;
  const title = String(body?.title || body?.name || '').trim();

  if (!textBody) return error('Missing message body', 400);
  if (!['email', 'sms', 'push', 'social'].includes(channel)) {
    return error('Invalid channel', 400);
  }

  const recipients = await resolveRecipients(token, segment, body?.filters || []);
  if (recipients.length === 0) {
    const stats = await previewRecipients(token, segment, body?.filters || []);
    return NextResponse.json(
      {
        error: 'No recipients matched this segment',
        segment,
        matched: stats.matched,
        totalBase: stats.totalBase,
        hint:
          stats.totalBase === 0
            ? 'La base est vide : créez des comptes clients (users) ou des fichiers marketing_customers.'
            : `Aucun client sur ${stats.totalBase} ne correspond au segment "${segment}". Essayez le segment "all".`,
      },
      { status: 404 }
    );
  }

  const message: CampaignMessage = {
    channel,
    subject,
    body: textBody,
    ctaUrl: body?.ctaUrl || undefined,
  };

  const summary = await dispatchCampaign(recipients, message);

  // تسجيل النتائج في Firestore (بتوكن المشرف) — لا يوقف الرد عند فشل التسجيل
  const logId = `${Date.now()}-${campaignId || 'quick'}`;
  try {
    await fsCreate(token, 'marketing_send_logs', {
      campaignId: campaignId || 'quick',
      title: title || subject || 'Quick send',
      channel,
      segment,
      sentAt: new Date().toISOString(),
      by: admin.email,
      total: summary.total,
      sent: summary.sent,
      skipped: summary.skipped,
      failed: summary.failed,
    }, logId);
  } catch (err) {
    console.warn('[marketing/send] failed to write send log:', (err as Error)?.message);
  }

  // تحديث مقاييس الحملة إن كانت حملة مسجلة
  if (campaignId) {
    try {
      const campaign = await fsGet(token, `marketing_campaigns/${campaignId}`);
      const perf = campaign?.performance || {};
      await fsPatch(token, `marketing_campaigns/${campaignId}`, {
        status: 'active',
        updatedAt: new Date().toISOString(),
        performance: {
          ...perf,
          sentCount: (Number(perf.sentCount) || 0) + summary.sent,
          deliveredCount: (Number(perf.deliveredCount) || 0) + summary.sent,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('[marketing/send] failed to update campaign:', (err as Error)?.message);
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: summary.total,
      sent: summary.sent,
      skipped: summary.skipped,
      failed: summary.failed,
    },
    results: summary.results,
    logId,
  });
}
