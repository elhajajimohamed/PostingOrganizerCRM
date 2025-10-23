import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';
import { DEMO_CALL_CENTERS, DEMO_SUGGESTIONS } from '@/lib/demo-data';

// POST /api/demo-data - Populate database with demo data
export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (type === 'call-centers') {
      // Import demo call centers
      const results = [];
      for (const callCenter of DEMO_CALL_CENTERS) {
        try {
          const id = await ExternalCRMService.createCallCenter(callCenter);
          results.push({ success: true, id, name: callCenter.name });
        } catch (error) {
          results.push({ success: false, name: callCenter.name, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `Imported ${successCount} call centers, ${failureCount} failed`,
        results
      });

    } else if (type === 'suggestions') {
      // Import demo suggestions
      const results = [];
      for (const suggestion of DEMO_SUGGESTIONS) {
        try {
          const id = await ExternalCRMService.createSuggestion(suggestion);
          results.push({ success: true, id, name: suggestion.name });
        } catch (error) {
          results.push({ success: false, name: suggestion.name, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `Imported ${successCount} suggestions, ${failureCount} failed`,
        results
      });

    } else if (type === 'all') {
      // Import both call centers and suggestions
      const callCenterResults = [];
      const suggestionResults = [];

      // Import call centers
      for (const callCenter of DEMO_CALL_CENTERS) {
        try {
          const id = await ExternalCRMService.createCallCenter(callCenter);
          callCenterResults.push({ success: true, id, name: callCenter.name });
        } catch (error) {
          callCenterResults.push({ success: false, name: callCenter.name, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Import suggestions
      for (const suggestion of DEMO_SUGGESTIONS) {
        try {
          const id = await ExternalCRMService.createSuggestion(suggestion);
          suggestionResults.push({ success: true, id, name: suggestion.name });
        } catch (error) {
          suggestionResults.push({ success: false, name: suggestion.name, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      const callCenterSuccessCount = callCenterResults.filter(r => r.success).length;
      const suggestionSuccessCount = suggestionResults.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        message: `Imported ${callCenterSuccessCount} call centers and ${suggestionSuccessCount} suggestions`,
        callCenters: callCenterResults,
        suggestions: suggestionResults
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use "call-centers", "suggestions", or "all"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error populating demo data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to populate demo data' },
      { status: 500 }
    );
  }
}

// GET /api/demo-data - Get demo data info
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      callCenters: {
        count: DEMO_CALL_CENTERS.length,
        countries: [...new Set(DEMO_CALL_CENTERS.map(cc => cc.country))],
        statuses: [...new Set(DEMO_CALL_CENTERS.map(cc => cc.status))]
      },
      suggestions: {
        count: DEMO_SUGGESTIONS.length,
        countries: [...new Set(DEMO_SUGGESTIONS.map(s => s.country))],
        sources: [...new Set(DEMO_SUGGESTIONS.map(s => s.source))]
      }
    }
  });
}