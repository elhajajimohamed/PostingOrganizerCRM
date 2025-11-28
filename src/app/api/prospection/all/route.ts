import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API Route - Received GET /all prospects request');
    
    const prospects = await ProspectionService.getAllProspects();
    
    console.log('✅ API Route - Returning prospects:', prospects.length);
    
    return NextResponse.json({ 
      success: true, 
      prospects,
      count: prospects.length
    });
  } catch (error) {
    console.error('❌ API Route - Error fetching all prospects:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}