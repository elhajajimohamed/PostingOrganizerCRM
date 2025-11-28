import { NextRequest, NextResponse } from 'next/server';
import { CrossSectionContactsService } from '@/lib/services/external-crm-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callCenterId = params.id;
    const contactData = await request.json();

    if (!callCenterId) {
      return NextResponse.json(
        { error: 'Call center ID is required' },
        { status: 400 }
      );
    }

    const contactId = await CrossSectionContactsService.createContactForCallCenter(
      callCenterId,
      contactData
    );

    return NextResponse.json({ contactId });
  } catch (error) {
    console.error('Error adding contact to call center:', error);
    return NextResponse.json(
      { error: 'Failed to add contact' },
      { status: 500 }
    );
  }
}