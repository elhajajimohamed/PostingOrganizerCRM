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

    console.log('🔄 [API] Moving call centers to sent today:', callCenterIds);

    // Move call centers to sent today using the service
    await DailyWhatsAppService.moveToSentToday(callCenterIds);

    console.log('✅ [API] Successfully moved call centers to sent today');

    return NextResponse.json({
      success: true,
      message: 'Call centers moved to sent today successfully',
      movedCount: callCenterIds.length
    });

  } catch (error) {
    console.error('❌ [API] Error moving call centers to sent today:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}