import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospectIds } = body;

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'prospectIds array is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Bulk deleting prospects:', prospectIds);

    await ProspectionService.bulkDeleteProspects(prospectIds);

    console.log('✅ Bulk delete completed for', prospectIds.length, 'prospects');

    return NextResponse.json({ 
      success: true, 
      deletedCount: prospectIds.length,
      message: `${prospectIds.length} prospects deleted` 
    });
  } catch (error) {
    console.error('❌ Error bulk deleting prospects:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete prospects' },
      { status: 500 }
    );
  }
}