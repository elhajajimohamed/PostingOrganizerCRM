import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// POST /api/external-crm/merge - Merge duplicate call centers
export async function POST(request: NextRequest) {
  try {
    const { primaryId, duplicateIds } = await request.json();

    if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Primary ID and duplicate IDs array are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 [API] Merging call centers: primary=${primaryId}, duplicates=${duplicateIds.join(',')}`);

    const result = await ExternalCRMService.mergeCallCenters(primaryId, duplicateIds);

    if (result.success) {
      console.log(`✅ [API] Merge completed successfully`);
      return NextResponse.json({
        success: true,
        message: `Successfully merged ${result.merged} duplicates into ${primaryId}`,
        merged: result.merged
      });
    } else {
      console.error(`❌ [API] Merge failed:`, result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error merging call centers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to merge call centers' },
      { status: 500 }
    );
  }
}