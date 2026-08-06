import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, bearerToken } from '@/lib/auth-verify';
import { fsQuery, fsGet, fsCreate, fsPatch } from '@/lib/firestore-rest';

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

/** إنشاء حملة مسجلة (تُطلق لاحقاً عبر /api/marketing/send أو الـ cron) */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return error('Unauthorized', 401);
  const token = bearerToken(request.headers.get('authorization')) as string;

  try {
    const body = await request.json();
    const { name, description, type, template, segmentation, schedule, content } = body;

    if (!name || !type || !template) {
      return error('Missing required fields: name, type, template', 400);
    }

    const campaignId = await fsCreate(token, 'marketing_campaigns', {
      name,
      description: description || '',
      type,
      status: body.status || 'draft',
      template,
      segmentation: segmentation || { segmentType: 'all', filters: [], estimatedReach: 0 },
      schedule: schedule || {},
      content: content || { title: name, metadata: {} },
      performance: {
        sentCount: 0, deliveredCount: 0, openRate: 0, clickRate: 0,
        conversionRate: 0, unsubscribeRate: 0, bounceRate: 0, roi: 0,
        updatedAt: new Date().toISOString(),
      },
      createdBy: admin.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, campaignId });
  } catch (err: any) {
    console.error('[campaigns] create failed:', err);
    return error(err.message || 'Failed to create campaign', 500);
  }
}

/** سرد الحملات أو جلب حملة واحدة (مشرف فقط) */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return error('Unauthorized', 401);
  const token = bearerToken(request.headers.get('authorization')) as string;

  try {
    const campaignId = request.nextUrl.searchParams.get('id');

    if (campaignId) {
      const campaign = await fsGet(token, `marketing_campaigns/${campaignId}`);
      if (!campaign) return error('Campaign not found', 404);
      return NextResponse.json(campaign);
    }

    const campaigns = await fsQuery(token, {
      from: [{ collectionId: 'marketing_campaigns' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 100,
    });
    return NextResponse.json({ campaigns, count: campaigns.length });
  } catch (err: any) {
    console.error('[campaigns] list failed:', err);
    return error(err.message || 'Failed to fetch campaigns', 500);
  }
}

/** تحديث حملة (إعادة تسمية، تغيير الحالة، تعديل القالب...) */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return error('Unauthorized', 401);
  const token = bearerToken(request.headers.get('authorization')) as string;

  try {
    const body = await request.json();
    const { campaignId, ...fields } = body;
    if (!campaignId) return error('Missing campaignId', 400);

    const patch: Record<string, any> = { ...fields, updatedAt: new Date().toISOString() };
    await fsPatch(token, `marketing_campaigns/${campaignId}`, patch);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[campaigns] update failed:', err);
    return error(err.message || 'Failed to update campaign', 500);
  }
}
