import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contactData = await request.json();
    const prospectId = params.id;

    await ProspectionService.addContact(prospectId, contactData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json(
      { error: 'Failed to add contact' },
      { status: 500 }
    );
  }
}