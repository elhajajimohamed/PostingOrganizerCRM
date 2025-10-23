import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// DELETE /api/external-crm/suggestions/[id] - Delete suggestion
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ExternalCRMService.deleteSuggestion(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete suggestion' },
      { status: 500 }
    );
  }
}