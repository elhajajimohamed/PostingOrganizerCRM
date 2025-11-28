import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callLogData = await request.json();
    const prospectId = (await params).id;

    await ProspectionService.addCallLog(prospectId, callLogData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding call log:', error);
    return NextResponse.json(
      { error: 'Failed to add call log' },
      { status: 500 }
    );
  }
}