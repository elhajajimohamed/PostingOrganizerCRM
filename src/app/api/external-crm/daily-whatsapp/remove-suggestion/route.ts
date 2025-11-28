import { NextRequest, NextResponse } from 'next/server';
import { DailyWhatsAppService } from '@/lib/services/daily-whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterIds } = body;

    if (!callCenterIds || !Array.isArray(callCenterIds)) {
      return NextResponse.json({
        success: false,
        error: 'callCenterIds must be an array'
      }, { status: 400 });
    }

    console.log('🔄 [API] Removing call centers from suggestions:', callCenterIds);

    await DailyWhatsAppService.removeFromSuggestions(callCenterIds);

    console.log('✅ [API] Successfully removed call centers from suggestions');

    return NextResponse.json({
      success: true,
      message: 'Call centers removed from suggestions successfully',
      removedCount: callCenterIds.length
    });

  } catch (error) {
    console.error('❌ [API] Error removing call centers from suggestions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}