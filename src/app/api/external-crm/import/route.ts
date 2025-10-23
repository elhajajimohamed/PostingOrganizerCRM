import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';
import { DuplicateDetectionService, DuplicateMatch } from '@/lib/services/duplicate-detection-service';
import { CallCenter } from '@/lib/types/external-crm';

// POST /api/external-crm/import - Import suggestions to call centers
export async function POST(request: NextRequest) {
  try {
    const { suggestionIds } = await request.json();

    if (!Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No suggestion IDs provided' },
        { status: 400 }
      );
    }

    // Get suggestions
    const allSuggestions = await ExternalCRMService.getSuggestions();
    const suggestionsToImport = allSuggestions.filter(s => suggestionIds.includes(s.id));

    if (suggestionsToImport.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid suggestions found' },
        { status: 404 }
      );
    }

    // Convert suggestions to call centers
    const callCenters = suggestionsToImport.map(suggestion => ({
      name: suggestion.name,
      country: suggestion.country,
      city: suggestion.city,
      positions: suggestion.positions,
      status: 'New' as const,
      phones: suggestion.phones,
      emails: suggestion.email ? [suggestion.email] : [],
      website: suggestion.website || '',
      tags: [],
      notes: `Imported from ${suggestion.source}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContacted: null,
    }));

    // Check for duplicates and create call centers with duplicate handling
    const createdIds: string[] = [];
    const duplicatesFound: Array<{
      callCenter: Omit<CallCenter, 'id' | 'createdAt'>;
      duplicates: DuplicateMatch[];
      suggestion: string;
    }> = [];
    const importResults: Array<{
      name: string;
      status: string;
      id?: string;
      duplicates?: number;
      message: string;
    }> = [];

    for (const callCenter of callCenters) {
      try {
        console.log(`🔍 [IMPORT] Checking for duplicates for: ${callCenter.name}`);

        // Check for potential duplicates
        const duplicates = await DuplicateDetectionService.findDuplicates(callCenter);

        if (duplicates.length > 0) {
          console.log(`⚠️ [IMPORT] Found ${duplicates.length} potential duplicates for ${callCenter.name}`);

          duplicatesFound.push({
            callCenter,
            duplicates,
            suggestion: 'Review duplicates before importing'
          });

          importResults.push({
            name: callCenter.name,
            status: 'duplicate_found',
            duplicates: duplicates.length,
            message: `${duplicates.length} potential duplicates found`
          });
        } else {
          console.log(`✅ [IMPORT] No duplicates found for ${callCenter.name}, creating...`);

          const id = await ExternalCRMService.createCallCenter(callCenter);
          createdIds.push(id.toString());

          importResults.push({
            name: callCenter.name,
            status: 'created',
            id: id.toString(),
            message: 'Successfully imported'
          });
        }
      } catch (error) {
        console.error('❌ [IMPORT] Error creating call center:', error);

        importResults.push({
          name: callCenter.name,
          status: 'error',
          message: `Error: ${error}`
        });
      }
    }

    // Mark suggestions as exported
    // Note: This would need to be implemented in the service

    return NextResponse.json({
      success: true,
      imported: createdIds.length,
      total: suggestionsToImport.length,
      duplicatesFound: duplicatesFound.length,
      importResults,
      duplicates: duplicatesFound
    });
  } catch (error) {
    console.error('Error importing suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import suggestions' },
      { status: 500 }
    );
  }
}