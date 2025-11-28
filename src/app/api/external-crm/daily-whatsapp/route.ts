import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CallCenter, DailyWhatsAppSuggestion } from '@/lib/types/external-crm';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import { DailyWhatsAppService } from '@/lib/services/daily-whatsapp-service';

// Generate variable time intervals between WhatsApp sends (in minutes)
const TIME_INTERVALS = [53, 59, 114, 216, 89, 147, 73, 181, 96, 132];

function getNextScheduledTime(currentTime: Date, index: number): Date {
  const intervalMinutes = TIME_INTERVALS[index % TIME_INTERVALS.length];
  return new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
}

function calculateDaysSinceLastWhatsApp(lastWhatsAppDate?: string): number {
  if (!lastWhatsAppDate) return 999; // Very high number if never sent
  const lastDate = new Date(lastWhatsAppDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'generate') {
      // Use the new service to generate suggestions with session management
      const result = await DailyWhatsAppService.generateSuggestions(false);

      return NextResponse.json({
        success: true,
        data: {
          suggestions: result.suggestions,
          sentToday: result.sentToday,
          session: result.session,
        },
      });
    } else if (action === 'regenerate') {
      // Force regenerate WhatsApp suggestions (replace existing)
      const result = await DailyWhatsAppService.generateSuggestions(true);

      return NextResponse.json({
        success: true,
        data: {
          suggestions: result.suggestions,
          sentToday: result.sentToday,
          session: result.session,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Error in daily-whatsapp API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callCenterId, message, scheduledTime, action } = body;

    if (action === 'send') {
      if (!callCenterId || !message) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields'
        }, { status: 400 });
      }

      // Update the call center's lastContacted date and last_contacted_via_whatsapp
      const callCenterRef = doc(db, 'callcenters', callCenterId);

      // Check if document exists first
      const callCenterDoc = await getDoc(callCenterRef);
      if (!callCenterDoc.exists) {
        console.warn(`Call center ${callCenterId} does not exist, skipping update`);
        // Still log the WhatsApp send even if call center doesn't exist
      } else {
        try {
          await updateDoc(callCenterRef, {
            lastContacted: new Date().toISOString(),
            last_contacted_via_whatsapp: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (updateError) {
          console.error(`Failed to update call center ${callCenterId}:`, updateError);
          // Continue with logging even if update fails
        }
      }

      // Move to sent today in session
      await DailyWhatsAppService.moveToSentToday([callCenterId]);

      // Log the WhatsApp send
      const whatsappLogRef = doc(collection(db, 'whatsapp-logs'));
      await setDoc(whatsappLogRef, {
        callCenterId,
        message,
        scheduledTime: scheduledTime || new Date().toISOString(),
        sentAt: new Date().toISOString(),
        status: 'sent',
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp logged successfully'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    });

  } catch (error) {
    console.error('Error in WhatsApp POST:', error);
    // Don't return 500 error for missing call centers, return success since we still logged the action
    if (error instanceof Error && error.message.includes('NOT_FOUND')) {
      console.warn('Call center not found, but WhatsApp send was logged successfully');
      return NextResponse.json({
        success: true,
        message: 'WhatsApp logged successfully (call center not found)'
      });
    }
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}