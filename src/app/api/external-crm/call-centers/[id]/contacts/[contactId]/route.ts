import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const { id, contactId } = params;
    const updates = await request.json();

    await ExternalCRMSubcollectionsService.updateContact(id, contactId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const { id, contactId } = params;

    await ExternalCRMSubcollectionsService.deleteContact(id, contactId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}