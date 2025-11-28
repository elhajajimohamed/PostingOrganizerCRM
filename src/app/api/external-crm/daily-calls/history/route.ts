import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DailyCallHistory } from '@/lib/types/external-crm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callCenterId = searchParams.get('callCenterId');
    const limitParam = searchParams.get('limit') || '50';

    const historyRef = collection(db, 'daily-calls-history');
    let q;

    if (callCenterId) {
      q = query(
        historyRef,
        where('callCenterId', '==', callCenterId),
        orderBy('timestamp', 'desc'),
        limit(parseInt(limitParam))
      );
    } else {
      q = query(
        historyRef,
        orderBy('timestamp', 'desc'),
        limit(parseInt(limitParam))
      );
    }

    const querySnapshot = await getDocs(q);
    const history: DailyCallHistory[] = [];

    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() } as DailyCallHistory);
    });

    return NextResponse.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('Error fetching daily calls history:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterId, callCenterName, action, details, userId } = body;

    if (!callCenterId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: callCenterId and action'
      }, { status: 400 });
    }

    const historyData: Omit<DailyCallHistory, 'id'> = {
      callCenterId,
      callCenterName: callCenterName || 'Unknown',
      action,
      timestamp: new Date().toISOString(),
      details: details || {},
      userId,
    };

    const docRef = await addDoc(collection(db, 'daily-calls-history'), historyData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'History entry created successfully'
    });

  } catch (error) {
    console.error('Error creating daily calls history entry:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}