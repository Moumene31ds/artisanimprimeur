import { NextRequest, NextResponse } from 'next/server';
import { createMarketingAutomation, getActiveAutomations } from '@/lib/marketing-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger, triggerCondition, actions, enabled } = body;

    if (!name || !trigger || !actions || actions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trigger, actions' },
        { status: 400 }
      );
    }

    const automationId = await createMarketingAutomation({
      name,
      description,
      trigger,
      triggerCondition,
      actions: actions.map((action: any, index: number) => ({
        ...action,
        order: index,
      })),
      enabled: enabled !== false,
    });

    return NextResponse.json({
      success: true,
      automationId,
      message: 'Marketing automation created successfully',
    });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const automations = await getActiveAutomations();
    return NextResponse.json({
      automations,
      count: automations.length,
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    );
  }
}
