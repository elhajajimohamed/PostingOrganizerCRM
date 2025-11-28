import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API Route - Received GET /api/prospection/duplicates request');

    // Check if we're bypassing authentication (development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    let duplicates;
    if (isDevelopment && bypassAuth) {
      console.log('🔍 API Route - Development mode: Finding duplicates using Admin SDK');

      // Fetch all prospects using Admin SDK
      const querySnapshot = await adminDb.collection('prospects').orderBy('createdAt', 'desc').get();

      const prospects = querySnapshot.docs.map(doc => {
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

      // Find duplicates based on name or phone
      const duplicatesObj: { [key: string]: typeof prospects } = {};

      // Group by normalized name (lowercase, trim, remove special chars)
      const nameGroups: { [key: string]: typeof prospects } = {};
      const phoneGroups: { [key: string]: typeof prospects } = {};

      for (const prospect of prospects) {
        // Group by name
        const normalizedName = prospect.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
        if (!nameGroups[normalizedName]) {
          nameGroups[normalizedName] = [];
        }
        nameGroups[normalizedName].push(prospect);

        // Group by phone numbers
        if (prospect.phones && prospect.phones.length > 0) {
          for (const phone of prospect.phones) {
            // Normalize phone: remove spaces, dashes, parentheses
            const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (!phoneGroups[normalizedPhone]) {
              phoneGroups[normalizedPhone] = [];
            }
            phoneGroups[normalizedPhone].push(prospect);
          }
        }
      }

      // Find duplicates by name (groups with more than 1 prospect)
      for (const [nameKey, prospects] of Object.entries(nameGroups)) {
        if (prospects.length > 1) {
          duplicatesObj[`name_${nameKey}`] = prospects;
        }
      }

      // Find duplicates by phone (groups with more than 1 prospect)
      for (const [phoneKey, prospects] of Object.entries(phoneGroups)) {
        if (prospects.length > 1) {
          // Avoid duplicating groups already found by name
          const isAlreadyGrouped = Object.values(duplicatesObj).some(group =>
            group.some(p => prospects.some(dp => dp.id === p.id))
          );

          if (!isAlreadyGrouped) {
            duplicatesObj[`phone_${phoneKey}`] = prospects;
          }
        }
      }

      duplicates = duplicatesObj;
    } else {
      duplicates = await ProspectionService.findDuplicateProspects();
    }

    console.log('✅ API Route - Returning duplicates:', Object.keys(duplicates).length);

    return NextResponse.json({
      duplicates,
      count: Object.keys(duplicates).length
    });
  } catch (error) {
    console.error('❌ API Route - Error fetching duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duplicates' },
      { status: 500 }
    );
  }
}