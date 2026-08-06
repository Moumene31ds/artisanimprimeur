import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

  return NextResponse.json(
    {
      version: buildId,
      buildId,
      time: Date.now(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
