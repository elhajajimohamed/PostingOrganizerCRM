import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CalendarEventUpdate extends Record<string, unknown> {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  type?: string;
  status?: string;
  completedAt?: string | null;
  callCenterId?: string;
  summary?: string;
  updatedAt?: string;
}

// PUT /api/external-crm/calendar/[id] - Update a calendar event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, date, time, location, type, status, completedAt, callCenterId, summary } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    const updateData: CalendarEventUpdate = {
      title,
      description,
      date,
      time,
      location,
      type: type || 'meeting',
      updatedAt: new Date().toISOString(),
    };

    // Handle status updates
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = completedAt || new Date().toISOString();
      } else if (status === 'pending') {
        updateData.completedAt = null;
      }
    }

    // Handle call center updates
    if (callCenterId !== undefined) {
      updateData.callCenterId = callCenterId;
    }

    // Handle summary updates
    if (summary !== undefined) {
      updateData.summary = summary;
    }

    const eventRef = doc(db, 'calendarEvents', id);
    await updateDoc(eventRef, updateData);

    // Get the updated event
    const updatedDoc = await getDoc(eventRef);
    if (!updatedDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const updatedEvent = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// DELETE /api/external-crm/calendar/[id] - Delete a calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const eventRef = doc(db, 'calendarEvents', id);
    await deleteDoc(eventRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}