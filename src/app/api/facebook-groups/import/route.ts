import { NextRequest, NextResponse } from 'next/server';
import { GroupService } from '@/lib/services/group-service';
import { AccountService } from '@/lib/services/account-service';
import { FacebookGroup } from '@/lib/types';

interface ImportedGroup {
  name: string;
  url: string;
  memberCount?: number;
  language?: string;
  tags?: string[];
  warningCount?: number;
  accountId?: string;
  assigned_accounts?: string[];
}

interface ImportRequest {
  groups: ImportedGroup[];
  targetAccountId?: string; // If all groups should be assigned to this account
}

interface ImportResult {
  success: boolean;
  totalImported: number;
  totalSkipped: number;
  totalErrors: number;
  errors: string[];
  details: {
    groupName: string;
    action: 'imported' | 'skipped' | 'error';
    message?: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { groups, targetAccountId } = body;

    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json(
        { error: 'Invalid request: groups array is required' },
        { status: 400 }
      );
    }

    console.log(`📥 [Facebook Groups Import] Starting import of ${groups.length} groups`);

    const result: ImportResult = {
      success: true,
      totalImported: 0,
      totalSkipped: 0,
      totalErrors: 0,
      errors: [],
      details: []
    };

    // Get existing groups to check for duplicates
    const existingGroups = await GroupService.getAllGroups();
    const existingUrls = new Set(existingGroups.map(g => g.url));
    const existingNames = new Set(existingGroups.map(g => g.name.toLowerCase()));

    // Get accounts for validation
    const allAccounts = await AccountService.getAllAccounts();
    const accountMap = new Map(allAccounts.map(acc => [acc.id, acc]));

    // Process each group
    for (let i = 0; i < groups.length; i++) {
      const importedGroup = groups[i];
      const detail = {
        groupName: importedGroup.name,
        action: 'error' as 'imported' | 'skipped' | 'error',
        message: ''
      };

      try {
        // Validate required fields
        if (!importedGroup.name || !importedGroup.url) {
          detail.message = 'Name and URL are required';
          result.errors.push(`Group ${importedGroup.name || 'Unknown'}: ${detail.message}`);
          result.totalErrors++;
          result.details.push(detail);
          continue;
        }

        // Check for duplicates by URL or name
        if (existingUrls.has(importedGroup.url) || existingNames.has(importedGroup.name.toLowerCase())) {
          detail.action = 'skipped';
          detail.message = 'Group already exists';
          result.totalSkipped++;
          result.details.push(detail);
          continue;
        }

        // Validate account assignment
        let finalAccountId = importedGroup.accountId;
        if (targetAccountId) {
          finalAccountId = targetAccountId;
        }

        if (finalAccountId && !accountMap.has(finalAccountId)) {
          detail.message = `Assigned account ${finalAccountId} does not exist`;
          result.errors.push(`Group ${importedGroup.name}: ${detail.message}`);
          result.totalErrors++;
          result.details.push(detail);
          continue;
        }

        // Create the group data
        const groupData = {
          name: importedGroup.name,
          url: importedGroup.url,
          memberCount: importedGroup.memberCount || 0,
          language: importedGroup.language || 'unknown',
          tags: importedGroup.tags || [],
          warningCount: importedGroup.warningCount || 0,
          accountId: finalAccountId,
          assigned_accounts: finalAccountId ? [finalAccountId] : [],
          isActive: true
        };

        // Create the group
        await GroupService.createGroup(groupData);

        // Add to existing collections for duplicate checking
        existingUrls.add(importedGroup.url);
        existingNames.add(importedGroup.name.toLowerCase());

        detail.action = 'imported';
        detail.message = 'Successfully imported';
        result.totalImported++;
        result.details.push(detail);

        console.log(`✅ [Facebook Groups Import] Imported group: ${importedGroup.name}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        detail.message = `Import failed: ${errorMessage}`;
        result.errors.push(`Group ${importedGroup.name}: ${errorMessage}`);
        result.totalErrors++;
        result.details.push(detail);
        console.error(`❌ [Facebook Groups Import] Error importing group ${importedGroup.name}:`, error);
      }
    }

    // If there are critical errors, mark overall success as false
    if (result.totalErrors > 0 && result.totalImported === 0) {
      result.success = false;
    }

    console.log(`📊 [Facebook Groups Import] Import complete: ${result.totalImported} imported, ${result.totalSkipped} skipped, ${result.totalErrors} errors`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [Facebook Groups Import] Critical error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process import request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get sample JSON format
    const sampleFormat = {
      description: "Facebook Groups Import Format",
      format: "JSON Array",
      required_fields: {
        name: "Group name (string)",
        url: "Facebook group URL (string)"
      },
      optional_fields: {
        memberCount: "Number of members (integer)",
        language: "Group language code (string, e.g., 'en', 'fr', 'ar')",
        tags: "Array of tags (string[])",
        warningCount: "Warning count (integer, default: 0)",
        accountId: "Target Facebook account ID to assign group to"
      },
      sample_data: [
        {
          "name": "Entrepreneurs Network Casablanca",
          "url": "https://www.facebook.com/groups/entrepreneurs.casablanca",
          "memberCount": 15000,
          "language": "fr",
          "tags": ["business", "entrepreneurship", "casablanca"],
          "warningCount": 0,
          "accountId": "account_id_here"
        },
        {
          "name": "Morocco Digital Marketing",
          "url": "https://www.facebook.com/groups/morocco.digital.marketing",
          "memberCount": 8500,
          "language": "ar",
          "tags": ["marketing", "digital", "morocco"],
          "warningCount": 2
        }
      ]
    };

    return NextResponse.json({
      success: true,
      sampleFormat
    });

  } catch (error) {
    console.error('❌ [Facebook Groups Import] Error getting sample format:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sample format' },
      { status: 500 }
    );
  }
}