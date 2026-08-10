import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APP_VERSION, getChangelog, getChangelogSince, getLatestChangelogEntry } from '@/lib/changelog';

export const dynamic = 'force-dynamic';

/**
 * نقطة نهاية معلومات البناء — مصدر الحقيقة للنسخة الجارية.
 * تدعم `?since=vX.Y` لإرجاع الميزات التراكمية لكل الإصدارات الأحدث
 * من النسخة التي شاهدها العميل آخر مرة (يرى المستخدم كل ما فاته).
 */
export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get('since') || null;

  const commit =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    '';
  const buildId =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF && commit
      ? `${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}-${commit.slice(0, 7)}`
      : commit
        ? commit.slice(0, 7)
        : 'dev';

  const latest = getLatestChangelogEntry();

  return NextResponse.json(
    {
      version: buildId,
      release: APP_VERSION,
      releaseDate: latest?.date ?? null,
      kind: latest?.kind ?? 'normal',
      features: getChangelog(APP_VERSION),
      changelogSince: getChangelogSince(since).map((e) => ({
        version: e.version,
        date: e.date ?? null,
        kind: e.kind ?? 'normal',
        features: e.features,
      })),
      time: Date.now(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
