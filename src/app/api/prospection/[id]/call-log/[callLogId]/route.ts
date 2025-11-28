import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callLogId: string }> }
) {
  try {
    const { id, callLogId } = await params;
    const updateData = await request.json();

    console.log('📞 [EDIT-CALL-LOG] Updating call log:', {
      prospectId: id,
      callLogId,
      updateData
    });

    await ProspectionService.updateCallLog(id, callLogId, updateData);

    console.log('✅ [EDIT-CALL-LOG] Call log updated successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [EDIT-CALL-LOG] Error updating call log:', error);
    return NextResponse.json(
      { error: 'Failed to update call log' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callLogId: string }> }
) {
  try {
    const { id, callLogId } = await params;

    console.log('🗑️ [DELETE-CALL-LOG] Deleting call log:', {
      prospectId: id,
      callLogId
    });

    await ProspectionService.deleteCallLog(id, callLogId);

    console.log('✅ [DELETE-CALL-LOG] Call log deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [DELETE-CALL-LOG] Error deleting call log:', error);
    return NextResponse.json(
      { error: 'Failed to delete call log' },
      { status: 500 }
    );
  }
}