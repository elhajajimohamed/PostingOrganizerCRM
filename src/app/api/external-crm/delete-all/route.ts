import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [DELETE-ALL] Starting deletion of all call centers...');

    const result = await ExternalCRMService.deleteAllCallCenters();

    if (result.success) {
      console.log(`✅ [DELETE-ALL] Successfully deleted ${result.deleted} call centers`);
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${result.deleted} call centers`,
        deleted: result.deleted
      });
    } else {
      console.error('❌ [DELETE-ALL] Failed to delete call centers:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [DELETE-ALL] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}