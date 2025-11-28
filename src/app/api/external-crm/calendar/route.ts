import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type: 'meeting' | 'call' | 'task' | 'reminder';
  color?: string;
  callCenterId?: string;
  callCenterName?: string;
  relatedType?: 'step' | 'callLog';
  relatedId?: string;
  status?: 'completed' | 'pending';
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  firebaseTaskId?: string;
  summary?: string;
}

// GET /api/external-crm/calendar - Get all calendar events
export async function GET() {
  try {
    const snapshot = await adminDb.collection('calendarEvents').get();

    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        date: data.date || '',
        time: data.time || '',
        location: data.location || '',
        type: data.type || 'meeting',
        color: data.color || '',
        callCenterId: data.callCenterId || '',
        callCenterName: data.callCenterName || '',
        relatedType: data.relatedType || '',
        relatedId: data.relatedId || '',
        status: data.status || 'pending',
        completedAt: data.completedAt || null,
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        firebaseTaskId: data.firebaseTaskId || '',
        summary: data.summary || '',
      } as CalendarEvent);
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// POST /api/external-crm/calendar - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, date, time, location, type, callCenterId, callCenterName, relatedType, relatedId, color, firebaseTaskId, summary } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      );
    }

    const eventData: Omit<CalendarEvent, 'id'> = {
      title,
      description,
      date,
      type: type || 'meeting',
      color: color || '',
      callCenterId: callCenterId || '',
      callCenterName: callCenterName || '',
      ...(time && { time }),
      ...(location && { location }),
      ...(relatedType && { relatedType }),
      ...(relatedId && { relatedId }),
      ...(firebaseTaskId && { firebaseTaskId }),
      ...(summary && { summary }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('calendarEvents').add(eventData);

    const newEvent: CalendarEvent = {
      id: docRef.id,
      ...eventData,
    };

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}