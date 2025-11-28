import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const contactUpdates = await request.json();
    const prospectId = params.id;
    const contactId = params.contactId;

    // Validate required fields
    if (contactUpdates.pattern_interrupt_used === true && !contactUpdates.pattern_interrupt_note) {
      return NextResponse.json(
        { error: 'pattern_interrupt_note is required when pattern_interrupt_used is true' },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof contactUpdates.pattern_interrupt_used !== 'undefined' &&
        typeof contactUpdates.pattern_interrupt_used !== 'boolean') {
      return NextResponse.json(
        { error: 'pattern_interrupt_used must be a boolean' },
        { status: 400 }
      );
    }

    // Trim and clean data
    const cleanedUpdates: any = {};

    if (contactUpdates.personal_details !== undefined) {
      cleanedUpdates.personal_details = contactUpdates.personal_details?.trim() || null;
    }

    if (contactUpdates.rapport_tags !== undefined) {
      cleanedUpdates.rapport_tags = Array.isArray(contactUpdates.rapport_tags)
        ? contactUpdates.rapport_tags.filter((tag: string) => tag?.trim()).map((tag: string) => tag.trim())
        : [];
    }

    if (contactUpdates.pattern_interrupt_used !== undefined) {
      cleanedUpdates.pattern_interrupt_used = contactUpdates.pattern_interrupt_used;
    }

    if (contactUpdates.pattern_interrupt_note !== undefined) {
      cleanedUpdates.pattern_interrupt_note = contactUpdates.pattern_interrupt_note?.trim() || null;
    }

    // Include other standard contact fields if provided
    ['name', 'position', 'phone', 'email', 'notes'].forEach(field => {
      if (contactUpdates[field] !== undefined) {
        cleanedUpdates[field] = contactUpdates[field]?.trim() || '';
      }
    });

    await ProspectionService.updateContact(prospectId, contactId, cleanedUpdates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}