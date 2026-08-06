import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, bearerToken } from '@/lib/auth-verify';
import { fsQuery } from '@/lib/firestore-rest';

const RULES_ADMIN_EMAIL = 'attouabdelkarim2@gmail.com';
const ADMIN_EMAILS = new Set(
  [RULES_ADMIN_EMAIL, ...(process.env.ADMIN_EMAILS || '').split(',')]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

async function requireAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  const user = await verifyIdToken(bearerToken(request.headers.get('authorization')));
  if (!user?.email) return null;
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return null;
  return { uid: user.uid };
}

/**
 * GET /api/marketing/send-logs?campaignId=...
 * سجل عمليات الإرسال الأخيرة (مشرف فقط).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = bearerToken(request.headers.get('authorization')) as string;

  try {
    const campaignId = request.nextUrl.searchParams.get('campaignId');
    const structuredQuery: any = {
      from: [{ collectionId: 'marketing_send_logs' }],
      orderBy: [{ field: { fieldPath: 'sentAt' }, direction: 'DESCENDING' }],
      limit: 50,
    };
    if (campaignId) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: 'campaignId' },
          op: 'EQUAL',
          value: { stringValue: campaignId },
        },
      };
    }

    const logs = await fsQuery(token, structuredQuery);
    return NextResponse.json({ logs, count: logs.length });
  } catch (err: any) {
    console.error('[send-logs] failed:', err);
    return NextResponse.json({ error: 'Failed to fetch send logs' }, { status: 500 });
  }
}
