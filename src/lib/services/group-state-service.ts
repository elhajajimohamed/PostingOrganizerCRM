import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  runTransaction,
  where,
  query,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacebookGroup, GroupContentCombination, EnhancedSchedulingConfig } from '@/lib/types';

const GROUP_STATE_COLLECTION = 'group_states';

export interface GroupState {
  fb_group_id: string;
  assigned_accounts: string[];
  last_post_times: Date[];
  global_daily_count: number;
  initial_ramp_until?: Date;
  recent_combinations: GroupContentCombination[];
  created_at: Date;
  updated_at: Date;
}

export class GroupStateService {
  // Get or create group state
  static async getGroupState(fbGroupId: string): Promise<GroupState | null> {
    try {
      const docRef = doc(db, GROUP_STATE_COLLECTION, fbGroupId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          fb_group_id: data.fb_group_id,
          assigned_accounts: data.assigned_accounts || [],
          last_post_times: data.last_post_times?.map((t: { toDate: () => Date } | undefined) => t?.toDate()).filter((t: Date | undefined): t is Date => Boolean(t)) || [],
          global_daily_count: data.global_daily_count || 0,
          initial_ramp_until: data.initial_ramp_until?.toDate(),
          recent_combinations: data.recent_combinations || [],
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting group state:', error);
      return null;
    }
  }

  // Create new group state
  static async createGroupState(
    fbGroupId: string,
    accountId?: string,
    rampUpHours: number = 48
  ): Promise<void> {
    try {
      const now = new Date();
      const rampUntil = new Date(now.getTime() + (rampUpHours * 60 * 60 * 1000));

      const groupState: Omit<GroupState, 'created_at' | 'updated_at'> = {
        fb_group_id: fbGroupId,
        assigned_accounts: accountId ? [accountId] : [],
        last_post_times: [],
        global_daily_count: 0,
        initial_ramp_until: rampUntil,
        recent_combinations: [],
      };

      const docRef = doc(db, GROUP_STATE_COLLECTION, fbGroupId);
      await setDoc(docRef, {
        ...groupState,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating group state:', error);
      throw new Error('Failed to create group state');
    }
  }

  // Assign account to group
  static async assignAccountToGroup(fbGroupId: string, accountId: string): Promise<void> {
    try {
      const docRef = doc(db, GROUP_STATE_COLLECTION, fbGroupId);
      await updateDoc(docRef, {
        assigned_accounts: arrayUnion(accountId),
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error assigning account to group:', error);
      throw new Error('Failed to assign account to group');
    }
  }

  // Remove account from group
  static async removeAccountFromGroup(fbGroupId: string, accountId: string): Promise<void> {
    try {
      const docRef = doc(db, GROUP_STATE_COLLECTION, fbGroupId);
      await updateDoc(docRef, {
        assigned_accounts: arrayRemove(accountId),
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error removing account from group:', error);
      throw new Error('Failed to remove account from group');
    }
  }

  // Update group posting state atomically
  static async updatePostingState(
    fbGroupId: string,
    accountId: string,
    textVariantId?: string,
    mediaIds?: string[]
  ): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        const docRef = doc(db, GROUP_STATE_COLLECTION, fbGroupId);
        const docSnap = await transaction.get(docRef);

        if (!docSnap.exists()) {
          throw new Error('Group state not found');
        }

        const data = docSnap.data();
        const now = new Date();
        const state: GroupState = {
          fb_group_id: data.fb_group_id,
          assigned_accounts: data.assigned_accounts || [],
          last_post_times: data.last_post_times?.map((t: { toDate: () => Date } | undefined) => t?.toDate()).filter((t: Date | undefined): t is Date => Boolean(t)) || [],
          global_daily_count: data.global_daily_count || 0,
          initial_ramp_until: data.initial_ramp_until?.toDate(),
          recent_combinations: data.recent_combinations || [],
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
        };

        // Check if account is assigned to group
        if (!state.assigned_accounts.includes(accountId)) {
          return false; // Not authorized
        }

        // Update last post times and daily count
        const updatedLastPostTimes = [now, ...state.last_post_times].slice(0, 10); // Keep last 10
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayPosts = state.last_post_times.filter(time =>
          time && time >= todayStart
        ).length + 1;

        // Update recent combinations for duplicate prevention
        let updatedCombinations = state.recent_combinations;
        if (textVariantId && mediaIds) {
          const combination: GroupContentCombination = {
            text_variant_id: textVariantId,
            media_ids: [...mediaIds].sort(), // Sort for consistent comparison
            timestamp: now,
            account_id: accountId,
          };
          updatedCombinations = [combination, ...state.recent_combinations].slice(0, 20);
        }

        // Update state
        transaction.update(docRef, {
          last_post_times: updatedLastPostTimes.map(t => new Date(t)),
          global_daily_count: todayPosts,
          recent_combinations: updatedCombinations,
          updated_at: serverTimestamp(),
        });

        return true;
      });
    } catch (error) {
      console.error('Error updating posting state:', error);
      return false;
    }
  }

  // Check if group can accept post from account
  static async canGroupAcceptPost(
    fbGroupId: string,
    accountId: string,
    config: EnhancedSchedulingConfig
  ): Promise<{
    canPost: boolean;
    reason?: string;
    waitTimeMinutes?: number;
  }> {
    try {
      const state = await this.getGroupState(fbGroupId);
      if (!state) {
        return { canPost: false, reason: 'Group state not found' };
      }

      // Check if account is assigned
      if (!state.assigned_accounts.includes(accountId)) {
        return { canPost: false, reason: 'Account not assigned to group' };
      }

      const now = new Date();

      // Check ramp-up period
      if (state.initial_ramp_until && now < state.initial_ramp_until) {
        const waitTimeMinutes = Math.ceil((state.initial_ramp_until.getTime() - now.getTime()) / (60 * 1000));
        return {
          canPost: false,
          reason: 'Group in ramp-up period',
          waitTimeMinutes
        };
      }

      // Check global cooldown
      if (state.last_post_times.length > 0) {
        const hoursSinceLastPost = (now.getTime() - state.last_post_times[0].getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < (config.global_group_cooldown_hours || 72)) {
          const waitTimeMinutes = Math.ceil(((config.global_group_cooldown_hours || 72) * 60) - (hoursSinceLastPost * 60));
          return {
            canPost: false,
            reason: 'Global group cooldown active',
            waitTimeMinutes
          };
        }
      }

      // Check daily limit
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayPosts = state.last_post_times.filter(time => time >= todayStart).length;
      if (todayPosts >= (config.max_group_posts_per_24h || 1)) {
        const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const waitTimeMinutes = Math.ceil((tomorrowStart.getTime() - now.getTime()) / (60 * 1000));
        return {
          canPost: false,
          reason: 'Daily post limit reached',
          waitTimeMinutes
        };
      }

      return { canPost: true };
    } catch (error) {
      console.error('Error checking group availability:', error);
      return { canPost: false, reason: 'Error checking group state' };
    }
  }

  // Check for duplicate content
  static async checkDuplicateContent(
    fbGroupId: string,
    textVariantId: string,
    mediaIds: string[],
    windowDays: number = 7
  ): Promise<boolean> {
    try {
      const state = await this.getGroupState(fbGroupId);
      if (!state) return false;

      const sortedMediaIds = [...mediaIds].sort();
      const windowStart = new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000));

      return state.recent_combinations.some(combo =>
        combo.timestamp >= windowStart &&
        combo.text_variant_id === textVariantId &&
        JSON.stringify(combo.media_ids) === JSON.stringify(sortedMediaIds)
      );
    } catch (error) {
      console.error('Error checking duplicate content:', error);
      return false;
    }
  }

  // Get groups available for account
  static async getAvailableGroupsForAccount(
    accountId: string,
    config: EnhancedSchedulingConfig
  ): Promise<string[]> {
    try {
      const q = query(collection(db, GROUP_STATE_COLLECTION));
      const querySnapshot = await getDocs(q);

      const availableGroups: string[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const state: GroupState = {
          fb_group_id: data.fb_group_id,
          assigned_accounts: data.assigned_accounts || [],
          last_post_times: data.last_post_times?.map((t: { toDate: () => Date } | undefined) => t?.toDate()).filter((t: Date | undefined): t is Date => Boolean(t)) || [],
          global_daily_count: data.global_daily_count || 0,
          initial_ramp_until: data.initial_ramp_until?.toDate(),
          recent_combinations: data.recent_combinations || [],
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
        };

        if (state.assigned_accounts.includes(accountId)) {
          const canPostResult = await this.canGroupAcceptPost(docSnap.id, accountId, config);
          if (canPostResult.canPost) {
            availableGroups.push(docSnap.id);
          }
        }
      }

      return availableGroups;
    } catch (error) {
      console.error('Error getting available groups:', error);
      return [];
    }
  }

  // Clean up old combinations (remove entries older than window)
  static async cleanupOldCombinations(fbGroupId: string, windowDays: number = 7): Promise<void> {
    try {
      const state = await this.getGroupState(fbGroupId);
      if (!state) return;

      const windowStart = new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000));
      const recentCombinations = state.recent_combinations.filter(
        combo => combo.timestamp >= windowStart
      );

      if (recentCombinations.length !== state.recent_combinations.length) {
        const docRef = doc(db, GROUP_STATE_COLLECTION, fbGroupId);
        await updateDoc(docRef, {
          recent_combinations: recentCombinations,
          updated_at: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error cleaning up old combinations:', error);
    }
  }

  // Get global coordination summary for monitoring
  static async getGroupStateSummary(): Promise<{
    totalGroups: number;
    groupsInCooldown: number;
    groupsAtDailyLimit: number;
    avgPostsPerGroup: number;
    cooldownGroups: Array<{
      name: string;
      lastPostAt?: Date;
      inCooldown: boolean;
      nextAvailableAt?: Date;
    }>;
  }> {
    try {
      const q = query(collection(db, GROUP_STATE_COLLECTION));
      const querySnapshot = await getDocs(q);

      let totalGroups = 0;
      let groupsInCooldown = 0;
      let groupsAtDailyLimit = 0;
      let totalPosts = 0;
      const cooldownGroups: Array<{
        name: string;
        lastPostAt?: Date;
        inCooldown: boolean;
        nextAvailableAt?: Date;
      }> = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const state: GroupState = {
          fb_group_id: data.fb_group_id,
          assigned_accounts: data.assigned_accounts || [],
          last_post_times: data.last_post_times?.map((t: { toDate: () => Date } | undefined) => t?.toDate()).filter((t: Date | undefined): t is Date => Boolean(t)) || [],
          global_daily_count: data.global_daily_count || 0,
          initial_ramp_until: data.initial_ramp_until?.toDate(),
          recent_combinations: data.recent_combinations || [],
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
        };

        totalGroups++;
        totalPosts += state.global_daily_count;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Check if group is in cooldown (last post within cooldown window)
        const isInCooldown = state.last_post_times.length > 0 &&
          (now.getTime() - state.last_post_times[0].getTime()) < (72 * 60 * 60 * 1000); // Default 72h

        // Check if group is at daily limit
        const todayPosts = state.last_post_times.filter(time => time >= todayStart).length;
        const isAtDailyLimit = todayPosts >= 1; // Default 1 post per day

        if (isInCooldown) {
          groupsInCooldown++;
          const nextAvailableAt = state.last_post_times.length > 0
            ? new Date(state.last_post_times[0].getTime() + (72 * 60 * 60 * 1000))
            : undefined;

          cooldownGroups.push({
            name: data.fb_group_id,
            lastPostAt: state.last_post_times[0],
            inCooldown: true,
            nextAvailableAt,
          });
        } else if (isAtDailyLimit) {
          groupsAtDailyLimit++;
        }
      }

      return {
        totalGroups,
        groupsInCooldown,
        groupsAtDailyLimit,
        avgPostsPerGroup: totalGroups > 0 ? totalPosts / totalGroups : 0,
        cooldownGroups,
      };
    } catch (error) {
      console.error('Error getting group state summary:', error);
      return {
        totalGroups: 0,
        groupsInCooldown: 0,
        groupsAtDailyLimit: 0,
        avgPostsPerGroup: 0,
        cooldownGroups: [],
      };
    }
  }
}