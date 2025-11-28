import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API Route - Received GET /linkedin prospects request');

    // Check if we're bypassing authentication (development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    let prospects;
    if (isDevelopment && bypassAuth) {
      console.log('🔍 API Route - Development mode: Fetching prospects using Admin SDK');

      // Use Admin SDK to bypass client-side auth issues
      const querySnapshot = await adminDb.collection('prospects').orderBy('createdAt', 'desc').get();

      prospects = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          country: data.country || '',
          city: data.city || '',
          positions: data.positions || 0,
          businessType: data.businessType || 'call-center',
          phones: data.phones || [],
          phone_infos: data.phone_infos || [],
          emails: data.emails || [],
          website: data.website || '',
          address: data.address || '',
          source: data.source || '',
          tags: data.tags || [],
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          prospectDate: data.prospectDate || '',
          addedDate: data.addedDate || data.prospectDate || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          destinations: data.destinations || [],
          contacts: data.contacts || [],
          steps: data.steps || [],
          callHistory: data.callHistory || [],
          contactAttempts: data.contactAttempts || 0,
          lastContacted: data.lastContacted || undefined,
          // DNC/DND/DP fields
          dnc: data.dnc || false,
          dnd: data.dnd || false,
          dp: data.dp || false,
          dncDescription: data.dncDescription || '',
          dndDescription: data.dndDescription || '',
          dpDescription: data.dpDescription || '',
        };
      });
    } else {
      prospects = await ProspectionService.getAllProspects();
    }

    const linkedinProspects = prospects.filter(p => p.source === 'linkedin');

    console.log('✅ API Route - Returning LinkedIn prospects:', linkedinProspects.length);

    return NextResponse.json({
      success: true,
      prospects: linkedinProspects,
      count: linkedinProspects.length
    });
  } catch (error) {
    console.error('❌ API Route - Error fetching LinkedIn prospects:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prospects } = await request.json();

    if (!prospects || !Array.isArray(prospects)) {
      return NextResponse.json(
        { error: 'Prospects array is required' },
        { status: 400 }
      );
    }

    // Ensure all prospects have source set to 'linkedin'
    const linkedinProspects = prospects.map((prospect: any) => ({
      ...prospect,
      source: 'linkedin',
      tags: prospect.tags ? [...prospect.tags, 'linkedin'] : ['linkedin']
    }));

    // Import the prospects using the standard import service
    await ProspectionService.importProspects(linkedinProspects, new Date().toISOString().split('T')[0]);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${linkedinProspects.length} LinkedIn prospects`
    });
  } catch (error) {
    console.error('Error importing LinkedIn prospects:', error);
    return NextResponse.json(
      { error: 'Failed to import LinkedIn prospects' },
      { status: 500 }
    );
  }
}