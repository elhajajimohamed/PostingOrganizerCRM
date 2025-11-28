import { NextResponse } from 'next/server';
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
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  firebaseTaskId?: string;
  summary?: string;
}

export async function POST() {
  try {
    console.log('🔄 Starting calendar to steps sync...');

    // Get all calendar events
    const calendarSnapshot = await adminDb.collection('calendarEvents').get();
    const calendarEvents: CalendarEvent[] = calendarSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || '',
      description: doc.data().description || '',
      date: doc.data().date || '',
      time: doc.data().time || '',
      location: doc.data().location || '',
      type: doc.data().type || 'meeting',
      color: doc.data().color || '',
      callCenterId: doc.data().callCenterId || '',
      callCenterName: doc.data().callCenterName || '',
      relatedType: doc.data().relatedType || '',
      relatedId: doc.data().relatedId || '',
      status: doc.data().status || 'pending',
      completedAt: doc.data().completedAt || null,
      createdAt: doc.data().createdAt || '',
      updatedAt: doc.data().updatedAt || '',
      firebaseTaskId: doc.data().firebaseTaskId || '',
      summary: doc.data().summary || '',
    }));

    console.log(`📅 Found ${calendarEvents.length} calendar events`);

    // Filter events that have callCenterId
    const eventsWithCallCenter = calendarEvents.filter(event =>
      event.callCenterId && event.callCenterId.trim()
    );

    console.log(`🏢 Found ${eventsWithCallCenter.length} calendar events with call center IDs`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const event of eventsWithCallCenter) {
      try {
        const callCenterId = event.callCenterId!;
        const eventId = event.id;

        // Check if step already exists for this event
        const stepsSnapshot = await adminDb
          .collection('callCenters')
          .doc(callCenterId)
          .collection('steps')
          .where('relatedId', '==', eventId)
          .where('relatedType', '==', 'calendar')
          .get();

        if (!stepsSnapshot.empty) {
          console.log(`⏭️ Step already exists for calendar event ${eventId} in call center ${callCenterId}`);
          skippedCount++;
          continue;
        }

        // Create step data
        const stepData = {
          title: event.title || 'Calendar Event',
          description: event.description || `Calendar event: ${event.title}`,
          date: event.date,
          completed: event.status === 'completed',
          notes: `Auto-synced from calendar event on ${new Date().toISOString()}`,
          priority: 'medium',
          relatedType: 'calendar',
          relatedId: eventId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Add step to call center
        await adminDb
          .collection('callCenters')
          .doc(callCenterId)
          .collection('steps')
          .add(stepData);

        console.log(`✅ Created step for calendar event ${eventId} in call center ${callCenterId}`);
        syncedCount++;

      } catch (error) {
        console.error(`❌ Error syncing event ${event.id}:`, error);
      }
    }

    console.log(`🎉 Sync completed: ${syncedCount} steps created, ${skippedCount} skipped`);

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} calendar events to steps, ${skippedCount} already existed`,
      synced: syncedCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('❌ Error in calendar to steps sync:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar events to steps' },
      { status: 500 }
    );
  }
}