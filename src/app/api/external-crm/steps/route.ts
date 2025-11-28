import { NextRequest, NextResponse } from 'next/server';
import { CrossSectionStepsService } from '@/lib/services/external-crm-service';

// Handle cross-section steps data for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    const completed = searchParams.get('completed');
    const callCenterIds = searchParams.get('callCenterIds')?.split(',');

    const filters: any = {};
    
    if (dateStart && dateEnd) {
      filters.dateRange = { start: dateStart, end: dateEnd };
    }
    
    if (completed !== null && completed !== undefined) {
      filters.completed = completed === 'true';
    }
    
    if (callCenterIds && callCenterIds.length > 0) {
      filters.callCenterIds = callCenterIds;
    }

    console.log('🔍 [API] Cross-section steps request with filters:', filters);

    const stepsData = await CrossSectionStepsService.getAllSteps(filters);
    
    console.log('✅ [API] Cross-section steps loaded:', stepsData.steps.length, 'steps');

    return NextResponse.json(stepsData);
  } catch (error) {
    console.error('❌ [API] Error loading cross-section steps:', error);
    return NextResponse.json(
      { error: 'Failed to load cross-section steps data' },
      { status: 500 }
    );
  }
}