import { NextRequest, NextResponse } from 'next/server';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing business type functionality...');
    
    // Get some existing call centers to check businessType field
    const callCenters = await ExternalCRMService.getCallCenters();
    
    console.log('📊 Current call centers with businessType:');
    callCenters.forEach((cc, index) => {
      console.log(`${index + 1}. ${cc.name}: businessType = ${cc.businessType || 'undefined'}`);
      console.log(`   businessType type: ${typeof cc.businessType}`);
      console.log(`   businessType value: "${cc.businessType}"`);
      
      console.log(`   is null: ${cc.businessType === null}`);
      console.log(`   is undefined: ${cc.businessType === undefined}`);
      console.log('---');
    });
    
    return NextResponse.json({
      success: true,
      message: 'Business type test completed',
      callCenters: callCenters.map(cc => ({
        id: cc.id,
        name: cc.name,
        businessType: cc.businessType,
        businessTypeType: typeof cc.businessType,
        hasBusinessType: !!cc.businessType
      }))
    });
    
  } catch (error) {
    console.error('❌ Business type test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Creating test call center with business type:', body);
    
    const callCenterId = await ExternalCRMService.createCallCenter(body);
    console.log('✅ Test call center created with ID:', callCenterId);
    
    // Immediately read it back
    const created = await ExternalCRMService.getCallCenter(callCenterId);
    console.log('📊 Created call center data:', created);
    
    return NextResponse.json({
      success: true,
      id: callCenterId,
      created: created
    });
    
  } catch (error) {
    console.error('❌ Test creation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}