import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CallCenter,
  DailyCallSession,
  DailyCallCenter,
  CallLog,
} from '@/lib/types/external-crm';
import { ExternalCRMService, ExternalCRMSubcollectionsService } from './external-crm-service';

const COLLECTION_NAMES = {
  DAILY_CALL_SESSIONS: 'dailyCallSessions',
} as const;

export class DailyCallsService {
  // Get or create today's daily call session
  static async getOrCreateTodaySession(): Promise<DailyCallSession> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if today's session already exists
      const q = query(
        collection(db, COLLECTION_NAMES.DAILY_CALL_SESSIONS),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date,
          selectedCallCenterIds: data.selectedCallCenterIds || [],
          alreadyCalledIds: data.alreadyCalledIds || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        };
      }

      // Create new session for today
      const newSession: Omit<DailyCallSession, 'id'> = {
        date: today,
        selectedCallCenterIds: [],
        alreadyCalledIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Check if it's a new day and reset already called list
      await this.checkAndResetForNewDay();

      const docRef = await addDoc(collection(db, COLLECTION_NAMES.DAILY_CALL_SESSIONS), {
        ...newSession,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return {
        id: docRef.id,
        ...newSession,
      };
    } catch (error) {
      console.error('Error getting or creating daily call session:', error);
      throw error;
    }
  }

  // Update daily call session
  static async updateSession(sessionId: string, updates: Partial<DailyCallSession>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAMES.DAILY_CALL_SESSIONS, sessionId);
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating daily call session:', error);
      throw error;
    }
  }

  // Get call centers with their call history for filtering
  static async getCallCentersWithHistory(): Promise<DailyCallCenter[]> {
    try {
      console.log('🔍 [DAILY-CALLS] Starting to fetch call centers...');
      const callCenters = await ExternalCRMService.getCallCenters();
      console.log(`📞 [DAILY-CALLS] Found ${callCenters.length} call centers`);

      if (callCenters.length === 0) {
        console.log('⚠️ [DAILY-CALLS] No call centers found, returning empty array');
        return [];
      }

      const dailyCallCenters: DailyCallCenter[] = [];

      // Process call centers in smaller batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < callCenters.length; i += batchSize) {
        const batch = callCenters.slice(i, i + batchSize);
        console.log(`🔄 [DAILY-CALLS] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(callCenters.length / batchSize)}`);

        for (const callCenter of batch) {
          try {
            // Get call history for this call center
            const callHistory = await ExternalCRMSubcollectionsService.getCallHistory(callCenter.id.toString());

            // Calculate call statistics
            const callCount = callHistory.length;
            const lastCalledDate = callHistory.length > 0
              ? callHistory[0].date // Most recent call
              : undefined;

            // Calculate days since last call
            let daysSinceLastCall = Infinity;
            if (lastCalledDate) {
              const lastCallDate = new Date(lastCalledDate);
              const now = new Date();
              daysSinceLastCall = Math.floor((now.getTime() - lastCallDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            // Check if needs new phone number (called more than 3 times without response)
            const needsNewPhoneNumber = callCount >= 3 && daysSinceLastCall > 16;

            dailyCallCenters.push({
              callCenter,
              callCount,
              lastCalledDate,
              needsNewPhoneNumber,
              daysSinceLastCall,
            });
          } catch (error) {
            console.error(`❌ [DAILY-CALLS] Error processing call center ${callCenter.id}:`, error);
            // For call centers with errors, create a basic entry without call history
            dailyCallCenters.push({
              callCenter,
              callCount: 0,
              lastCalledDate: undefined,
              needsNewPhoneNumber: false,
              daysSinceLastCall: Infinity,
            });
          }
        }

        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < callCenters.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ [DAILY-CALLS] Successfully processed ${dailyCallCenters.length} call centers`);
      return dailyCallCenters;
    } catch (error) {
      console.error('❌ [DAILY-CALLS] Error getting call centers with history:', error);
      // Return empty array instead of throwing to prevent UI from breaking
      return [];
    }
  }

  // Optimized selection - get call centers by IDs only
  static async getCallCentersByIds(callCenterIds: string[]): Promise<DailyCallCenter[]> {
    try {
      if (callCenterIds.length === 0) return [];

      console.log(`🔍 [DAILY-CALLS] Fetching ${callCenterIds.length} specific call centers...`);

      // Get call centers in batches to avoid query limits
      const batchSize = 10;
      const results: DailyCallCenter[] = [];

      for (let i = 0; i < callCenterIds.length; i += batchSize) {
        const batchIds = callCenterIds.slice(i, i + batchSize);

        // Query for this batch
        const q = query(
          collection(db, 'callCenters'),
          where('__name__', 'in', batchIds.slice(0, 10)) // Firestore 'in' limit is 10
        );

        const querySnapshot = await getDocs(q);

        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          const callCenter = {
            id: doc.id,
            name: data.name || '',
            country: data.country || '',
            city: data.city || '',
            positions: data.positions || 0,
            status: data.status || 'New',
            value: data.value || 0,
            currency: data.currency || 'USD',
            phones: data.phones || [],
            emails: data.emails || [],
            website: data.website || '',
            address: data.address || '',
            source: data.source || '',
            type: data.type || '',
            tags: data.tags || [],
            markets: data.markets || [],
            competitors: data.competitors || [],
            socialMedia: data.socialMedia || [],
            foundDate: data.foundDate || '',
            lastContacted: data.lastContacted?.toDate?.()?.toISOString() || data.lastContacted,
            notes: data.notes || '',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          } as CallCenter;

          // Get call history for this call center
          let callHistory: CallLog[] = [];
          try {
            callHistory = await ExternalCRMSubcollectionsService.getCallHistory(doc.id);
          } catch (error) {
            console.warn(`⚠️ [DAILY-CALLS] Could not get call history for ${doc.id}:`, error);
          }

          // Calculate call statistics
          const callCount = callHistory.length;
          const lastCalledDate = callHistory.length > 0 ? callHistory[0].date : undefined;

          let daysSinceLastCall = Infinity;
          if (lastCalledDate) {
            const lastCallDate = new Date(lastCalledDate);
            const now = new Date();
            daysSinceLastCall = Math.floor((now.getTime() - lastCallDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          const needsNewPhoneNumber = callCount >= 3 && daysSinceLastCall > 16;

          results.push({
            callCenter,
            callCount,
            lastCalledDate,
            needsNewPhoneNumber,
            daysSinceLastCall,
          });
        }
      }

      console.log(`✅ [DAILY-CALLS] Successfully fetched ${results.length} call centers`);
      return results;
    } catch (error) {
      console.error('❌ [DAILY-CALLS] Error getting call centers by IDs:', error);
      return [];
    }
  }

  // Optimized random selection using database-level filtering
  static async selectRandomCallCentersOptimized(count: number = 20): Promise<DailyCallCenter[]> {
    try {
      console.log(`🎲 [DAILY-CALLS] Selecting ${count} random call centers (optimized)...`);

      // Get a larger sample from database first
      const sampleSize = Math.min(count * 5, 100); // Get 5x what we need, max 100
      const callCenters = await ExternalCRMService.getCallCenters(undefined, undefined, 0, sampleSize);

      if (callCenters.length === 0) {
        console.log('⚠️ [DAILY-CALLS] No call centers available for selection');
        return [];
      }

      console.log(`📊 [DAILY-CALLS] Got ${callCenters.length} call centers sample`);

      // Filter eligible call centers (basic filtering)
      const sixteenDaysAgo = new Date();
      sixteenDaysAgo.setDate(sixteenDaysAgo.getDate() - 16);

      const eligibleCallCenters = callCenters.filter(cc => {
        // Exclude if no phones available
        if (!cc.phones || cc.phones.length === 0) return false;

        // Exclude if has steps (as per requirements)
        if (cc.steps && cc.steps.length > 0) return false;

        // Basic last contacted check (we'll do detailed check later)
        if (cc.lastContacted && new Date(cc.lastContacted) >= sixteenDaysAgo) return false;

        return true;
      });

      console.log(`✅ [DAILY-CALLS] Found ${eligibleCallCenters.length} potentially eligible call centers`);

      if (eligibleCallCenters.length === 0) {
        console.log('⚠️ [DAILY-CALLS] No eligible call centers found for selection');
        return [];
      }

      // Shuffle and select random call centers
      const shuffled = [...eligibleCallCenters].sort(() => Math.random() - 0.5);
      const selectedIds = shuffled.slice(0, Math.min(count, shuffled.length)).map(cc => cc.id.toString());

      // Now get detailed information for selected call centers
      const selectedWithHistory = await this.getCallCentersByIds(selectedIds);

      // Final filtering based on detailed call history
      const finalSelected = selectedWithHistory.filter(dailyCC => {
        // Double-check 16-day exclusion with detailed history
        if (dailyCC.lastCalledDate && new Date(dailyCC.lastCalledDate) >= sixteenDaysAgo) {
          return false;
        }
        return true;
      });

      console.log(`🎯 [DAILY-CALLS] Successfully selected ${finalSelected.length} call centers`);
      return finalSelected;
    } catch (error) {
      console.error('❌ [DAILY-CALLS] Error selecting random call centers (optimized):', error);
      return [];
    }
  }

  // Generate today's call list (20 call centers + already called from previous days)
  static async generateTodayCallList(): Promise<{
    selectedForToday: DailyCallCenter[];
    alreadyCalled: DailyCallCenter[];
    session: DailyCallSession;
  }> {
    try {
      console.log('🚀 [DAILY-CALLS] Starting to generate today call list...');

      // Get or create today's session
      console.log('📅 [DAILY-CALLS] Getting or creating session...');
      const session = await this.getOrCreateTodaySession();
      console.log('✅ [DAILY-CALLS] Session ready:', { id: session.id, date: session.date });

      // Check if we already have selected call centers for today
      if (session.selectedCallCenterIds.length > 0) {
        console.log(`📋 [DAILY-CALLS] Using cached ${session.selectedCallCenterIds.length} selected call centers...`);

        // Get only the call centers we need (selected + already called)
        const neededIds = [...session.selectedCallCenterIds, ...session.alreadyCalledIds];
        const callCentersWithHistory = await this.getCallCentersByIds(neededIds);

        const selectedForToday = callCentersWithHistory.filter(dailyCC =>
          session.selectedCallCenterIds.includes(dailyCC.callCenter.id.toString())
        );

        const alreadyCalled = callCentersWithHistory.filter(dailyCC =>
          session.alreadyCalledIds.includes(dailyCC.callCenter.id.toString())
        );

        console.log(`✅ [DAILY-CALLS] Loaded ${selectedForToday.length} selected and ${alreadyCalled.length} already called call centers`);

        return {
          selectedForToday,
          alreadyCalled,
          session,
        };
      }

      // Need to select new call centers for today - use optimized selection
      console.log('🎲 [DAILY-CALLS] No cached selection, selecting new call centers...');
      const selectedForToday = await this.selectRandomCallCentersOptimized(20);
      console.log(`✅ [DAILY-CALLS] Selected ${selectedForToday.length} call centers for today`);

      // Update session with selected call center IDs
      const selectedIds = selectedForToday.map(dailyCC => dailyCC.callCenter.id.toString());
      console.log('💾 [DAILY-CALLS] Updating session with selected call center IDs...');
      await this.updateSession(session.id, {
        selectedCallCenterIds: selectedIds,
      });

      session.selectedCallCenterIds = selectedIds;

      const result = {
        selectedForToday,
        alreadyCalled: [], // No already called on first load
        session,
      };

      console.log('🎉 [DAILY-CALLS] Successfully generated today call list:', {
        selectedCount: result.selectedForToday.length,
        alreadyCalledCount: result.alreadyCalled.length,
        sessionId: result.session.id,
      });

      return result;
    } catch (error) {
      console.error('❌ [DAILY-CALLS] Error generating today call list:', error);
      // Instead of throwing, return a safe fallback
      return {
        selectedForToday: [],
        alreadyCalled: [],
        session: await this.getOrCreateTodaySession(),
      };
    }
  }

  // Move call centers from selected to already called
  static async moveToAlreadyCalled(callCenterIds: string[]): Promise<void> {
    try {
      const session = await this.getOrCreateTodaySession();

      // Add to already called list
      const updatedAlreadyCalledIds = [...new Set([...session.alreadyCalledIds, ...callCenterIds])];

      // Remove from selected list
      const updatedSelectedIds = session.selectedCallCenterIds.filter(id => !callCenterIds.includes(id));

      await this.updateSession(session.id, {
        selectedCallCenterIds: updatedSelectedIds,
        alreadyCalledIds: updatedAlreadyCalledIds,
      });
    } catch (error) {
      console.error('Error moving call centers to already called:', error);
      throw error;
    }
  }

  // Move call centers from already called back to selected for today
  static async moveBackToToday(callCenterIds: string[]): Promise<void> {
    try {
      const session = await this.getOrCreateTodaySession();

      // Add back to selected list
      const updatedSelectedIds = [...new Set([...session.selectedCallCenterIds, ...callCenterIds])];

      // Remove from already called list
      const updatedAlreadyCalledIds = session.alreadyCalledIds.filter(id => !callCenterIds.includes(id));

      await this.updateSession(session.id, {
        selectedCallCenterIds: updatedSelectedIds,
        alreadyCalledIds: updatedAlreadyCalledIds,
      });
    } catch (error) {
      console.error('Error moving call centers back to today:', error);
      throw error;
    }
  }

  // Reset already called list (for new day)
  static async resetAlreadyCalledList(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's session
      const q = query(
        collection(db, COLLECTION_NAMES.DAILY_CALL_SESSIONS),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        await this.updateSession(doc.id, {
          alreadyCalledIds: [],
        });
      }
    } catch (error) {
      console.error('Error resetting already called list:', error);
      throw error;
    }
  }

  // Get call history for a specific call center
  static async getCallCenterCallHistory(callCenterId: string): Promise<CallLog[]> {
    try {
      return await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);
    } catch (error) {
      console.error('Error getting call center call history:', error);
      throw error;
    }
  }

  // Add a call log entry
  static async addCallLog(callCenterId: string, callLog: Omit<CallLog, 'id'>): Promise<string> {
    try {
      return await ExternalCRMSubcollectionsService.addCallLog(callCenterId, callLog);
    } catch (error) {
      console.error('Error adding call log:', error);
      throw error;
    }
  }

  // Check if it's a new day and reset if needed
  static async checkAndResetForNewDay(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if there's a session for today
      const q = query(
        collection(db, COLLECTION_NAMES.DAILY_CALL_SESSIONS),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // It's a new day, reset the already called list
        await this.resetAlreadyCalledList();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for new day:', error);
      return false;
    }
  }
}