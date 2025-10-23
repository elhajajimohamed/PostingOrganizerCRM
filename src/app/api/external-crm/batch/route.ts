import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// POST /api/external-crm/batch/delete - Batch delete call centers
export async function POST(request: NextRequest) {
  try {
    const { action, callCenterIds, tag, updates } = await request.json();

    switch (action) {
      case 'delete':
        const deleteResult = await ExternalCRMService.batchDeleteCallCenters(callCenterIds);
        return NextResponse.json(deleteResult);

      case 'tag':
        const tagResult = await ExternalCRMService.batchTagCallCenters(callCenterIds, tag);
        return NextResponse.json(tagResult);

      case 'update':
        const updateResult = await ExternalCRMService.batchUpdateCallCenters(updates);
        return NextResponse.json(updateResult);

      case 'deleteAll':
        const deleteAllResult = await ExternalCRMService.deleteAllCallCenters();
        return NextResponse.json(deleteAllResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in batch operation:', error);
    return NextResponse.json(
      { success: false, error: 'Batch operation failed' },
      { status: 500 }
    );
  }
}