// GET /api/posting/history - Get posting history by date
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface PostingHistoryItem {
  id: string;
  date: string;
  groupName: string;
  groupUrl: string;
  groupMemberCount: number;
  accountName: string;
  textTitle: string;
  textContent: string;
  imageUrl?: string;
  scheduledTime: string;
  completedAt?: string;
  status: 'completed' | 'failed' | 'pending';
  errorMessage?: string;
}

// GET /api/posting/history?date=2025-11-26&limit=50
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const limitParam = searchParams.get('limit') || '50';
    const limit = Math.min(parseInt(limitParam, 10) || 50, 200); // Max 200 items

    // If no date provided, use today's date
    const targetDate = dateParam || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    console.log(`📅 [Posting History] Fetching history for date: ${targetDate}`);

    // Get all weekly tasks (we'll filter by date client-side since Firestore queries are limited)
    const tasksSnapshot = await adminDb.collection('weeklyPostingTasks').get();

    const historyItems: PostingHistoryItem[] = [];

    tasksSnapshot.forEach((doc) => {
      const taskData = doc.data();

      // Check if the task's scheduled time falls within the target date
      const scheduledTime = new Date(taskData.scheduledTime);
      const isOnTargetDate = scheduledTime >= startOfDay && scheduledTime <= endOfDay;

      if (isOnTargetDate) {
        // Only include completed or failed tasks for history
        const status = taskData.status;
        if (status === 'completed' || status === 'failed') {
          historyItems.push({
            id: doc.id,
            date: targetDate,
            groupName: taskData.groupName || '',
            groupUrl: taskData.groupUrl || '',
            groupMemberCount: taskData.groupMemberCount || 0,
            accountName: taskData.accountName || '',
            textTitle: taskData.textTitle || '',
            textContent: taskData.textContent || '',
            imageUrl: taskData.imageUrl || undefined,
            scheduledTime: taskData.scheduledTime,
            completedAt: taskData.completedAt || undefined,
            status: status,
            errorMessage: taskData.errorMessage || undefined,
          });
        }
      }
    });

    // Sort by scheduled time (most recent first)
    historyItems.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());

    // Apply limit
    const limitedItems = historyItems.slice(0, limit);

    const response = {
      date: targetDate,
      totalItems: historyItems.length,
      returnedItems: limitedItems.length,
      items: limitedItems,
      hasMore: historyItems.length > limit,
    };

    console.log(`✅ [Posting History] Found ${historyItems.length} items for ${targetDate}, returning ${limitedItems.length}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching posting history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posting history' },
      { status: 500 }
    );
  }
}