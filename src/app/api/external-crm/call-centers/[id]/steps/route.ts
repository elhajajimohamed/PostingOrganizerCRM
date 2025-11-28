import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if we're bypassing authentication (development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    let steps;
    if (isDevelopment && bypassAuth) {
      console.log('🔍 API Route - Development mode: Fetching steps using Admin SDK');

      // Use Admin SDK to bypass client-side auth issues
      const querySnapshot = await adminDb
        .collection('callCenters')
        .doc(id)
        .collection('steps')
        .orderBy('date', 'asc')
        .get();

      steps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      }));
    } else {
      steps = await ExternalCRMSubcollectionsService.getSteps(id);
    }

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('Error fetching steps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch steps' },
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
    const stepData = await request.json();

    const stepId = await ExternalCRMSubcollectionsService.addStep(id, stepData);

    return NextResponse.json({ id: stepId });
  } catch (error) {
    console.error('Error creating step:', error);
    return NextResponse.json(
      { error: 'Failed to create step' },
      { status: 500 }
    );
  }
}