import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// GET /api/external-crm/[id] - Get a specific call center
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

// PUT /api/external-crm/[id] - Update a call center
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Pass the ID as-is - the service handles both string and numeric IDs
    const updates = await request.json();

    console.log('🔍 [API] PUT /api/external-crm/[id] - Received updates for ID:', id);
    console.log('🔍 [API] PUT /api/external-crm/[id] - Updates received:', updates);
    console.log('🔍 [API] PUT /api/external-crm/[id] - Destinations in updates:', updates.destinations);
    console.log('🔍 [API] PUT /api/external-crm/[id] - Destinations type:', typeof updates.destinations);
    console.log('🔍 [API] PUT /api/external-crm/[id] - Destinations isArray:', Array.isArray(updates.destinations));
    console.log('🔍 [API] PUT /api/external-crm/[id] - Full request body:', JSON.stringify(updates, null, 2));

    await ExternalCRMService.updateCallCenter(id, updates);

    console.log('✅ [API] PUT /api/external-crm/[id] - Successfully called updateCallCenter service');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [API] PUT /api/external-crm/[id] - Error updating call center:', error);
    console.error('❌ [API] PUT /api/external-crm/[id] - Error details:', error instanceof Error ? error.stack : 'No stack trace');
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