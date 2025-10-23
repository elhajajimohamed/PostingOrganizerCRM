import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// GET /api/external-crm/[id] - Get a specific call center
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callCenterId = parseInt(id);
    const callCenter = await ExternalCRMService.getCallCenter(callCenterId);

    if (!callCenter) {
      return NextResponse.json(
        { success: false, error: 'Call center not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: callCenter });
  } catch (error) {
    console.error('Error fetching call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call center' },
      { status: 500 }
    );
  }
}

// PUT /api/external-crm/[id] - Update a call center
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callCenterId = parseInt(id);
    const updates = await request.json();

    await ExternalCRMService.updateCallCenter(callCenterId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update call center' },
      { status: 500 }
    );
  }
}

// DELETE /api/external-crm/[id] - Delete a call center
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const callCenterId = parseInt(id);
    await ExternalCRMService.deleteCallCenter(callCenterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete call center' },
      { status: 500 }
    );
  }
}