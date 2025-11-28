import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function POST(request: NextRequest) {
  try {
    const { prospectId, status, lastContacted, contactAttempts } = await request.json();

    if (!prospectId) {
      return NextResponse.json(
        { error: 'Prospect ID is required' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update the prospect status
    const updateData: any = { 
      status,
      updatedAt: new Date().toISOString()
    };

    if (lastContacted) {
      updateData.lastContacted = lastContacted;
    }

    if (contactAttempts !== undefined) {
      updateData.contactAttempts = contactAttempts;
    }

    await ProspectionService.updateProspect(prospectId, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating prospect status:', error);
    return NextResponse.json(
      { error: 'Failed to update prospect status' },
      { status: 500 }
    );
  }
}