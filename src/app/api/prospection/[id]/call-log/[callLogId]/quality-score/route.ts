import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';
import { TalkTimeService } from '@/lib/services/talk-time-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callLogId: string }> }
) {
  try {
    const { id, callLogId } = await params;
    const qualityScoreData = await request.json();

    console.log('📊 [QUALITY-SCORE] Updating quality scores for call log:', {
      prospectId: id,
      callLogId,
      qualityScoreData
    });

    // Validate the quality score data
    const {
      accroche_score,
      discovery_score,
      value_prop_score,
      objection_score,
      closing_score,
      client_talk_ratio
    } = qualityScoreData;

    // Validate scores are integers between 1 and 5
    const scores = [accroche_score, discovery_score, value_prop_score, objection_score, closing_score];
    for (const score of scores) {
      if (score !== undefined && score !== null) {
        if (!Number.isInteger(score) || score < 1 || score > 5) {
          return NextResponse.json(
            { error: 'All scores must be integers between 1 and 5' },
            { status: 400 }
          );
        }
      }
    }

    // Validate client_talk_ratio is between 0 and 100
    if (client_talk_ratio !== undefined && client_talk_ratio !== null) {
      if (typeof client_talk_ratio !== 'number' || client_talk_ratio < 0 || client_talk_ratio > 100) {
        return NextResponse.json(
          { error: 'Client talk ratio must be a number between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Get the current call log to check for transcription
    const prospect = await ProspectionService.getProspect(id);
    const callLog = prospect?.callHistory?.find(cl => cl.id === callLogId);

    const updateData: any = { ...qualityScoreData };

    // Auto-calculate talk-time ratios if transcription exists and no manual ratio provided
    if (callLog?.transcriptionText && !qualityScoreData.client_talk_ratio) {
      const autoCalculated = TalkTimeService.calculateFromTranscription(callLog.transcriptionText);
      if (autoCalculated) {
        updateData.client_talk_ratio = autoCalculated.client_ratio;
        updateData.agent_talk_ratio = autoCalculated.agent_ratio;
        console.log('📊 [QUALITY-SCORE] Auto-calculated talk-time ratios:', autoCalculated);
      }
    } else if (client_talk_ratio !== undefined && client_talk_ratio !== null) {
      // Manual ratio provided
      updateData.agent_talk_ratio = 100 - client_talk_ratio;
    }

    await ProspectionService.updateCallLog(id, callLogId, updateData);

    console.log('✅ [QUALITY-SCORE] Quality scores updated successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [QUALITY-SCORE] Error updating quality scores:', error);
    return NextResponse.json(
      { error: 'Failed to update quality scores' },
      { status: 500 }
    );
  }
}