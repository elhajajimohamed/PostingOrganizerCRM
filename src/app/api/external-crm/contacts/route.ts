import { NextRequest, NextResponse } from 'next/server';
import { CrossSectionContactsService } from '@/lib/services/external-crm-service';

// Handle cross-section contacts data for dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callCenterIds = searchParams.get('callCenterIds')?.split(',');
    const searchTerm = searchParams.get('searchTerm');
    const departments = searchParams.get('departments')?.split(',');

    const filters: any = {};
    
    if (callCenterIds && callCenterIds.length > 0) {
      filters.callCenterIds = callCenterIds;
    }
    
    if (searchTerm) {
      filters.searchTerm = searchTerm;
    }
    
    if (departments && departments.length > 0) {
      filters.departments = departments;
    }

    console.log('🔍 [API] Cross-section contacts request with filters:', filters);

    const contactsData = await CrossSectionContactsService.getAllContacts(filters);
    
    console.log('✅ [API] Cross-section contacts loaded:', contactsData.contacts.length, 'contacts');

    return NextResponse.json(contactsData);
  } catch (error) {
    console.error('❌ [API] Error loading cross-section contacts:', error);
    return NextResponse.json(
      { error: 'Failed to load cross-section contacts data' },
      { status: 500 }
    );
  }
}