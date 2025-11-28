import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stepData = await request.json();
    const prospectId = params.id;

    await ProspectionService.addStep(prospectId, stepData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding step:', error);
    return NextResponse.json(
      { error: 'Failed to add step' },
      { status: 500 }
    );
  }
}