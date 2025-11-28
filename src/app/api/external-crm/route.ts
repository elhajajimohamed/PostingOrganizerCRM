import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CallCenter } from '@/lib/types/external-crm';

// GET /api/external-crm - Get call centers with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('🔍 API Route - Received params:', Object.fromEntries(searchParams.entries()));

    const filters = {
      country: searchParams.get('country') || undefined,
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
      positions: {
        min: searchParams.get('minPositions') ? parseInt(searchParams.get('minPositions')!) : undefined,
        max: searchParams.get('maxPositions') ? parseInt(searchParams.get('maxPositions')!) : undefined,
      },
      search: searchParams.get('search') || undefined,
    };

    console.log('🔍 API Route - Parsed filters:', filters);

    const sort = {
      field: (searchParams.get('sortField') || 'createdAt') as keyof CallCenter,
      direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc',
    };

    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const loadAll = searchParams.get('all') === 'true';

    // Calculate offset from page number (page 1 = offset 0, page 2 = offset 20, etc.)
    const offset = loadAll ? 0 : (page - 1) * limit;

    console.log('🔍 API Route - Load config:', { page, offset, limit, loadAll, sort });

    // Get call centers using admin SDK
    const callCentersSnapshot = await adminDb.collection('callCenters').get();
    let callCenters = callCentersSnapshot.docs.map(doc => {
      const data = doc.data();
      const callCenter = {
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
        notes: data.notes || '',
        summary: data.summary || '',
        destinations: data.destinations || [],
        no_whatsapp_phones: data.no_whatsapp_phones || [],
        whatsapp_excluded_until: data.whatsapp_excluded_until || undefined,
        dnc_until: data.dnc_until || undefined,
        nwt_notification: data.nwt_notification || false,
        satisfied_followup_date: data.satisfied_followup_date || undefined,
        satisfied_notification: data.satisfied_notification || undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as CallCenter;

      // Log destinations for debugging
      console.log(`🔍 [API-GET] Call center ${doc.id} "${data.name}" destinations:`, {
        destinations: callCenter.destinations,
        destinationsType: typeof callCenter.destinations,
        destinationsIsArray: Array.isArray(callCenter.destinations),
        rawDestinations: data.destinations
      });

      return callCenter;
    });

    // Apply client-side search filtering if search term is provided
    if (filters?.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      console.log('🔍 API Route - Applying search filter:', searchTerm);

      callCenters = callCenters.filter(callCenter => {
        const matches = callCenter.name.toLowerCase().includes(searchTerm) ||
                callCenter.city.toLowerCase().includes(searchTerm) ||
                callCenter.country.toLowerCase().includes(searchTerm) ||
                (callCenter.website && callCenter.website.toLowerCase().includes(searchTerm)) ||
                (callCenter.notes && typeof callCenter.notes === 'string' && String(callCenter.notes).toLowerCase().includes(searchTerm)) ||
                callCenter.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                callCenter.phones?.some(phone => phone.includes(searchTerm));

        return matches;
      });

      console.log('✅ API Route - Search filtered results:', callCenters.length);
    }

    // Apply pagination after filtering
    const totalCount = callCenters.length;
    if (offset !== undefined && limit !== undefined && !loadAll) {
      console.log('🔍 API Route - Applying pagination: offset', offset, 'limit', limit);
      callCenters = callCenters.slice(offset, offset + limit);
      console.log('✅ API Route - After pagination:', callCenters.length, 'call centers');
    }

    console.log('✅ API Route - Retrieved call centers:', callCenters.length);

    return NextResponse.json({
      success: true,
      data: callCenters,
      total: totalCount
    });
  } catch (error) {
    console.error('❌ API Route - Error fetching call centers:', error);
    console.error('❌ API Route - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call centers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/external-crm - Create a new call center
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create call center data
    const callCenterData = {
      name: body.name || '',
      country: body.country || 'Morocco',
      city: body.city || '',
      positions: body.positions || 0,
      status: body.status || 'New',
      value: body.value || 0,
      currency: body.currency || 'USD',
      phones: Array.isArray(body.phones) ? body.phones : [],
      phone_infos: [], // Will be populated by phone detection service if needed
      emails: Array.isArray(body.emails) ? body.emails : [],
      website: body.website || '',
      address: body.address || '',
      source: body.source || '',
      type: body.type || '',
      businessType: body.businessType || undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
      markets: Array.isArray(body.markets) ? body.markets : [],
      competitors: Array.isArray(body.competitors) ? body.competitors : [],
      socialMedia: Array.isArray(body.socialMedia) ? body.socialMedia : [],
      foundDate: body.foundDate || '',
      notes: body.notes || '',
      destinations: Array.isArray(body.destinations) ? body.destinations : [],
      updatedAt: new Date().toISOString(),
    };

    // Add to Firestore
    const docRef = await adminDb.collection('callCenters').add({
      ...callCenterData,
      createdAt: new Date(),
      lastContacted: body.lastContacted ? new Date(body.lastContacted) : null,
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error creating call center:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create call center' },
      { status: 500 }
    );
  }
}