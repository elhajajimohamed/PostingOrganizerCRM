import { NextRequest, NextResponse } from 'next/server';
import { DuplicateDetectionService } from '@/lib/services/duplicate-detection-service';

// GET /api/external-crm/duplicates - Analyze all duplicates in the database
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] Starting comprehensive duplicate analysis...');

    const results = await DuplicateDetectionService.analyzeAllDuplicates();

    console.log('✅ [API] Duplicate analysis complete:', {
      totalCallCenters: results.totalCallCenters,
      duplicateGroups: results.duplicateGroups.length,
      summary: results.summary
    });

    return NextResponse.json({
      success: true,
      data: results.duplicateGroups,
      summary: results.summary,
      totalCallCenters: results.totalCallCenters,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [API] Error analyzing duplicates:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze duplicates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/external-crm/duplicates - Handle bulk operations on duplicates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, masterId, duplicateIds, groupIds } = body;

    console.log('🔄 [API] Processing duplicate operation:', { action, masterId, duplicateIds, groupIds });

    let result;

    switch (action) {
      case 'merge':
        if (!masterId || !duplicateIds || duplicateIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Master ID and duplicate IDs are required for merge operation' },
            { status: 400 }
          );
        }

        const mergeSuccess = await DuplicateDetectionService.mergeDuplicates(masterId, duplicateIds);
        result = { success: mergeSuccess, merged: duplicateIds.length };

        console.log(`✅ [API] Merge operation ${mergeSuccess ? 'successful' : 'failed'}:`, result);
        break;

      case 'bulk_delete':
        if (!duplicateIds || duplicateIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Duplicate IDs are required for bulk delete operation' },
            { status: 400 }
          );
        }

        const deleteSuccess = await DuplicateDetectionService.bulkDeleteDuplicates(duplicateIds);
        result = { success: deleteSuccess, deleted: duplicateIds.length };

        console.log(`✅ [API] Bulk delete operation ${deleteSuccess ? 'successful' : 'failed'}:`, result);
        break;

      case 'bulk_merge_groups':
        if (!groupIds || groupIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Group IDs are required for bulk merge groups operation' },
            { status: 400 }
          );
        }

        console.log(`🔄 [API] Processing ${groupIds.length} groups for bulk merge`);

        const mergePromises = groupIds.map(async (groupId: string) => {
          try {
            // Get the group data by analyzing duplicates and finding the specific group
            const allResults = await DuplicateDetectionService.analyzeAllDuplicates();
            const group = allResults.duplicateGroups.find(g => g.id === groupId);

            if (!group || group.matches.length < 2) {
              return { groupId, success: false, error: 'Group not found or insufficient matches' };
            }

            const masterId = group.matches[0].id;
            const duplicateIds = group.matches.slice(1).map(m => m.id);

            const success = await DuplicateDetectionService.mergeDuplicates(masterId, duplicateIds);
            return { groupId, success, merged: duplicateIds.length };
          } catch (error) {
            console.error(`❌ [API] Error processing group ${groupId}:`, error);
            return { groupId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const mergeResults = await Promise.all(mergePromises);
        const successfulMerges = mergeResults.filter(r => r.success).length;

        result = {
          success: successfulMerges > 0,
          processed: groupIds.length,
          successful: successfulMerges,
          results: mergeResults
        };

        console.log(`✅ [API] Bulk merge groups operation complete:`, result);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: merge, bulk_delete, bulk_merge_groups' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [API] Error processing duplicate operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process duplicate operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}