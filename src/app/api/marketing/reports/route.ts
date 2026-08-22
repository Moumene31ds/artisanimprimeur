// src/app/api/marketing/reports/route.ts
// تقارير الحملات التسويقية — للمشرف فقط.
import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignReport } from '@/lib/marketing-service';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiError } from '@/lib/security/api-error';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) throw new ApiError(401, 'Admin authentication required');

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Missing required parameter: campaignId' },
        { status: 400 }
      );
    }

    const report = await generateCampaignReport(campaignId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
