import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacebookGroup, ImportResult, ImportDetail } from '@/lib/types';
import { GroupStateService } from './group-state-service';

export interface ImportGroupData {
  fb_group_id: string;
  name: string;
  url: string;
  tags?: string[];
  language?: string;
  account_id?: string;
}

export class ImportService {
  // Safe import with deduplication and account assignment
  static async importGroups(
    groups: ImportGroupData[],
    defaultAccountId?: string,
    rampUpHours: number = 48
  ): Promise<ImportResult> {
    const result: ImportResult = {
      added: 0,
      skipped: 0,
      updated: 0,
      errors: [],
      details: [],
    };

    // Deduplicate input by fb_group_id
    const uniqueGroups = this.deduplicateGroups(groups);

    for (const groupData of uniqueGroups) {
      try {
        const importDetail = await this.processGroupImport(groupData, defaultAccountId, rampUpHours);
        result.details.push(importDetail);

        switch (importDetail.action) {
          case 'added':
            result.added++;
            break;
          case 'skipped':
            result.skipped++;
            break;
          case 'updated':
            result.updated++;
            break;
          case 'error':
            result.errors.push(importDetail.message || 'Unknown error');
            break;
        }
      } catch (error) {
        console.error(`Error importing group ${groupData.fb_group_id}:`, error);
        result.details.push({
          fb_group_id: groupData.fb_group_id,
          action: 'error',
          message: `Import failed: ${error}`,
        });
        result.errors.push(`Failed to import group ${groupData.fb_group_id}: ${error}`);
      }
    }

    return result;
  }

  // Deduplicate groups by fb_group_id
  private static deduplicateGroups(groups: ImportGroupData[]): ImportGroupData[] {
    const seen = new Set<string>();
    return groups.filter(group => {
      if (seen.has(group.fb_group_id)) {
        return false;
      }
      seen.add(group.fb_group_id);
      return true;
    });
  }

  // Process individual group import
  private static async processGroupImport(
    groupData: ImportGroupData,
    defaultAccountId?: string,
    rampUpHours: number = 48
  ): Promise<ImportDetail> {
    const { fb_group_id, account_id } = groupData;
    const assignedAccountId = account_id || defaultAccountId;

    // Check if group state already exists
    const existingState = await GroupStateService.getGroupState(fb_group_id);

    if (existingState) {
      // Check if account is already assigned
      if (assignedAccountId && existingState.assigned_accounts.includes(assignedAccountId)) {
        return {
          fb_group_id,
          action: 'skipped',
          message: `Account ${assignedAccountId} already assigned to group`,
          account_id: assignedAccountId,
        };
      }

      // Add account to existing group
      if (assignedAccountId) {
        await GroupStateService.assignAccountToGroup(fb_group_id, assignedAccountId);
        return {
          fb_group_id,
          action: 'updated',
          message: `Added account ${assignedAccountId} to existing group`,
          account_id: assignedAccountId,
        };
      }

      return {
        fb_group_id,
        action: 'skipped',
        message: 'Group exists but no account to assign',
      };
    }

    // Create new group state
    if (!assignedAccountId) {
      return {
        fb_group_id,
        action: 'error',
        message: 'No account ID provided for new group',
      };
    }

    try {
      await GroupStateService.createGroupState(fb_group_id, assignedAccountId, rampUpHours);

      // Optionally create the actual group record if needed
      await this.createGroupRecord(groupData);

      return {
        fb_group_id,
        action: 'added',
        message: `Created new group with account ${assignedAccountId}`,
        account_id: assignedAccountId,
      };
    } catch (error) {
      return {
        fb_group_id,
        action: 'error',
        message: `Failed to create group state: ${error}`,
      };
    }
  }

  // Create group record in groups collection
  private static async createGroupRecord(groupData: ImportGroupData): Promise<void> {
    const groupsRef = collection(db, 'groups');
    const groupDoc = {
      name: groupData.name,
      url: groupData.url,
      tags: groupData.tags || [],
      language: groupData.language || 'en',
      warningCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(groupsRef), groupDoc);
  }

  // Validate import data
  static validateImportData(groups: ImportGroupData[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (groups.length === 0) {
      errors.push('No groups provided for import');
    }

    groups.forEach((group, index) => {
      if (!group.fb_group_id) {
        errors.push(`Group ${index + 1}: Missing fb_group_id`);
      }

      if (!group.name) {
        errors.push(`Group ${index + 1}: Missing name`);
      }

      if (!group.url) {
        errors.push(`Group ${index + 1}: Missing url`);
      }

      // Validate URL format (basic check)
      if (group.url && !group.url.includes('facebook.com')) {
        errors.push(`Group ${index + 1}: URL does not appear to be a Facebook group`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Preview import without making changes
  static async previewImport(
    groups: ImportGroupData[],
    defaultAccountId?: string
  ): Promise<{
    total: number;
    wouldAdd: number;
    wouldSkip: number;
    wouldUpdate: number;
    wouldError: number;
    preview: ImportDetail[];
  }> {
    const uniqueGroups = this.deduplicateGroups(groups);
    const preview: ImportDetail[] = [];
    let wouldAdd = 0;
    let wouldSkip = 0;
    let wouldUpdate = 0;
    let wouldError = 0;

    for (const groupData of uniqueGroups) {
      const { fb_group_id, account_id } = groupData;
      const assignedAccountId = account_id || defaultAccountId;

      // Check if group state already exists
      const existingState = await GroupStateService.getGroupState(fb_group_id);

      if (existingState) {
        if (assignedAccountId && existingState.assigned_accounts.includes(assignedAccountId)) {
          preview.push({
            fb_group_id,
            action: 'skipped',
            message: `Account ${assignedAccountId} already assigned to group`,
            account_id: assignedAccountId,
          });
          wouldSkip++;
        } else if (assignedAccountId) {
          preview.push({
            fb_group_id,
            action: 'updated',
            message: `Would add account ${assignedAccountId} to existing group`,
            account_id: assignedAccountId,
          });
          wouldUpdate++;
        } else {
          preview.push({
            fb_group_id,
            action: 'skipped',
            message: 'Group exists but no account to assign',
          });
          wouldSkip++;
        }
      } else {
        if (!assignedAccountId) {
          preview.push({
            fb_group_id,
            action: 'error',
            message: 'No account ID provided for new group',
          });
          wouldError++;
        } else {
          preview.push({
            fb_group_id,
            action: 'added',
            message: `Would create new group with account ${assignedAccountId}`,
            account_id: assignedAccountId,
          });
          wouldAdd++;
        }
      }
    }

    return {
      total: uniqueGroups.length,
      wouldAdd,
      wouldSkip,
      wouldUpdate,
      wouldError,
      preview,
    };
  }

  // Export group assignments for backup/audit
  static async exportGroupAssignments(): Promise<{
    groups: Array<{
      fb_group_id: string;
      assigned_accounts: string[];
      last_post_times: Date[];
      global_daily_count: number;
      initial_ramp_until?: Date;
    }>;
    exported_at: Date;
  }> {
    try {
      const q = query(collection(db, 'group_states'));
      const querySnapshot = await getDocs(q);

      const groups = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          fb_group_id: data.fb_group_id,
          assigned_accounts: data.assigned_accounts || [],
          last_post_times: data.last_post_times?.map((t: { toDate: () => Date } | undefined) => t?.toDate()).filter((t: Date | undefined): t is Date => Boolean(t)) || [],
          global_daily_count: data.global_daily_count || 0,
          initial_ramp_until: data.initial_ramp_until?.toDate(),
        };
      });

      return {
        groups,
        exported_at: new Date(),
      };
    } catch (error) {
      console.error('Error exporting group assignments:', error);
      throw new Error('Failed to export group assignments');
    }
  }
}