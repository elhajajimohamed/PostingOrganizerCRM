import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { CallCenter } from '@/lib/types/external-crm';

interface GooglePlaceResult {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  url: string;
  rating?: number;
  user_ratings_total?: number;
  place_id: string;
  business_status?: string;
  types?: string[];
  vicinity?: string;
  price_level?: number;
  opening_hours?: any;
  photos?: any[];
  [key: string]: any; // Allow additional properties
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
}

// Helper function to determine country from address
function getCountryFromAddress(address: string): CallCenter['country'] | 'Unknown' {
  const lowerAddress = address.toLowerCase();

  if (lowerAddress.includes('morocco') || lowerAddress.includes('maroc')) {
    return 'Morocco';
  } else if (lowerAddress.includes('tunisia') || lowerAddress.includes('tunis')) {
    return 'Tunisia';
  } else if (lowerAddress.includes('côte d\'ivoire') || lowerAddress.includes('côte d\'voire') || lowerAddress.includes('abidjan')) {
    return 'Ivory Coast';
  } else if (lowerAddress.includes('senegal') || lowerAddress.includes('dakar')) {
    return 'Senegal';
  } else if (lowerAddress.includes('guinea') || lowerAddress.includes('conakry')) {
    return 'Guinea';
  } else if (lowerAddress.includes('cameroon') || lowerAddress.includes('yaoundé')) {
    return 'Cameroon';
  } else {
    return 'Unknown';
  }
}

// Helper function to extract city from address
function extractCityFromAddress(address: string): string {
  // Split address by commas and try to find city
  const parts = address.split(',').map(part => part.trim());

  // Common city patterns - look for known cities
  const knownCities = [
    'casablanca', 'rabat', 'marrakech', 'fes', 'meknes', 'oujda', 'agadir', 'tangier',
    'tunis', 'sousse', 'sfax', 'sidi bouzid', 'kairouan', 'bizerte', 'ariana',
    'abidjan', 'bouaké', 'daloa', 'yamoussoukro', 'korhogo',
    'dakar', 'kaolack', 'ziguinchor', 'saint-louis', 'thiès',
    'conakry', 'nzérékoré', 'kankan', 'kindia', 'boké',
    'yaoundé', 'douala', 'garoua', 'bafoussam', 'maroua'
  ];

  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    for (const city of knownCities) {
      if (lowerPart.includes(city)) {
        return part;
      }
    }
  }

  // Fallback: return the second part (usually city) or first part
  return parts.length > 1 ? parts[1] : parts[0] || 'Unknown';
}

// Helper function to estimate positions based on business type and size indicators
function estimatePositions(name: string, address: string, types?: string[]): number {
  const lowerName = name.toLowerCase();
  const lowerAddress = address.toLowerCase();

  // Keywords that suggest larger operations
  const largeKeywords = ['centre', 'center', 'corporate', 'headquarters', 'siège', 'siege'];
  const mediumKeywords = ['bureau', 'office', 'agence', 'agency'];
  const smallKeywords = ['local', 'petit', 'small'];

  // Business types that typically have more positions
  const largeTypes = ['establishment', 'point_of_interest', 'premise'];
  const callCenterTypes = ['telecom', 'call_center', 'business_center'];

  let basePositions = 5; // Default minimum

  // Check for call center specific keywords
  if (lowerName.includes('call center') || lowerName.includes('centre d\'appel') ||
      lowerName.includes('telemarketing') || lowerName.includes('télémarketing')) {
    basePositions = 15;
  }

  // Size indicators
  if (largeKeywords.some(keyword => lowerAddress.includes(keyword) || lowerName.includes(keyword))) {
    basePositions *= 2;
  } else if (mediumKeywords.some(keyword => lowerAddress.includes(keyword) || lowerName.includes(keyword))) {
    basePositions *= 1.5;
  } else if (smallKeywords.some(keyword => lowerAddress.includes(keyword) || lowerName.includes(keyword))) {
    basePositions *= 0.7;
  }

  // Business type indicators
  if (types && (largeTypes.some(type => types.includes(type)) || callCenterTypes.some(type => types.includes(type)))) {
    basePositions *= 1.3;
  }

  return Math.max(1, Math.round(basePositions));
}

export async function POST(request: NextRequest) {
  try {
    const { keyword, city } = await request.json();

    if (!keyword || !city) {
      return NextResponse.json(
        { error: 'Keyword and city are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      );
    }

    const query = `${keyword} ${city}`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

    const response = await fetch(url);
    const data: GooglePlacesResponse = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch places data' },
        { status: 500 }
      );
    }

    // Clean and format the results from text search
    const initialResults = data.results.map((place) => ({
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || '',
      website: place.website || '',
      mapsUrl: place.url,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      placeId: place.place_id,
      // Additional fields that might be available
      businessStatus: place.business_status || '',
      types: place.types || [],
      vicinity: place.vicinity || '',
      priceLevel: place.price_level || null,
      openingHours: place.opening_hours || null,
      photos: place.photos || [],
      // CRM-specific fields
      country: getCountryFromAddress(place.formatted_address),
      city: extractCityFromAddress(place.formatted_address),
      estimatedPositions: estimatePositions(place.name, place.formatted_address, place.types),
    }));

    // Fetch detailed information for each place (phone and website)
    const detailedResults = await Promise.all(
      initialResults.map(async (place) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.placeId}&fields=name,formatted_phone_number,website&key=${apiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();

          if (detailsData.status === 'OK' && detailsData.result) {
            // Format phone number with country code
            let formattedPhone = 'Not available';
            if (detailsData.result.formatted_phone_number) {
              // Add country code if not present
              const phone = detailsData.result.formatted_phone_number;
              if (phone.startsWith('+')) {
                formattedPhone = phone;
              } else if (phone.startsWith('0')) {
                // Determine country based on address or city
                const address = place.address.toLowerCase();
                if (address.includes('morocco') || address.includes('rabat') || address.includes('casablanca')) {
                  formattedPhone = '+212' + phone.substring(1);
                } else if (address.includes('tunisia') || address.includes('tunis')) {
                  formattedPhone = '+216' + phone.substring(1);
                } else if (address.includes('côte d\'ivoire') || address.includes('abidjan') || address.includes('côte d\'voire')) {
                  formattedPhone = '+225' + phone.substring(1);
                } else {
                  formattedPhone = phone; // Keep as is if country unknown
                }
              } else {
                formattedPhone = phone;
              }
            }

            return {
              ...place,
              phone: formattedPhone,
              website: detailsData.result.website || 'Not available',
              country: place.country, // Already set from initial processing
              city: place.city, // Already set from initial processing
              estimatedPositions: place.estimatedPositions, // Already set from initial processing
            };
          }

          return {
            ...place,
            phone: 'Not available',
            website: 'Not available',
            country: place.country, // Already set from initial processing
            city: place.city, // Already set from initial processing
            estimatedPositions: place.estimatedPositions, // Already set from initial processing
          };
        } catch (error) {
          console.error(`Error fetching details for place ${place.placeId}:`, error);
          return {
            ...place,
            phone: 'Not available',
            website: 'Not available',
            country: place.country, // Already set from initial processing
            city: place.city, // Already set from initial processing
            estimatedPositions: place.estimatedPositions, // Already set from initial processing
          };
        }
      })
    );

    return NextResponse.json({ results: detailedResults });
  } catch (error) {
    console.error('Error fetching Google Places data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const leadData = await request.json();

    if (!leadData.placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      );
    }

    // Check if lead already exists in call centers collection
    const callCentersRef = collection(db, 'callCenters');
    const q = query(callCentersRef, where('source', '==', 'google'), where('placeId', '==', leadData.placeId));
    const existingLeads = await getDocs(q);

    if (!existingLeads.empty) {
      return NextResponse.json({
        success: false,
        message: 'Lead already exists in CRM'
      });
    }

    // Transform Google Places data to CallCenter format
    const now = new Date().toISOString();
    const callCenterData: Omit<CallCenter, 'id'> = {
      name: leadData.name,
      country: leadData.country === 'Unknown' ? 'Morocco' : leadData.country, // Default to Morocco if unknown
      city: leadData.city,
      positions: leadData.estimatedPositions || 10, // Default to 10 if not estimated
      status: 'New',
      phones: leadData.phone && leadData.phone !== 'Not available' ? [leadData.phone] : [],
      emails: [], // Google Places doesn't provide emails
      website: leadData.website && leadData.website !== 'Not available' ? leadData.website : '',
      tags: ['google-lead', 'potential-call-center'],
      notes: `Lead found via Google Places search. Rating: ${leadData.rating || 'N/A'}/5 (${leadData.reviewCount || 0} reviews). Maps URL: ${leadData.mapsUrl}`,
      createdAt: now,
      updatedAt: now,
      lastContacted: null,
      address: leadData.address,
      source: 'google',
      foundDate: now,
    };

    // Save to call centers collection
    const docRef = await addDoc(collection(db, 'callCenters'), callCenterData);

    console.log('Call center saved to CRM with ID:', docRef.id);

    return NextResponse.json({
      success: true,
      message: 'Lead added to CRM successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Error saving lead to CRM:', error);
    return NextResponse.json(
      { error: 'Failed to save lead to CRM' },
      { status: 500 }
    );
  }
}