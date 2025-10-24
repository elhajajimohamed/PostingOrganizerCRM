import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

// POST /api/external-crm/migrate-phone-detection - Migrate phone detection for existing call centers
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [API] Starting phone detection migration...');

    try {
      // Remove timeout for large migrations - let it run as long as needed
      const result = await ExternalCRMService.migratePhoneDetection();

      console.log('✅ [API] Phone detection migration complete:', result);

      return NextResponse.json({
        success: true,
        message: 'Phone detection migration completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (migrationError) {
      throw migrationError;
    }

  } catch (error) {
    console.error('❌ [API] Error during phone detection migration:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Migration timed out',
          details: 'The migration took too long to complete. Try again or contact support.'
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to migrate phone detection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}