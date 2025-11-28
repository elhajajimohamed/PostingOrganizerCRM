import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Starting Firebase ID debug...');

    // Test different collection names
    const collectionNames = ['callCenters', 'callcenters', 'call_center', 'call_centers'];
    let foundCollection: string | null = null;
    let documents: any[] = [];

    for (const collectionName of collectionNames) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (snapshot.docs.length > 0) {
          console.log(`📊 [DEBUG] Found ${snapshot.docs.length} documents in '${collectionName}' collection`);
          foundCollection = collectionName;
          documents = snapshot.docs.slice(0, 10).map((doc) => ({
            id: doc.id,
            name: doc.data()?.name || 'Unknown',
            exists: true
          }));
          break;
        }
      } catch (err) {
        console.log(`❌ [DEBUG] Error querying '${collectionName}':`, err);
      }
    }

    if (!foundCollection) {
      console.log('❌ [DEBUG] No documents found in any collection');
      return NextResponse.json({
        success: false,
        error: 'No documents found in any collection',
        collections: collectionNames
      });
    }

    // Test if the specific document we're trying to access exists
    const testDoc = await getDoc(doc(db, foundCollection, 'tcfVNLKiIs1ykJnSYuS3'));
    
    const testResult = {
      collectionName: foundCollection,
      documentExists: testDoc.exists(),
      documentId: 'tcfVNLKiIs1ykJnSYuS3',
      documentData: testDoc.exists() ? testDoc.data() : null
    };

    console.log('🧪 [DEBUG] Test result:', testResult);

    // Check if the session has any valid IDs
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    let sessionCheck = null;

    if (sessionId) {
      const sessionDoc = await getDoc(doc(db, 'dailyWhatsAppSessions', sessionId));
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        const selectedIds = sessionData.selectedCallCenterIds || [];
        const sentTodayIds = sessionData.sentTodayIds || [];
        
        // Test each ID in the session
        const testIds = [...selectedIds.slice(0, 3), ...sentTodayIds.slice(0, 2)].slice(0, 5);
        const idResults = await Promise.all(
          testIds.map(async (id) => {
            const idDoc = await getDoc(doc(db, foundCollection, id));
            return {
              id,
              exists: idDoc.exists(),
              data: idDoc.exists() && idDoc.data() ? { name: idDoc.data()!.name } : null
            };
          })
        );

        sessionCheck = {
          sessionId,
          selectedCount: selectedIds.length,
          sentTodayCount: sentTodayIds.length,
          testResults: idResults
        };
      }
    }

    return NextResponse.json({
      success: true,
      documents,
      testResult,
      sessionCheck
    });

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}