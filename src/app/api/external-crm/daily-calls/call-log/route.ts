import { NextRequest, NextResponse } from 'next/server';
import { DailyCallsService } from '@/lib/services/daily-calls-service';
import { CallLog } from '@/lib/types/external-crm';

// POST /api/external-crm/daily-calls/call-log - Add a call log entry
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('🔍 [API] Request method:', request.method);
    
    let body;
    try {
      const rawBody = await request.text();
      console.log('🔍 [API] Raw request body:', rawBody);
      console.log('🔍 [API] Body length:', rawBody.length);
      
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Empty request body');
      }
      
      body = JSON.parse(rawBody);
      console.log('🔍 [API] Parsed body:', body);
    } catch (parseError) {
      console.error('❌ [API] JSON parsing failed:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
        },
        { status: 400 }
      );
    }
    
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
      callTime: callLog.callTime || '',
      // Advanced call result classification fields - only include if defined
      ...(callLog.is_argumented !== undefined && { is_argumented: callLog.is_argumented }),
      ...(callLog.decision_maker_reached !== undefined && { decision_maker_reached: callLog.decision_maker_reached }),
      ...(callLog.objection_category !== undefined && { objection_category: callLog.objection_category }),
      ...(callLog.objection_detail !== undefined && { objection_detail: callLog.objection_detail }),
      ...(callLog.refusal_reason !== undefined && { refusal_reason: callLog.refusal_reason }),
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