import { NextRequest, NextResponse } from 'next/server';
import { SchedulingService } from '@/lib/services/scheduling-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Use the simpler test generation that works with minimal data
    const result = await SchedulingService.generateTestSchedule(userId, 5);

    if (result.success) {
      return NextResponse.json({
        success: true,
        taskCount: result.taskIds.length,
        message: `Generated ${result.taskIds.length} test tasks successfully`,
        warnings: result.warnings,
        notifications: result.notifications
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.warnings.join(', '),
        taskCount: 0
      });
    }

  } catch (error) {
    console.error('Error in generate-test-schedule API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}