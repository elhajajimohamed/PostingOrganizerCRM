import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterId, step } = body;

    if (!callCenterId || !step) {
      return NextResponse.json(
        { error: 'Call center ID and step data are required' },
        { status: 400 }
      );
    }

    // Create the step using the existing service (which handles calendar integration)
    const stepId = await ExternalCRMSubcollectionsService.addStep(callCenterId, step);

    return NextResponse.json({
      success: true,
      stepId,
      message: 'Step created and added to calendar'
    });
  } catch (error) {
    console.error('Error creating step:', error);
    return NextResponse.json(
      { error: 'Failed to create step' },
      { status: 500 }
    );
  }
}