import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateCustomer, getCustomerData, getCustomersBySegment, getMarketingAnalytics } from '@/lib/marketing-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, firstName, lastName, segments, tags, preferences } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email' },
        { status: 400 }
      );
    }

    const customerId = await createOrUpdateCustomer({
      userId,
      email,
      firstName,
      lastName,
      segments: segments || [],
      tags: tags || [],
      preferences: preferences || {
        emailFrequency: 'weekly',
        smsOptIn: false,
        pushOptIn: false,
        categories: [],
        language: 'en',
        timezone: 'UTC',
      },
      engagement: {
        emailOpenCount: 0,
        emailClickCount: 0,
        websiteVisits: 0,
        purchaseCount: 0,
        totalSpent: 0,
        engagementScore: 50,
      },
      lastInteraction: new Date(),
    });

    return NextResponse.json({
      success: true,
      customerId,
      message: 'Customer profile created/updated successfully',
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const segment = searchParams.get('segment');
    const analytics = searchParams.get('analytics');

    if (analytics) {
      const marketingAnalytics = await getMarketingAnalytics();
      return NextResponse.json(marketingAnalytics);
    }

    if (userId) {
      const customer = await getCustomerData(userId);
      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(customer);
    }

    if (segment) {
      const customers = await getCustomersBySegment(segment);
      return NextResponse.json({
        customers,
        count: customers.length,
        segment,
      });
    }

    return NextResponse.json(
      { error: 'Missing required parameters: userId or segment' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer data' },
      { status: 500 }
    );
  }
}
