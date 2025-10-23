import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contacts = await ExternalCRMSubcollectionsService.getContacts(id);

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contactData = await request.json();

    const contactId = await ExternalCRMSubcollectionsService.addContact(id, contactData);

    return NextResponse.json({ id: contactId, success: true });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}