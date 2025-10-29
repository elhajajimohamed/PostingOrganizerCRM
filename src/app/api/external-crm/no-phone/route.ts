import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// GET /api/external-crm/no-phone - Get call centers without phone numbers
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [NO-PHONE] Getting call centers without phone numbers...');

    // Get all call centers and filter client-side for those without phones
    const allCallCenters = await ExternalCRMService.getCallCenters();

    // Filter call centers that have no phones or empty phone arrays
    const noPhoneCallCenters = allCallCenters.filter(callCenter =>
      !callCenter.phones ||
      callCenter.phones.length === 0 ||
      callCenter.phones.every(phone => !phone || phone.trim() === '')
    );

    console.log(`✅ [NO-PHONE] Found ${noPhoneCallCenters.length} call centers without phone numbers`);

    return NextResponse.json({
      success: true,
      data: noPhoneCallCenters,
      total: noPhoneCallCenters.length
    });
  } catch (error) {
    console.error('❌ [NO-PHONE] Error fetching call centers without phones:', error);
    console.error('❌ [NO-PHONE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call centers without phone numbers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}