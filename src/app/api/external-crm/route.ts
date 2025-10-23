import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';
import { CallCenter } from '@/lib/types/external-crm';

// GET /api/external-crm - Get call centers with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      country: searchParams.get('country') || undefined,
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
      positions: {
        min: searchParams.get('minPositions') ? parseInt(searchParams.get('minPositions')!) : undefined,
        max: searchParams.get('maxPositions') ? parseInt(searchParams.get('maxPositions')!) : undefined,
      },
    };

    const sort = {
      field: (searchParams.get('sortField') || 'createdAt') as keyof CallCenter,
      direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    };

    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const loadAll = searchParams.get('all') === 'true';

    const callCenters = await ExternalCRMService.getCallCenters(filters as any, sort, offset, loadAll ? undefined : limit);

    // Get total count for pagination (without limit to get all records count)
    const totalCallCenters = await ExternalCRMService.getCallCenters(filters as any, sort, 0, undefined);

    return NextResponse.json({
      success: true,
      data: callCenters,
      total: totalCallCenters.length
    });
  } catch (error) {
    console.error('Error fetching call centers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call centers' },
      { status: 500 }
    );
  }
}

// POST /api/external-crm - Create a new call center
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callCenterId = await ExternalCRMService.createCallCenter(body);

    return NextResponse.json({ success: true, id: callCenterId });
  } catch (error) {
    console.error('Error creating call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create call center' },
      { status: 500 }
    );
  }
}