import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CallCenter } from '@/lib/types/external-crm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q')?.trim();
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const offset = searchParams.get('offset');

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search term must be at least 2 characters'
      }, { status: 400 });
    }

    console.log(`🔍 [SEARCH] Searching for: "${searchTerm}", limit: ${limitParam}`);

    // Get all call centers using admin SDK
    const querySnapshot = await adminDb.collection('callCenters').get();
    const allCallCenters: CallCenter[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allCallCenters.push({
        id: doc.id,
        name: data.name || '',
        country: data.country || '',
        city: data.city || '',
        positions: data.positions || 0,
        status: data.status || 'New',
        value: data.value || 0,
        currency: data.currency || 'USD',
        phones: data.phones || [],
        phone_infos: data.phone_infos || [],
        emails: data.emails || [],
        website: data.website || '',
        address: data.address || '',
        source: data.source || '',
        type: data.type || '',
        businessType: data.businessType || undefined,
        tags: data.tags || [],
        markets: data.markets || [],
        competitors: data.competitors || [],
        socialMedia: data.socialMedia || [],
        foundDate: data.foundDate || '',
        lastContacted: data.lastContacted?.toDate?.()?.toISOString() || data.lastContacted,
        last_contacted_via_whatsapp: data.last_contacted_via_whatsapp?.toDate?.()?.toISOString() || data.last_contacted_via_whatsapp,
        notes: data.notes || '',
        // New destinations field for calling destinations (multiple selection)
        destinations: data.destinations || [],
        no_whatsapp_phones: data.no_whatsapp_phones || [],
        whatsapp_excluded_until: data.whatsapp_excluded_until || undefined,
        dnc_until: data.dnc_until || undefined,
        nwt_notification: data.nwt_notification || false,
        satisfied_followup_date: data.satisfied_followup_date || undefined,
        satisfied_notification: data.satisfied_notification || undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        mobilePhones: data.mobilePhones || [],
      } as CallCenter);
    });

    // Client-side filtering for comprehensive search
    // Note: We don't exclude placeholder names here - search should find everything
    const searchTermLower = searchTerm.toLowerCase();

    // Helper function to normalize phone numbers for better matching
    const normalizePhone = (phone: string): string => {
      return phone.replace(/[\s\-\(\)\.]/g, '').toLowerCase();
    };

    const filteredResults = allCallCenters.filter(callCenter => {
      // Enhanced global search
      const matchesSearch =
        callCenter.name.toLowerCase().includes(searchTermLower) ||
        callCenter.city.toLowerCase().includes(searchTermLower) ||
        callCenter.country.toLowerCase().includes(searchTermLower) ||
        (callCenter.email && callCenter.email.toLowerCase().includes(searchTermLower)) ||
        (callCenter.notes && typeof callCenter.notes === 'string' && callCenter.notes.toLowerCase().includes(searchTermLower)) ||
        callCenter.tags?.some(tag => tag.toLowerCase().includes(searchTermLower)) ||
        callCenter.phones?.some(phone => {
          // Exact match (original behavior)
          if (phone.toLowerCase().includes(searchTermLower)) return true;

          // Normalized phone matching (removes spaces, dashes, etc.)
          const normalizedPhone = normalizePhone(phone);
          const normalizedSearch = normalizePhone(searchTerm);

          // Check if search term is contained in normalized phone
          if (normalizedPhone.includes(normalizedSearch)) return true;

          // Check if the last part of the phone number matches (for partial searches)
          const phoneParts = normalizedPhone.split('+');
          const searchParts = normalizedSearch.split('+');

          // If search has country code, check if it matches
          if (searchParts.length > 1 && phoneParts.length > 1) {
            const searchCountryCode = searchParts[0];
            const searchNumber = searchParts[1];
            const phoneCountryCode = phoneParts[0];
            const phoneNumber = phoneParts[1];

            if (searchCountryCode === phoneCountryCode && phoneNumber.includes(searchNumber)) {
              return true;
            }
          }

          // Check if just the number part matches (without country code)
          if (searchParts.length === 1 && phoneParts.length > 1) {
            const phoneNumber = phoneParts[1];
            if (phoneNumber.includes(normalizedSearch)) return true;
          }

          return false;
        });

      return matchesSearch;
    });

    // Limit results
    const results = filteredResults.slice(0, limitParam);
    const hasMore = filteredResults.length > limitParam;
    const nextOffset = hasMore ? results[results.length - 1]?.id : null;

    console.log(`✅ [SEARCH] Found ${results.length} results for "${searchTerm}" (filtered from ${allCallCenters.length} total)`);

    return NextResponse.json({
      success: true,
      data: {
        results,
        total: results.length,
        hasMore,
        nextOffset,
        searchTerm
      }
    });

  } catch (error) {
    console.error('❌ [SEARCH] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Search failed'
    }, { status: 500 });
  }
}