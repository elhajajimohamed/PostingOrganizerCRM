import { NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// POST /api/external-crm/migrate-steps - Migrate existing steps to calendar
export async function POST() {
  try {
    console.log('🚀 [API] Starting step migration...');

    const result = await ExternalCRMService.migrateExistingStepsToCalendar();

    console.log('✅ [API] Migration completed successfully');

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully migrated ${result.migrated} steps to calendar events`
    });
  } catch (error) {
    console.error('❌ [API] Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
        migrated: 0,
        errors: 1
      },
      { status: 500 }
    );
  }
}