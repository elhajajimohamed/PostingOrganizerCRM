import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const steps = await ExternalCRMSubcollectionsService.getSteps(id);

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('Error fetching steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steps' },
      { status: 500 }
    );
  }
}