import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const callId = (await params).callId;
    const classificationData = await request.json();

    const {
      is_argumented,
      decision_maker_reached,
      objection_category,
      objection_detail,
      refusal_reason
    } = classificationData;

    // Validation
    if (typeof is_argumented !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_argumented must be a boolean' },
        { status: 400 }
      );
    }

    if (typeof decision_maker_reached !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'decision_maker_reached must be a boolean' },
        { status: 400 }
      );
    }

    const validObjectionCategories = ['price', 'email', 'timing', 'already_has_provider', 'bad_number', 'other'];
    if (objection_category && !validObjectionCategories.includes(objection_category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid objection_category' },
        { status: 400 }
      );
    }

    const validRefusalReasons = ['prix_trop_cher', 'envoyez_un_email', 'pas_maintenant', 'deja_un_fournisseur', 'mauvais_numero', 'autre'];
    if (refusal_reason && !validRefusalReasons.includes(refusal_reason)) {
      return NextResponse.json(
        { success: false, error: 'Invalid refusal_reason' },
        { status: 400 }
      );
    }

    // Find the call center that contains this call log
    // This is a bit complex since call logs are stored as subcollections
    // We'll need to search through all call centers to find the one with this call log
    const { ExternalCRMService } = await import('@/lib/services/external-crm-service');
    const callCenters = await ExternalCRMService.getCallCenters();

    let callCenterId: string | null = null;
    for (const callCenter of callCenters) {
      try {
        const callHistory = await ExternalCRMSubcollectionsService.getCallHistory(callCenter.id.toString());
        if (callHistory.some(log => log.id === callId)) {
          callCenterId = callCenter.id.toString();
          break;
        }
      } catch (error) {
        // Continue searching
      }
    }

    if (!callCenterId) {
      return NextResponse.json(
        { success: false, error: 'Call log not found' },
        { status: 404 }
      );
    }

    // Update the call log with classification data
    const updates = {
      is_argumented,
      decision_maker_reached,
      objection_category: objection_category || undefined,
      objection_detail: objection_detail || undefined,
      refusal_reason: refusal_reason || undefined,
    };

    await ExternalCRMSubcollectionsService.updateCallLog(callCenterId, callId, updates);

    // Automatic logic for bad_number
    if (refusal_reason === 'mauvais_numero') {
      await ExternalCRMSubcollectionsService.updateCallLog(callCenterId, callId, {
        is_argumented: false,
        decision_maker_reached: false,
        objection_category: 'bad_number',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating call classification:', error);
    return NextResponse.json(
      { error: 'Failed to update call classification' },
      { status: 500 }
    );
  }
}