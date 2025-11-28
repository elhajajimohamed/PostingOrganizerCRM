import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminDb } from '@/lib/firebase-admin';
import { ClientTopup } from '@/lib/services/financial-analytics-service';

const COLLECTION_NAME = 'clientTopups';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Check if we're bypassing authentication (development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    let topups: ClientTopup[];
    if (isDevelopment && bypassAuth) {
      console.log('🔍 API Route - Development mode: Fetching top-ups using Admin SDK');

      // Use Admin SDK to bypass client-side auth issues
      const querySnapshot = await adminDb.collection(COLLECTION_NAME).orderBy('date', 'desc').get();
      topups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      })) as ClientTopup[];
    } else {
      let q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));

      if (clientId) {
        // Note: In production, you might want to add a composite index for clientId + date
        // For now, we'll filter client-side
      }

      const querySnapshot = await getDocs(q);
      topups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      })) as ClientTopup[];
    }

    // Filter by clientId if provided
    const filteredTopups = clientId ? topups.filter(t => t.clientId === clientId) : topups;

    return NextResponse.json({ success: true, data: filteredTopups });
  } catch (error) {
    console.error('Error fetching client top-ups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client top-ups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Omit<ClientTopup, 'id'> = await request.json();

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...body,
      date: Timestamp.fromDate(new Date(body.date)),
    });

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...body }
    });
  } catch (error) {
    console.error('Error creating client top-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create client top-up' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: ClientTopup = await request.json();
    const { id, ...updateData } = body;

    const docRef = doc(db, COLLECTION_NAME, id);

    const updatePayload: any = { ...updateData };
    if (updateData.date) {
      updatePayload.date = Timestamp.fromDate(new Date(updateData.date));
    }

    await updateDoc(docRef, updatePayload);

    return NextResponse.json({
      success: true,
      data: body
    });
  } catch (error) {
    console.error('Error updating client top-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update client top-up' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Top-up ID is required' },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, COLLECTION_NAME, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client top-up:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete client top-up' },
      { status: 500 }
    );
  }
}