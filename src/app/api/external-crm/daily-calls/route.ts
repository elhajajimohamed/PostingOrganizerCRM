import { NextRequest, NextResponse } from 'next/server';
import { DailyCallsService } from '@/lib/services/daily-calls-service';
import { DailyCallCenter } from '@/lib/types/external-crm';

// GET /api/external-crm/daily-calls - Get today's call list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'generate') {
      // Generate today's call list
      const result = await DailyCallsService.generateTodayCallList();

      return NextResponse.json({
        success: true,
        data: {
          selectedForToday: result.selectedForToday,
          alreadyCalled: result.alreadyCalled,
          session: result.session,
        },
      });
    } else if (action === 'reset') {
      // Reset already called list for new day
      await DailyCallsService.resetAlreadyCalledList();

      return NextResponse.json({
        success: true,
        message: 'Already called list reset successfully',
      });
    } else if (action === 'check-new-day') {
      // Check if it's a new day and reset if needed
      const isNewDay = await DailyCallsService.checkAndResetForNewDay();

      return NextResponse.json({
        success: true,
        isNewDay,
      });
    } else {
      // Default: Get today's call list
      const result = await DailyCallsService.generateTodayCallList();

      return NextResponse.json({
        success: true,
        data: {
          selectedForToday: result.selectedForToday,
          alreadyCalled: result.alreadyCalled,
          session: result.session,
        },
      });
    }
  } catch (error) {
    console.error('Error in daily calls API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/external-crm/daily-calls - Move call centers to already called or back to today
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterIds, action } = body;

    if (!callCenterIds || !Array.isArray(callCenterIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'callCenterIds array is required',
        },
        { status: 400 }
      );
    }

    if (action === 'move_back') {
      // Move call centers back to today's list
      await DailyCallsService.moveBackToToday(callCenterIds);
    } else {
      // Default: move to already called
      await DailyCallsService.moveToAlreadyCalled(callCenterIds);
    }

    return NextResponse.json({
      success: true,
      message: action === 'move_back'
        ? `${callCenterIds.length} call centers moved back to today's list`
        : `${callCenterIds.length} call centers moved to already called list`,
    });
  } catch (error) {
    console.error('Error moving call centers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}