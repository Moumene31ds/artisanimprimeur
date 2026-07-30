import { NextRequest, NextResponse } from 'next/server';
import { createCampaign, getCampaign, updateCampaignPerformance, getAllCampaigns } from '@/lib/marketing-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, template, segmentation, schedule, content, createdBy } = body;

    if (!name || !type || !template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, template' },
        { status: 400 }
      );
    }

    const campaignId = await createCampaign({
      name,
      description,
      type,
      status: 'draft',
      template,
      segmentation,
      schedule,
      content,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      campaignId,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (campaignId) {
      const campaign = await getCampaign(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(campaign);
    }

    const campaigns = await getAllCampaigns(status || undefined, type || undefined);
    return NextResponse.json({
      campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, performance } = body;

    if (!campaignId || !performance) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, performance' },
        { status: 400 }
      );
    }

    await updateCampaignPerformance(campaignId, performance);

    return NextResponse.json({
      success: true,
      message: 'Campaign performance updated',
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}
