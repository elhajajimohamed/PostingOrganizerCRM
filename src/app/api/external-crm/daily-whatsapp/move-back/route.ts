import { NextRequest, NextResponse } from 'next/server';
import { DailyWhatsAppService } from '@/lib/services/daily-whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterIds } = body;

    if (!callCenterIds || !Array.isArray(callCenterIds)) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid callCenterIds'
      }, { status: 400 });
    }

    console.log('🔄 [API] Moving call centers back to suggestions:', callCenterIds);

    // Move call centers back to suggestions using the service
    await DailyWhatsAppService.moveBackToSuggestions(callCenterIds);

    console.log('✅ [API] Successfully moved call centers back to suggestions');

    return NextResponse.json({
      success: true,
      message: 'Call centers moved back to suggestions successfully',
      movedCount: callCenterIds.length
    });

  } catch (error) {
    console.error('❌ [API] Error moving call centers back to suggestions:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}