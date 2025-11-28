import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// GET /api/external-crm/call-centers/[id] - Get a specific call center
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Firebase document IDs are strings, not numbers
    const callCenter = await ExternalCRMService.getCallCenter(id);

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

// PUT /api/external-crm/call-centers/[id] - Update a call center
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Pass the ID as-is - the service handles both string and numeric IDs
    const updates = await request.json();

    await ExternalCRMService.updateCallCenter(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update call center' },
      { status: 500 }
    );
  }
}

// DELETE /api/external-crm/call-centers/[id] - Delete a call center
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ExternalCRMService.deleteCallCenter(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete call center' },
      { status: 500 }
    );
  }
}