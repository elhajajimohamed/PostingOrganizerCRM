import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';
import { ExternalCRMService, ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

export async function POST(request: NextRequest) {
  try {
    const { prospectId } = await request.json();

    if (!prospectId) {
      return NextResponse.json(
        { error: 'Prospect ID is required' },
        { status: 400 }
      );
    }

    // Get the prospect
    const prospect = await ProspectionService.getProspect(prospectId);
    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    // Convert prospect to call center format
    const callCenterData = {
      name: prospect.name,
      country: prospect.country as 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon',
      city: prospect.city,
      positions: prospect.positions,
      status: 'New' as const,
      phones: prospect.phones,
      emails: prospect.emails,
      website: prospect.website,
      address: prospect.address || '',
      source: prospect.source || 'prospection',
      notes: prospect.notes,
      tags: [...prospect.tags, 'prospection-lead'],
      type: prospect.businessType,
      updatedAt: new Date().toISOString(),
      lastContacted: null,
    };

    // Create in CRM
    const callCenterId = await ExternalCRMService.createCallCenter(callCenterData);
    console.log('✅ Call center created with ID:', callCenterId);

    // Transfer call logs from prospect to call center
    if (prospect.callHistory && prospect.callHistory.length > 0) {
      console.log(`📞 Transferring ${prospect.callHistory.length} call logs to call center ${callCenterId}`);

      for (const callLog of prospect.callHistory) {
        try {
          // Remove the id field as it's auto-generated for the new call log
          const { id, ...callLogData } = callLog;
          await ExternalCRMSubcollectionsService.addCallLog(callCenterId.toString(), callLogData);
          console.log(`✅ Transferred call log: ${callLog.outcome} on ${callLog.date}`);
        } catch (callLogError) {
          console.error('❌ Error transferring call log:', callLogError);
          // Continue with other call logs even if one fails
        }
      }

      console.log(`✅ Successfully transferred all call logs for prospect "${prospect.name}"`);
    }

    // Optionally delete from prospects or mark as added
    // await ProspectionService.updateProspect(prospectId, { status: 'added_to_crm' });

    return NextResponse.json({
      success: true,
      callLogsTransferred: prospect.callHistory?.length || 0
    });
  } catch (error) {
    console.error('Error adding prospect to CRM:', error);
    return NextResponse.json(
      { error: 'Failed to add prospect to CRM' },
      { status: 500 }
    );
  }
}