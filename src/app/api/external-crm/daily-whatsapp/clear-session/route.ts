import { NextRequest, NextResponse } from 'next/server';
import { DailyWhatsAppService } from '@/lib/services/daily-whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ [API] Clearing Daily WhatsApp session...');

    // Clear the session by updating it with empty arrays
    const session = await DailyWhatsAppService.getOrCreateTodaySession();
    await DailyWhatsAppService.updateSession(session.id, {
      selectedCallCenterIds: [],
      sentTodayIds: [],
      sessionScoreData: {},
    });

    console.log('✅ [API] Successfully cleared Daily WhatsApp session');

    return NextResponse.json({
      success: true,
      message: 'Session cleared successfully',
      sessionId: session.id
    });

  } catch (error) {
    console.error('❌ [API] Error clearing session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}