import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';
import { CallCenter } from '@/lib/types/external-crm';

export async function POST(request: NextRequest) {
   try {
     const callCenters: Omit<CallCenter, 'id' | 'createdAt'>[] = await request.json();

     if (!Array.isArray(callCenters) || callCenters.length === 0) {
       return NextResponse.json(
         { success: false, error: 'No call centers provided' },
         { status: 400 }
       );
     }

     // Development mode: Add better error handling for permission issues
     console.log('Attempting to import', callCenters.length, 'call centers');

    // Validate call centers
    const validCallCenters: Omit<CallCenter, 'id' | 'createdAt'>[] = [];
    const errors: string[] = [];

    callCenters.forEach((cc, index) => {
      if (!cc.name || typeof cc.name !== 'string' || !cc.name.trim()) {
        errors.push(`Row ${index + 1}: Missing or invalid name`);
        return;
      }

      // Ensure required fields have defaults
      const validatedCC = {
        ...cc,
        country: cc.country || 'Morocco',
        city: cc.city || '',
        positions: cc.positions || 0,
        status: cc.status || 'New',
        phones: Array.isArray(cc.phones) ? cc.phones : [],
        emails: Array.isArray(cc.emails) ? cc.emails : [],
        website: cc.website || '',
        tags: Array.isArray(cc.tags) ? cc.tags : [],
        notes: cc.notes || '',
        updatedAt: new Date().toISOString(),
        lastContacted: cc.lastContacted || null,
      };

      validCallCenters.push(validatedCC);
    });

    if (validCallCenters.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid call centers to import', errors },
        { status: 400 }
      );
    }

    // Create call centers in batches to avoid Firestore limits
    const createdIds: string[] = [];
    const batchSize = 10;

    for (let i = 0; i < validCallCenters.length; i += batchSize) {
      const batch = validCallCenters.slice(i, i + batchSize);

      for (const callCenter of batch) {
        try {
          const id = await ExternalCRMService.createCallCenter(callCenter);
          createdIds.push(id.toString());
        } catch (error) {
          console.error('Error creating call center:', error);
          if (error instanceof Error && error.message.includes('permission-denied')) {
            console.error('PERMISSION DENIED: This is likely due to Firestore security rules requiring authentication.');
            console.error('To fix this, either:');
            console.error('1. Log in to your application first');
            console.error('2. Update Firestore rules to allow unauthenticated access for development');
            console.error('3. Use the demo data loader instead of bulk import');
          }
          errors.push(`Failed to create call center: ${callCenter.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: createdIds.length,
      total: validCallCenters.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}