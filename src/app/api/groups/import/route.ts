import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/group-service';
import { AccountService } from '@/lib/services/account-service';

interface ImportGroup {
  name: string;
  url?: string;
  memberCount?: number;
  language?: string;
  description?: string;
}

interface ImportRequest {
  groups: ImportGroup[];
  targetAccountId: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [GROUPS-IMPORT] Import request received');
    
    const body: ImportRequest = await request.json();
    const { groups, targetAccountId } = body;

    // Validate request
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      console.error('❌ [GROUPS-IMPORT] Invalid groups array');
      return NextResponse.json(
        { error: 'Invalid groups array provided' },
        { status: 400 }
      );
    }

    if (!targetAccountId) {
      console.error('❌ [GROUPS-IMPORT] Missing target account ID');
      return NextResponse.json(
        { error: 'Target account ID is required' },
        { status: 400 }
      );
    }

    console.log(`📊 [GROUPS-IMPORT] Processing ${groups.length} groups for account: ${targetAccountId}`);

    // Verify target account exists
    const targetAccount = await AccountService.getAccountById(targetAccountId);
    if (!targetAccount) {
      console.error(`❌ [GROUPS-IMPORT] Target account not found: ${targetAccountId}`);
      return NextResponse.json(
        { error: 'Target Facebook account not found' },
        { status: 404 }
      );
    }

    console.log(`✅ [GROUPS-IMPORT] Target account verified: ${targetAccount.name}`);

    // Get existing groups to check for duplicates (only for the SAME account)
    const existingGroups = await GroupService.getAllGroups();
    const existingGroupsForAccount = existingGroups.filter(g => g.accountId === targetAccountId);
    
    // Create lookup sets only for the current target account
    const existingUrlsForAccount = new Set(existingGroupsForAccount.map(g => g.url).filter(Boolean));
    // Names set is fallback when URL is not available
    const existingNamesForAccount = new Set(existingGroupsForAccount.map(g => g.name.toLowerCase()).filter(Boolean));

    // Track duplicates within the current import list
    const importedGroupNames = new Set<string>();
    const importedGroupUrls = new Set<string>();

    const results = {
      imported: 0,
      failed: 0,
      total: groups.length,
      errors: [] as Array<{ groupName: string; error: string }>,
      duplicates: 0,
      message: `Successfully processed ${groups.length} groups`
    };

    // Process each group
    for (let i = 0; i < groups.length; i++) {
      const groupData = groups[i];
      
      try {
        // Validate required fields
        if (!groupData.name || groupData.name.trim() === '') {
          results.failed++;
          results.errors.push({
            groupName: `Group ${i + 1}`,
            error: 'Group name is required'
          });
          continue;
        }

        const groupName = groupData.name.trim();
        const groupUrl = groupData.url?.trim() || '';
        const memberCount = groupData.memberCount || 0;
        const language = groupData.language?.trim() || 'Unknown';
        const description = groupData.description?.trim() || '';

        // Check for duplicates - prioritize URL, fallback to name
        const isDuplicate =
          // Check against existing groups for the SAME account (prioritize URL)
          (groupUrl && existingUrlsForAccount.has(groupUrl)) ||
          (groupUrl && importedGroupUrls.has(groupUrl)) ||
          // Fallback to name only if no URL provided
          (!groupUrl && existingNamesForAccount.has(groupName.toLowerCase())) ||
          (!groupUrl && importedGroupNames.has(groupName.toLowerCase()));
        
        if (isDuplicate) {
          results.duplicates++;
          const reason = groupUrl ? 'same URL' : 'same name';
          console.log(`⚠️ [GROUPS-IMPORT] Duplicate detected (${reason}) for account ${targetAccountId}: ${groupName}`);
          continue;
        }

        // Prepare group data for Firebase
        const newGroup = {
          name: groupName,
          url: groupUrl,
          tags: [language.toLowerCase(), 'imported'], // Add language and 'imported' as tags
          language: language,
          accountId: targetAccountId,
          memberCount: memberCount,
          // Additional fields for enhanced features
          assigned_accounts: [targetAccountId],
          isActive: true,
          warningCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create group in Firebase
        const groupId = await GroupService.createGroup(newGroup);
        
        if (groupId) {
          results.imported++;
          // Update local sets for duplicate detection within this import batch
          if (groupUrl) importedGroupUrls.add(groupUrl);
          importedGroupNames.add(groupName.toLowerCase());
          
          const logUrl = groupUrl ? ` (URL: ${groupUrl})` : '';
          console.log(`✅ [GROUPS-IMPORT] Group imported: ${groupName}${logUrl} (ID: ${groupId})`);
        } else {
          results.failed++;
          results.errors.push({
            groupName: groupName,
            error: 'Failed to save group to database'
          });
        }

      } catch (groupError) {
        console.error(`❌ [GROUPS-IMPORT] Error processing group ${i + 1}:`, groupError);
        results.failed++;
        results.errors.push({
          groupName: `Group ${i + 1}`,
          error: groupError instanceof Error ? groupError.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 [GROUPS-IMPORT] Results: ${results.imported} imported, ${results.failed} failed, ${results.duplicates} duplicates`);

    // Return results
    return NextResponse.json(results);

  } catch (error) {
    console.error('💥 [GROUPS-IMPORT] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Facebook Groups Import API - Use POST method to import groups' },
    { status: 200 }
  );
}