import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callCenterId = searchParams.get('callCenterId');

    if (!callCenterId) {
      return NextResponse.json(
        { error: 'Call center ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [WHATSAPP-HISTORY] Fetching history for call center: ${callCenterId}`);

    // For now, return empty history
    // This will be properly implemented when the full system is restored
    const history = [];

    console.log(`✅ [WHATSAPP-HISTORY] Found ${history.length} WhatsApp history entries for call center ${callCenterId}`);

    return NextResponse.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('❌ [WHATSAPP-HISTORY] Error fetching WhatsApp history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch WhatsApp history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}