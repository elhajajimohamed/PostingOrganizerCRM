import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { CallCenter } from '@/lib/types/external-crm';
import { DuplicateDetectionService } from '@/lib/services/duplicate-detection-service';

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
  next_page_token?: string;
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

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const distance = levenshteinDistance(longer, shorter);
  return Math.round((longer.length - distance) / longer.length * 100);
}

// Helper function for Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
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

    // Parse cities from comma-separated input
    const cities = city.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);

    if (cities.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid city is required' },
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

    // PHASE 1: Search across multiple specified cities
    const MOROCCAN_BPO_HUBS = cities.map((cityName: string, index: number) => ({
      city: cityName,
      priority: index + 1,
      radius: 50000
    }));


    // PHASE 1: EXPANDED KEYWORD VARIATIONS (100+ combinations)
    const BPO_KEYWORDS_OBJ = {
      primary: [
        "BPO", "Business Process Outsourcing", "contact center",
        "call center", "customer service outsourcing", "télésecrétariat",
        "externalisation centre d'appel", "centre de relation client",
        "centre d'appel", "call center services", "customer experience",
        "CX outsourcing", "helpdesk outsourcing", "service desk outsourcing"
      ],

      specialized: [
        "inbound call center", "outbound call center", "telemarketing",
        "téléconseil", "télémarketing", "back office outsourcing",
        "front office outsourcing", "omnichannel contact center",
        "multilingual call center", "offshore call center",
        "nearshore call center", "voice services", "non-voice services",
        "technical support outsourcing", "sales support outsourcing"
      ],

      industry: [
        "BPO for telecom", "BPO for banking", "BPO for insurance",
        "BPO for healthcare", "BPO for ecommerce", "BPO for technology"
      ]
    };

    // Generate all search combinations
    const searchCombinations = [];
    for (const cityHub of MOROCCAN_BPO_HUBS) {
      for (const primary of BPO_KEYWORDS_OBJ.primary) {
        for (const specialized of BPO_KEYWORDS_OBJ.specialized) {
          searchCombinations.push({
            query: `${primary} ${specialized} ${cityHub.city}`,
            city: cityHub.city,
            priority: cityHub.priority
          });
        }
      }
      // Add industry-specific searches
      for (const industry of BPO_KEYWORDS_OBJ.industry) {
        searchCombinations.push({
          query: `${industry} ${cityHub.city}`,
          city: cityHub.city,
          priority: cityHub.priority
        });
      }
    }

    console.log(`🚀 Generated ${searchCombinations.length} search combinations across ${cities.length} cities: ${cities.join(', ')}`);

    // PHASE 2: MAXIMUM SPEED OPTIMIZATION for 500+ results
    const maxConcurrentSearches = 12; // Increased to 12 concurrent searches for maximum throughput
    const delayBetweenBatches = 100; // Reduced to 100ms for ultra-fast processing
    const resultsPerQuery = 60; // Maximum from Google Places API

    let allResults: GooglePlaceResult[] = [];
    let processedCount = 0;
    const totalCombinations = searchCombinations.length;

    // Early termination: Stop when we have enough quality results
    const targetResults = 5000; // Increased to 5000 raw results to ensure 500+ final results
    let shouldContinue = true;

    // Process in optimized batches with higher concurrency
    for (let i = 0; i < searchCombinations.length && shouldContinue; i += maxConcurrentSearches) {
      const batch = searchCombinations.slice(i, i + maxConcurrentSearches);
      console.log(`🚀 Processing batch ${Math.floor(i/maxConcurrentSearches) + 1}/${Math.ceil(searchCombinations.length/maxConcurrentSearches)} (${batch.length} variations) - ${allResults.length} results so far`);

      // Process batch concurrently with higher parallelism
      const batchPromises = batch.map(async (combination) => {
        try {
          let queryResults: GooglePlaceResult[] = [];
          let nextPageToken: string | undefined;
          let pageCount = 0;
          const maxPages = 2; // Reduced from 3 to 2 pages for speed

          do {
            const url = nextPageToken
              ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${apiKey}`
              : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(combination.query)}&key=${apiKey}`;

            const response = await fetch(url);
            const data: GooglePlacesResponse = await response.json();

            if (data.status !== 'OK') {
              if (pageCount === 0) {
                return []; // Skip empty results silently for speed
              }
              break;
            }

            queryResults = [...queryResults, ...data.results];
            nextPageToken = data.next_page_token;
            pageCount++;

            // Ultra-fast pagination delay
            if (nextPageToken && pageCount < maxPages) {
              await new Promise(resolve => setTimeout(resolve, 200)); // Reduced to 200ms for maximum speed
            }
          } while (nextPageToken && pageCount < maxPages);

          processedCount++;
          return queryResults;

        } catch (error) {
          processedCount++;
          return [];
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      allResults = [...allResults, ...batchResults.flat()];

      // Early termination check
      if (allResults.length >= targetResults) {
        console.log(`🎯 Reached target of ${targetResults} results, stopping early for speed`);
        shouldContinue = false;
      }

      // Minimal delay between batches (except for last batch)
      if (i + maxConcurrentSearches < searchCombinations.length && shouldContinue) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    console.log(`🎯 Total results before deduplication: ${allResults.length}`);

    // Remove duplicates based on place_id
    const uniqueResults = allResults.filter((place, index, self) =>
      index === self.findIndex(p => p.place_id === place.place_id)
    );

    console.log(`✅ After deduplication: ${uniqueResults.length} unique results from ${totalCombinations} search variations`);

    // PHASE 2: MINIMAL FILTERING - Very inclusive to maximize results
    // Only filter out completely irrelevant businesses
    const NEGATIVE_FILTERS = [
      "restaurant", "hotel", "bank", "insurance", "real estate",
      "cleaning", "repair", "logistics", "airline", "recruitment",
      "gas station", "pharmacy", "hospital", "school", "university"
    ];

    // BPO keywords for filtering - maximally expanded for maximum coverage
    const BPO_KEYWORDS_FILTER_ARRAY = [
      'call center', 'centre d\'appel', 'bpo', 'business process outsourcing',
      'telemarketing', 'télémarketing', 'contact center', 'customer service',
      'outsourcing', 'externalisation', 'teleconseil', 'téléconseil',
      'helpdesk', 'service desk', 'technical support', 'sales support',
      'voice services', 'non-voice services', 'multilingual', 'omnichannel',
      'inbound', 'outbound', 'offshore', 'nearshore', 'telecom',
      'call centre', 'centres d\'appel', 'centres dappel', 'centre appel',
      'telemarketing services', 'télémarketing services', 'customer care',
      'client service', 'service client', 'support technique', 'hotline',
      'telephone support', 'phone support', 'virtual assistant', 'va',
      'business services', 'professional services', 'corporate services'
    ];

    // Smart filtering: Keep businesses that have BPO keywords OR don't have negative keywords
    const filteredResults = uniqueResults.filter((place) => {
      const nameLower = place.name.toLowerCase();
      const addressLower = place.formatted_address.toLowerCase();

      // Check for negative keywords (more lenient)
      const hasNegativeMatch = NEGATIVE_FILTERS.some(filter =>
        nameLower.includes(filter) || addressLower.includes(filter)
      );

      // Check for BPO relevance
      const hasBPORelevance = BPO_KEYWORDS_FILTER_ARRAY.some((keyword: string) =>
        nameLower.includes(keyword) || addressLower.includes(keyword)
      );

      // Keep if: has BPO keywords OR (no negative keywords AND seems like a business)
      // More inclusive filtering to maximize results
      return hasBPORelevance || (!hasNegativeMatch && (
        place.types?.includes('business') ||
        place.types?.includes('establishment') ||
        place.types?.includes('point_of_interest') ||
        place.website ||
        (place.user_ratings_total && place.user_ratings_total > 0) ||
        place.formatted_phone_number // Any business with a phone number
      ));
    });

    console.log(`🎯 After smart filtering: ${filteredResults.length} relevant results`);

    // Apply basic confidence scoring to all results for maximum coverage
    const scoredResults = filteredResults.map((place) => ({
      ...place,
      confidenceScore: 75 // Default high confidence for pre-filtered results
    }));

    // Clean and format the results from text search
    const initialResults = scoredResults.map((place) => ({
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || '',
      website: place.website || '',
      mapsUrl: place.url,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      placeId: place.place_id,
      confidenceScore: place.confidenceScore,
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

    // PHASE 3: AUTOMATIC CRM DUPLICATE CHECK
    console.log(`🔍 Checking ${detailedResults.length} leads against CRM database...`);

    // Get all existing call centers from CRM
    try {
      const crmResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/external-crm?page=1&limit=10000`);
      if (crmResponse.ok) {
        const crmData = await crmResponse.json();
        const existingCallCenters = crmData.callCenters || [];

        console.log(`📊 Found ${existingCallCenters.length} existing call centers in CRM`);

        // Check each lead against existing centers
        const resultsWithCRMStatus = detailedResults.map((lead) => {
          // Check for exact placeId match first (most reliable)
          const exactPlaceIdMatch = existingCallCenters.find((cc: any) => cc.placeId === lead.placeId);
          if (exactPlaceIdMatch) {
            console.log(`✅ Found exact placeId match for ${lead.name}`);
            return { ...lead, existsInCRM: true, isNew: false, isInCRM: true };
          }

          // Check for exact name match
          const exactNameMatch = existingCallCenters.find((cc: any) =>
            cc.name?.toLowerCase().trim() === lead.name?.toLowerCase().trim()
          );
          if (exactNameMatch) {
            console.log(`✅ Found exact name match for ${lead.name}`);
            return { ...lead, existsInCRM: true, isNew: false, isInCRM: true };
          }

          // Use similarity-based duplicate detection
          const duplicates = existingCallCenters.filter((cc: any) => {
            // Same country check
            if (cc.country !== lead.country) return false;

            // Calculate name similarity (simple implementation)
            const name1 = lead.name?.toLowerCase() || '';
            const name2 = cc.name?.toLowerCase() || '';
            const similarity = calculateSimilarity(name1, name2);

            // Check for high similarity matches (90%+)
            if (similarity >= 90) return true;

            // Check for medium similarity with city boost (70%+ name + 80%+ city)
            if (similarity >= 70) {
              const city1 = lead.city?.toLowerCase() || '';
              const city2 = cc.city?.toLowerCase() || '';
              const citySimilarity = calculateSimilarity(city1, city2);
              if (citySimilarity >= 80) return true;
            }

            return false;
          });

          const hasDuplicates = duplicates.length > 0;
          if (hasDuplicates) {
            console.log(`✅ Found similarity match for ${lead.name} (${duplicates.length} matches)`);
          }
          return { ...lead, existsInCRM: hasDuplicates, isNew: !hasDuplicates, isInCRM: hasDuplicates };
        });

        // Calculate summary
        const newCount = resultsWithCRMStatus.filter(lead => lead.isNew).length;
        const existingCount = resultsWithCRMStatus.filter(lead => lead.existsInCRM).length;

        console.log(`📊 CRM Analysis Complete: ${newCount} new leads, ${existingCount} existing`);

        return NextResponse.json({
          results: resultsWithCRMStatus,
          summary: {
            total: resultsWithCRMStatus.length,
            new: newCount,
            existing: existingCount
          }
        });
      }
    } catch (crmError) {
      console.error('❌ Error checking CRM duplicates:', crmError);
      // Continue without CRM status if check fails
    }

    // Fallback: return results without CRM status if CRM check fails
    return NextResponse.json({
      results: detailedResults.map(lead => ({ ...lead, existsInCRM: false, isNew: true, isInCRM: false })),
      summary: {
        total: detailedResults.length,
        new: detailedResults.length,
        existing: 0
      }
    });
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

    // Check if this is just a status check
    if (leadData.checkOnly) {
      const callCentersRef = collection(db, 'callCenters');
      const q = query(callCentersRef, where('source', '==', 'google'), where('placeId', '==', leadData.placeId));
      const existingLeads = await getDocs(q);
      return NextResponse.json({ exists: !existingLeads.empty });
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