import { NextRequest, NextResponse } from 'next/server';
import { DuplicateDetectionService } from '@/lib/services/duplicate-detection-service';

// POST /api/external-crm/duplicates/individual - Check for duplicates for a specific call center
export async function POST(request: NextRequest) {
  try {
    const callCenter = await request.json();

    console.log('🔍 [API] Checking for individual duplicates:', {
      name: callCenter.name,
      country: callCenter.country,
      city: callCenter.city
    });

    // Use the existing duplicate detection service
    const duplicates = await DuplicateDetectionService.findDuplicates(callCenter);

    console.log(`✅ [API] Found ${duplicates.length} potential duplicates for ${callCenter.name}`);

    return NextResponse.json({
      success: true,
      duplicates,
      count: duplicates.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [API] Error checking individual duplicates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check for duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}