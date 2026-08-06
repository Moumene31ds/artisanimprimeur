import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, bearerToken } from '@/lib/auth-verify';
import { previewRecipients } from '@/lib/marketing-recipients';
import type { SegmentCriteria } from '@/lib/marketing-types';

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

const VALID_SEGMENTS: SegmentCriteria[] = ['all', 'premium', 'new', 'inactive', 'high_value', 'custom'];

/**
 * GET /api/marketing/recipients?segment=premium&filters=...
 * معاينة عدد المستلمين قبل الإرسال (مشرف فقط).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = bearerToken(request.headers.get('authorization')) as string;

  try {
    const segment = (request.nextUrl.searchParams.get('segment') || 'all') as SegmentCriteria;
    if (!VALID_SEGMENTS.includes(segment)) {
      return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
    }

    let filters: any[] = [];
    try {
      filters = JSON.parse(request.nextUrl.searchParams.get('filters') || '[]');
    } catch {
      filters = [];
    }

    const stats = await previewRecipients(token, segment, filters);

    return NextResponse.json({
      success: true,
      segment,
      totalBase: stats.totalBase,
      matched: stats.matched,
      sample: stats.sample,
      hint: stats.totalBase === 0
        ? 'Aucun client dans la base (marketing_customers vide, vérifiez les utilisateurs).'
        : stats.matched === 0
        ? `Aucun client ne correspond à ce segment sur ${stats.totalBase} dans la base.`
        : undefined,
    });
  } catch (err: any) {
    console.error('[recipients] preview failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to preview recipients' }, { status: 500 });
  }
}
