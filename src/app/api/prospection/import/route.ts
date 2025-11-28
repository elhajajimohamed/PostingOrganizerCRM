import { NextRequest, NextResponse } from 'next/server';
import { ProspectionService } from '@/lib/services/prospection-service';

export async function POST(request: NextRequest) {
  try {
    const { prospects, date } = await request.json();

    if (!prospects || !Array.isArray(prospects)) {
      return NextResponse.json(
        { error: 'Prospects array is required' },
        { status: 400 }
      );
    }

    await ProspectionService.importProspects(prospects, date);

    return NextResponse.json({
      success: true,
      imported: prospects.length
    });
  } catch (error) {
    console.error('Error importing prospects:', error);
    return NextResponse.json(
      { error: 'Failed to import prospects' },
      { status: 500 }
    );
  }
}