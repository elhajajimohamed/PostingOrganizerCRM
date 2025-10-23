import { NextRequest, NextResponse } from 'next/server';
import { DailyCallsService } from '@/lib/services/daily-calls-service';
import { CallLog } from '@/lib/types/external-crm';

// POST /api/external-crm/daily-calls/call-log - Add a call log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterId, callLog } = body;

    if (!callCenterId) {
      return NextResponse.json(
        {
          success: false,
          error: 'callCenterId is required',
        },
        { status: 400 }
      );
    }

    if (!callLog || typeof callLog !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'callLog object is required',
        },
        { status: 400 }
      );
    }

    // Validate required call log fields
    const requiredFields = ['date', 'outcome', 'notes'];
    for (const field of requiredFields) {
      if (!callLog[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `${field} is required in callLog`,
          },
          { status: 400 }
        );
      }
    }

    const callLogData: Omit<CallLog, 'id'> = {
      date: callLog.date,
      duration: callLog.duration || 0,
      outcome: callLog.outcome,
      notes: callLog.notes,
      followUp: callLog.followUp || '',
    };

    const callLogId = await DailyCallsService.addCallLog(callCenterId, callLogData);

    return NextResponse.json({
      success: true,
      data: {
        id: callLogId,
        ...callLogData,
      },
    });
  } catch (error) {
    console.error('Error adding call log:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}