import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';
import { CallCenter } from '@/lib/types/external-crm';

// GET /api/external-crm - Get call centers with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('🔍 API Route - Received params:', Object.fromEntries(searchParams.entries()));

    const filters = {
      country: searchParams.get('country') || undefined,
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
      positions: {
        min: searchParams.get('minPositions') ? parseInt(searchParams.get('minPositions')!) : undefined,
        max: searchParams.get('maxPositions') ? parseInt(searchParams.get('maxPositions')!) : undefined,
      },
      search: searchParams.get('search') || undefined,
    };

    console.log('🔍 API Route - Parsed filters:', filters);

    const sort = {
      field: (searchParams.get('sortField') || 'createdAt') as keyof CallCenter,
      direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    };

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const loadAll = searchParams.get('all') === 'true';

    // Calculate offset from page number (page 1 = offset 0, page 2 = offset 20, etc.)
    const offset = loadAll ? 0 : (page - 1) * limit;

    console.log('🔍 API Route - Load config:', { page, offset, limit, loadAll, sort });

    const callCenters = await ExternalCRMService.getCallCenters(filters as any, sort, offset, loadAll ? undefined : limit);
    console.log('✅ API Route - Retrieved call centers:', callCenters.length);

    // Get total count for pagination (without limit to get all records count)
    const totalCallCenters = await ExternalCRMService.getCallCenters(filters as any, sort, 0, undefined);
    console.log('✅ API Route - Total count:', totalCallCenters.length);

    return NextResponse.json({
      success: true,
      data: callCenters,
      total: totalCallCenters.length
    });
  } catch (error) {
    console.error('❌ API Route - Error fetching call centers:', error);
    console.error('❌ API Route - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call centers', details: error instanceof Error ? error.message : 'Unknown error' },
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