import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// GET /api/external-crm/suggestions - Get suggestions
export async function GET() {
  try {
    const suggestions = await ExternalCRMService.getSuggestions();
    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

// POST /api/external-crm/suggestions - Create suggestion
export async function POST(request: NextRequest) {
  try {
    const suggestionData = await request.json();
    const suggestionId = await ExternalCRMService.createSuggestion(suggestionData);

    return NextResponse.json({ success: true, id: suggestionId });
  } catch (error) {
    console.error('Error creating suggestion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create suggestion' },
      { status: 500 }
    );
  }
}