import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Check if we're bypassing authentication (development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const tab = searchParams.get('tab') as 'today' | 'history' | 'contacted' | 'today';

    if (isDevelopment && bypassAuth) {
      console.log('🔍 API Route - Development mode: Fetching prospects using Admin SDK with filters');
      console.log('🔍 API Route - Filters:', { date, tab });

      // Build basic query - avoid complex filters that require indexes
      const querySnapshot = await adminDb.collection('prospects').orderBy('createdAt', 'desc').get();

      let prospects = querySnapshot.docs.map(doc => {
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

      // Apply filtering based on tab and date
      if (tab === 'today') {
        if (date) {
          const targetDate = new Date(date);
          prospects = prospects.filter(prospect => {
            const prospectDate = new Date(prospect.createdAt);
            return prospectDate.toDateString() === targetDate.toDateString() && prospect.contactAttempts === 0;
          });
          console.log('🔍 Applied filter for today (date + no contact attempts):', prospects.length);
        } else {
          prospects = prospects.filter(prospect => prospect.contactAttempts === 0);
          console.log('🔍 Applied filter for today (no contact attempts only):', prospects.length);
        }
      } else if (tab === 'contacted') {
        if (date) {
          const targetDate = new Date(date + 'T12:00:00.000Z'); // Use noon UTC to avoid timezone edge cases
          console.log('🔍 [CONTACTED] Filtering for date:', date, 'target date UTC:', targetDate.toISOString());
          console.log('🔍 [CONTACTED] Total prospects before filtering:', prospects.length);

          const beforeFilter = prospects.length;
          let matchedCount = 0;

          prospects = prospects.filter(prospect => {
            if (!prospect.lastContacted) return false;

            // Parse lastContacted and get date in UTC
            const lastContactedDate = new Date(prospect.lastContacted);
            const lastContactedUTC = new Date(lastContactedDate.getTime() - (lastContactedDate.getTimezoneOffset() * 60000));

            // Compare year, month, day in UTC
            const matches = (prospect.status === 'contacted' || prospect.status === 'added_to_crm') &&
                           lastContactedUTC.getUTCFullYear() === targetDate.getUTCFullYear() &&
                           lastContactedUTC.getUTCMonth() === targetDate.getUTCMonth() &&
                           lastContactedUTC.getUTCDate() === targetDate.getUTCDate();

            if (matches) {
              matchedCount++;
              console.log(`✅ [CONTACTED] #${matchedCount} Matched prospect:`, {
                id: prospect.id,
                name: prospect.name,
                status: prospect.status,
                lastContacted: prospect.lastContacted,
                lastContactedLocal: lastContactedDate.toString(),
                lastContactedUTC: lastContactedUTC.toISOString(),
                targetDate: targetDate.toISOString()
              });
            }

            return matches;
          });

          console.log(`🔍 [CONTACTED] FINAL RESULT: Filtered from ${beforeFilter} to ${prospects.length} prospects for date: ${date}`);
          console.log(`🔍 [CONTACTED] Matched ${matchedCount} prospects with status 'contacted' or 'added_to_crm'`);
        } else {
          prospects = prospects.filter(prospect => prospect.status === 'contacted' && prospect.lastContacted);
          console.log('🔍 [CONTACTED] Filtered for all contacted prospects (no date filter):', prospects.length);
        }
      }

      console.log('✅ API Route - Fetched prospects using Admin SDK:', prospects.length);
      return NextResponse.json({ prospects });
    }

    // Use ProspectionService for non-development mode
    let prospects = await ProspectionService.getAllProspects();

    // Apply filtering for regular mode too
    if (date && tab === 'today') {
      const targetDate = new Date(date);
      prospects = prospects.filter(prospect => {
        const prospectDate = new Date(prospect.createdAt);
        return prospectDate.toDateString() === targetDate.toDateString();
      });
    }

    if (tab === 'contacted') {
      prospects = prospects.filter(prospect => (prospect.status === 'contacted' || prospect.status === 'added_to_crm') && prospect.lastContacted);
    }

    if (tab === 'today') {
      prospects = prospects.filter(prospect => prospect.contactAttempts === 0);
    }

    return NextResponse.json({ prospects });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prospectId = await ProspectionService.createProspect(body);

    return NextResponse.json({ id: prospectId });
  } catch (error) {
    console.error('Error creating prospect:', error);
    return NextResponse.json(
      { error: 'Failed to create prospect' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prospectId = searchParams.get('id');

    if (!prospectId) {
      return NextResponse.json(
        { error: 'Prospect ID is required' },
        { status: 400 }
      );
    }

    await ProspectionService.deleteProspect(prospectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prospect:', error);
    return NextResponse.json(
      { error: 'Failed to delete prospect' },
      { status: 500 }
    );
  }
}