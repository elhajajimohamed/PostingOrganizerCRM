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

    console.log('🔍 Bulk adding to CRM:', prospectIds);

    // Update all selected prospects to 'contacted' status
    for (const prospectId of prospectIds) {
      await ProspectionService.updateProspect(prospectId, { status: 'contacted' });
    }

    console.log('✅ Bulk add to CRM completed for', prospectIds.length, 'prospects');

    return NextResponse.json({ 
      success: true, 
      updatedCount: prospectIds.length,
      message: `${prospectIds.length} prospects moved to CRM` 
    });
  } catch (error) {
    console.error('❌ Error bulk adding to CRM:', error);
    return NextResponse.json(
      { error: 'Failed to bulk add prospects to CRM' },
      { status: 500 }
    );
  }
}