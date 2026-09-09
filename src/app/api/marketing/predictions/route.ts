import { NextRequest, NextResponse } from 'next/server';
import { predictCustomerBehavior } from '@/lib/marketing-service';
import { requireAdmin } from '@/lib/admin-auth';
import { ApiError } from '@/lib/security/api-error';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) throw new ApiError(401, 'Admin authentication required');

    const body = await request.json();
    const { modelType, userId } = body;

    if (!modelType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: modelType, userId' },
        { status: 400 }
      );
    }

    if (!['churn', 'ltv', 'engagement', 'conversion'].includes(modelType)) {
      return NextResponse.json(
        { error: 'Invalid modelType. Must be one of: churn, ltv, engagement, conversion' },
        { status: 400 }
      );
    }

    const prediction = await predictCustomerBehavior(modelType as any, userId);

    return NextResponse.json({
      success: true,
      prediction,
      modelType,
    });
  } catch (error) {
    console.error('Error generating prediction:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) throw new ApiError(401, 'Admin authentication required');

    const { searchParams } = new URL(request.url);
    const modelType = searchParams.get('modelType');
    const userId = searchParams.get('userId');

    if (!modelType || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: modelType, userId' },
        { status: 400 }
      );
    }

    const prediction = await predictCustomerBehavior(modelType as any, userId);

    return NextResponse.json({
      success: true,
      prediction,
      modelType,
    });
  } catch (error) {
    console.error('Error fetching prediction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction' },
      { status: 500 }
    );
  }
}
