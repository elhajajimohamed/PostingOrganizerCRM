import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
}

// GET /api/external-crm/calendar - Get all calendar events
export async function GET() {
  try {
    const eventsRef = collection(db, 'calendarEvents');
    const q = query(eventsRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

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
    const { title, description, date, time, location, type, callCenterId, callCenterName, relatedType, relatedId, color, firebaseTaskId } = body;

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
      time,
      location,
      type: type || 'meeting',
      color: color || '',
      callCenterId: callCenterId || '',
      callCenterName: callCenterName || '',
      ...(relatedType && { relatedType }),
      ...(relatedId && { relatedId }),
      ...(firebaseTaskId && { firebaseTaskId }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'calendarEvents'), eventData);

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