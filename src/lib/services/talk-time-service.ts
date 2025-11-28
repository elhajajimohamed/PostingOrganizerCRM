export interface SpeakerSegment {
  start: number; // in seconds
  end: number; // in seconds
  speaker: 'agent' | 'client';
}

export class TalkTimeService {
  /**
   * Calculate talk-time ratios from speaker segments
   * @param segments Array of speaker segments with start/end times and speaker identification
   * @returns Object with client_ratio and agent_ratio (percentages)
   */
  static calculateTalkTimeRatios(segments: SpeakerSegment[]): {
    client_ratio: number;
    agent_ratio: number;
  } {
    if (!segments || segments.length === 0) {
      return { client_ratio: 0, agent_ratio: 0 };
    }

    let clientTotalTime = 0;
    let agentTotalTime = 0;

    for (const segment of segments) {
      const duration = segment.end - segment.start;
      if (segment.speaker === 'client') {
        clientTotalTime += duration;
      } else if (segment.speaker === 'agent') {
        agentTotalTime += duration;
      }
    }

    const totalTime = clientTotalTime + agentTotalTime;

    if (totalTime === 0) {
      return { client_ratio: 0, agent_ratio: 0 };
    }

    const client_ratio = Math.round((clientTotalTime / totalTime) * 100 * 100) / 100; // Round to 2 decimal places
    const agent_ratio = Math.round((agentTotalTime / totalTime) * 100 * 100) / 100;

    return { client_ratio, agent_ratio };
  }

  /**
   * Parse transcription text to extract speaker segments
   * Expected format: [start=0.5s, end=2.1s, speaker=agent]
   * @param transcriptionText Raw transcription text with speaker timestamps
   * @returns Array of speaker segments
   */
  static parseSpeakerSegments(transcriptionText: string): SpeakerSegment[] {
    if (!transcriptionText) {
      return [];
    }

    const segments: SpeakerSegment[] = [];
    const segmentRegex = /\[start=([\d.]+)s,\s*end=([\d.]+)s,\s*speaker=(agent|client)\]/g;

    let match;
    while ((match = segmentRegex.exec(transcriptionText)) !== null) {
      const [, startStr, endStr, speaker] = match;
      const start = parseFloat(startStr);
      const end = parseFloat(endStr);

      if (!isNaN(start) && !isNaN(end) && (speaker === 'agent' || speaker === 'client')) {
        segments.push({
          start,
          end,
          speaker: speaker as 'agent' | 'client'
        });
      }
    }

    return segments;
  }

  /**
   * Calculate talk-time ratios from transcription text containing speaker timestamps
   * @param transcriptionText Transcription text with speaker segments
   * @returns Object with client_ratio and agent_ratio, or null if no segments found
   */
  static calculateFromTranscription(transcriptionText: string): {
    client_ratio: number;
    agent_ratio: number;
  } | null {
    const segments = this.parseSpeakerSegments(transcriptionText);

    if (segments.length === 0) {
      return null;
    }

    return this.calculateTalkTimeRatios(segments);
  }
}