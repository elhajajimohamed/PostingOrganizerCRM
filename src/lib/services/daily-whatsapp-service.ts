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
  DailyWhatsAppSession,
  DailyWhatsAppSuggestion,
  DailyWhatsAppHistory,
} from '@/lib/types/external-crm';
import { ExternalCRMService } from './external-crm-service';
import { SettingsService } from './settings-service';
import { PhoneDetectionService } from './phone-detection-service';

const COLLECTION_NAMES = {
  DAILY_WHATSAPP_SESSIONS: 'dailyWhatsAppSessions',
} as const;

export class DailyWhatsAppService {
  // Get or create today's daily WhatsApp session
  static async getOrCreateTodaySession(): Promise<DailyWhatsAppSession> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if today's session already exists
      const q = query(
        collection(db, COLLECTION_NAMES.DAILY_WHATSAPP_SESSIONS),
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
          sentTodayIds: data.sentTodayIds || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        };
      }

      // Create new session for today
      const newSession: Omit<DailyWhatsAppSession, 'id'> = {
        date: today,
        selectedCallCenterIds: [],
        sentTodayIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // TEMPORARILY DISABLED: Check if it's a new day and reset sent today list
      // await this.checkAndResetForNewDay();

      const docRef = await addDoc(collection(db, COLLECTION_NAMES.DAILY_WHATSAPP_SESSIONS), {
        ...newSession,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return {
        id: docRef.id,
        ...newSession,
      };
    } catch (error) {
      console.error('Error getting or creating daily WhatsApp session:', error);
      throw error;
    }
  }

  // Update daily WhatsApp session
  static async updateSession(sessionId: string, updates: Partial<DailyWhatsAppSession>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAMES.DAILY_WHATSAPP_SESSIONS, sessionId);
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating daily WhatsApp session:', error);
      throw error;
    }
  }

  // Generate daily WhatsApp suggestions with rotation logic
  static async generateSuggestions(forceRegenerate = false): Promise<{
    suggestions: DailyWhatsAppSuggestion[];
    sentToday: DailyWhatsAppSuggestion[];
    session: DailyWhatsAppSession;
  }> {
    try {
      console.log('🔄 [DAILY-WHATSAPP] Starting to generate WhatsApp suggestions...');

      // Get settings for configuration
      const settings = await SettingsService.getSettings();
      const dailyWhatsAppConfig = settings?.dailyWhatsApp || this.getDefaultDailyWhatsAppConfig();

      // Get or create today's session
      const session = await this.getOrCreateTodaySession();
      console.log('✅ [DAILY-WHATSAPP] Session ready:', { id: session.id, date: session.date });

      // Check if we already have selected suggestions for today and if session is from today
      // Skip cache if forceRegenerate is true
      const isFromToday = session.date === new Date().toISOString().split('T')[0];
      if (session.selectedCallCenterIds.length > 0 && isFromToday && !forceRegenerate) {
        console.log(`📋 [DAILY-WHATSAPP] Using cached ${session.selectedCallCenterIds.length} selected suggestions...`);

        // Get call centers for selected and sent today
        const neededIds = [...session.selectedCallCenterIds, ...session.sentTodayIds];
        console.log('🔍 [DAILY-WHATSAPP] Fetching call centers for IDs:', neededIds.length);
        const callCenters = await this.getCallCentersByIds(neededIds);
        console.log('✅ [DAILY-WHATSAPP] Retrieved call centers:', callCenters.length);

        // Create suggestions with scheduled times from session data
        const suggestions: DailyWhatsAppSuggestion[] = [];
        const sentToday: DailyWhatsAppSuggestion[] = [];

        for (const cc of callCenters) {
          if (session.selectedCallCenterIds.includes(cc.id)) {
            // For selected suggestions, use stored scheduled time or create new one
            suggestions.push(this.createSuggestionFromCallCenter(cc));
          } else if (session.sentTodayIds.includes(cc.id)) {
            // For sent today, create basic suggestion
            sentToday.push(this.createSuggestionFromCallCenter(cc));
          }
        }

        console.log('📊 [DAILY-WHATSAPP] Created suggestions:', suggestions.length, 'sent today:', sentToday.length);

        suggestions.sort((a, b) => a.timeUntilSend - b.timeUntilSend);
        sentToday.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());

        console.log(`✅ [DAILY-WHATSAPP] Loaded ${suggestions.length} suggestions and ${sentToday.length} sent today`);

        return {
          suggestions,
          sentToday,
          session,
        };
      }

      // Need to generate new suggestions for new day or empty session
      console.log('🎯 [DAILY-WHATSAPP] No cached suggestions for today, generating new ones...');

      // Get Daily Calls session to exclude overlap
      const { DailyCallsService } = await import('./daily-calls-service');
      const dailyCallsSession = await DailyCallsService.getOrCreateTodaySession();
      const excludedIds = [...dailyCallsSession.selectedCallCenterIds, ...dailyCallsSession.alreadyCalledIds];
      console.log('🚫 [DAILY-WHATSAPP] Excluding Daily Calls call centers:', excludedIds.length);

      // Generate suggestions using scored selection
      const selectedForWhatsApp = await this.selectScoredCallCenters(dailyWhatsAppConfig.daily_suggestion_count, excludedIds);
      console.log(`✅ [DAILY-WHATSAPP] Selected ${selectedForWhatsApp.length} call centers for today`);

      // Create suggestions with scheduled times
      const suggestions: DailyWhatsAppSuggestion[] = [];
      let currentTime = new Date();

      selectedForWhatsApp.forEach((cc, index) => {
        const scheduledTime = this.getNextScheduledTime(currentTime, index);
        suggestions.push(this.createSuggestionFromCallCenter(cc, scheduledTime));
        currentTime = scheduledTime;
      });

      // Update session with selected call center IDs
      const selectedIds = suggestions.map(s => s.callCenter.id);

      await this.updateSession(session.id, {
        selectedCallCenterIds: selectedIds,
        sentTodayIds: [], // Reset sent today for new day
      });

      session.selectedCallCenterIds = selectedIds;
      session.sentTodayIds = [];

      const result = {
        suggestions,
        sentToday: [], // No sent today on first generation
        session,
      };

      console.log('🎉 [DAILY-WHATSAPP] Successfully generated WhatsApp suggestions:', {
        suggestionsCount: result.suggestions.length,
        sentTodayCount: result.sentToday.length,
        sessionId: result.session.id,
      });

      return result;
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP] Error generating suggestions:', error);
      // Return safe fallback
      return {
        suggestions: [],
        sentToday: [],
        session: await this.getOrCreateTodaySession(),
      };
    }
  }

  // Select call centers using scoring logic (similar to Daily Calls)
  private static async selectScoredCallCenters(count: number = 10, excludedIds: string[] = []): Promise<CallCenter[]> {
    try {
      console.log(`🎯 [DAILY-WHATSAPP] Selecting ${count} scored call centers...`);

      // Get settings for configuration
      const settings = await SettingsService.getSettings();
      const dailyWhatsAppConfig = settings?.dailyWhatsApp || this.getDefaultDailyWhatsAppConfig();

      // Get all call centers
      const callCenters = await ExternalCRMService.getCallCenters();

      // DEBUG: Log suspicious call centers
      const suspiciousNames = ['Anonymous', 'Inconnu'];
      const suspiciousCCs = callCenters.filter(cc =>
        suspiciousNames.some(name => cc.name.includes(name))
      );
      if (suspiciousCCs.length > 0) {
        console.log('🚨 [DAILY-WHATSAPP] Found suspicious call centers:', suspiciousCCs.map(cc => ({
          id: cc.id,
          name: cc.name,
          phones: cc.phones,
          phone_infos: cc.phone_infos,
          mobilePhones: cc.mobilePhones,
          businessType: cc.businessType,
          status: cc.status
        })));
      }

      if (callCenters.length === 0) {
        console.log('⚠️ [DAILY-WHATSAPP] No call centers available for selection');
        return [];
      }

      console.log(`📊 [DAILY-WHATSAPP] Got ${callCenters.length} call centers to evaluate`);
      console.log(`🚫 [DAILY-WHATSAPP] Excluding ${excludedIds.length} call centers from selection`);

      // First pass: Apply basic filters that don't require history
      const basicFiltered = callCenters.filter(callCenter => {
        // Exclude Daily Calls overlap
        if (excludedIds.includes(callCenter.id.toString())) return false;

        // Exclude clients
        if (callCenter.status === 'Closed-Won') return false;

        // Exclude manually marked "No WhatsApp" phones
        if (callCenter.no_whatsapp_phones && callCenter.no_whatsapp_phones.length > 0) return false;

        // Exclude call centers with placeholder names
        const placeholderNames = ['Anonymous', 'Inconnu'];
        if (placeholderNames.some(name => callCenter.name.includes(name))) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center with placeholder name:', callCenter.id, callCenter.name);
          return false;
        }

        // Must have mobile phone with WhatsApp confidence
        const hasMobilePhone = callCenter.phone_infos?.some(phone =>
          phone.is_mobile && phone.whatsapp_confidence >= 0.7
        ) || (callCenter.mobilePhones && callCenter.mobilePhones.length > 0);

        if (!hasMobilePhone) return false;

        // Must be call-center type or not specified
        const isCallCenterType = callCenter.businessType === 'call-center' || !callCenter.businessType;

        return isCallCenterType;
      });

      console.log(`📊 [DAILY-WHATSAPP] After basic filtering: ${basicFiltered.length} call centers`);

      if (basicFiltered.length === 0) {
        console.log('⚠️ [DAILY-WHATSAPP] No call centers passed basic filters');
        return [];
      }

      // Second pass: Apply filters that require database queries (recent daily calls history, steps, calendar)
      const finalFiltered = await Promise.all(basicFiltered.map(async (callCenter) => {
        // Exclude if appeared in daily calls within the last 7 days
        let appearedInDailyCallsRecently = false;
        try {
          const recentDailyCallsSessions = await this.getRecentDailyCallsSessions(7);
          appearedInDailyCallsRecently = recentDailyCallsSessions.some((session: any) =>
            session.selectedCallCenterIds?.includes(callCenter.id.toString())
          );
        } catch (error) {
          console.warn(`⚠️ [DAILY-WHATSAPP] Could not check recent daily calls sessions for ${callCenter.id}:`, error);
          // Continue without excluding - better to include than exclude incorrectly
        }

        if (appearedInDailyCallsRecently) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center that appeared in daily calls recently:', callCenter.id, callCenter.name);
          return null;
        }

        // Exclude if has call logs in the past 15 days
        const hasRecentCallLogs = await this.hasRecentCallLogs(callCenter.id, 15);
        if (hasRecentCallLogs) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center with recent call logs:', callCenter.id, callCenter.name);
          return null;
        }

        // Exclude if has calendar events today (tasks)
        const hasCalendarEventsToday = await this.hasCalendarEventsToday(callCenter.id);
        if (hasCalendarEventsToday) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center with calendar events today:', callCenter.id, callCenter.name);
          return null;
        }

        // Exclude if appears in today's daily calls
        const appearsInTodaysDailyCalls = await this.appearsInTodaysDailyCalls(callCenter.id);
        if (appearsInTodaysDailyCalls) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center that appears in today\'s daily calls:', callCenter.id, callCenter.name);
          return null;
        }

        // Exclude if has any steps
        const hasSteps = await this.hasSteps(callCenter.id);
        if (hasSteps) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center with steps:', callCenter.id, callCenter.name);
          return null;
        }

        // Exclude if has any calendar events
        const hasCalendarEvents = await this.hasCalendarEvents(callCenter.id);
        if (hasCalendarEvents) {
          console.log('🚫 [DAILY-WHATSAPP] Excluding call center with calendar events:', callCenter.id, callCenter.name);
          return null;
        }

        return callCenter;
      }));

      const filteredCallCenters = finalFiltered.filter(cc => cc !== null) as CallCenter[];

      console.log(`📊 [DAILY-WHATSAPP] After all filtering: ${filteredCallCenters.length} call centers`);

      if (basicFiltered.length === 0) {
        console.log('⚠️ [DAILY-WHATSAPP] No call centers passed basic filters');
        return [];
      }

      // Limit to a reasonable number to avoid performance issues
      const maxToProcess = Math.min(filteredCallCenters.length, 100); // Process max 100 call centers
      const callCentersToProcess = filteredCallCenters.slice(0, maxToProcess);

      console.log(`📊 [DAILY-WHATSAPP] Processing ${callCentersToProcess.length} call centers for scoring`);

      // Sort by computed score and take top N
      const selected = callCentersToProcess
        .map(cc => ({
          callCenter: cc,
          score: this.computeWhatsAppScore(cc, dailyWhatsAppConfig)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(count, callCentersToProcess.length))
        .map(item => item.callCenter);

      console.log(`🎯 [DAILY-WHATSAPP] Successfully selected ${selected.length} call centers with average score: ${(selected.reduce((sum, cc) => sum + this.computeWhatsAppScore(cc, dailyWhatsAppConfig), 0) / selected.length).toFixed(2)}`);
      return selected;
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP] Error selecting scored call centers:', error);
      return [];
    }
  }

  // Compute WhatsApp score for a call center
  private static computeWhatsAppScore(callCenter: CallCenter, config: any): number {
    try {
      // Mobile confidence score (0.40 weight)
      const mobileConfidence = callCenter.phone_infos?.find(p => p.is_mobile)?.whatsapp_confidence || 0;
      const mobileScore = mobileConfidence;

      // Positions score (0.25 weight) - normalize to 0-1
      const positionsScore = Math.min((callCenter.positions || 0) / 50, 1);

      // Days since last contact score (0.20 weight)
      let daysSinceLastContact = 30; // Default
      if (callCenter.last_contacted_via_whatsapp) {
        const lastContactDate = new Date(callCenter.last_contacted_via_whatsapp);
        const now = new Date();
        daysSinceLastContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      const lastContactScore = Math.min(daysSinceLastContact / 30, 1);

      // Mobile phones count score (0.10 weight)
      const mobileCountScore = Math.min((callCenter.phone_infos?.filter(p => p.is_mobile).length || 0) / 3, 1);

      // Business type score (0.05 weight)
      const businessTypeScore = callCenter.businessType === 'call-center' ? 1 : 0.7;

      // Calculate weighted score
      const score =
        mobileScore * 0.40 +
        positionsScore * 0.25 +
        lastContactScore * 0.20 +
        mobileCountScore * 0.10 +
        businessTypeScore * 0.05;

      // Normalize to 0-100
      return Math.min(100, Math.max(0, score * 100));
    } catch (error) {
      console.warn('⚠️ [DAILY-WHATSAPP] Error computing score for call center:', error);
      return 50; // Default neutral score
    }
  }

  // Get default Daily WhatsApp configuration
  private static getDefaultDailyWhatsAppConfig() {
    return {
      daily_suggestion_count: 10,
      scoring_weights: {
        mobile_confidence: 0.40,
        positions_count: 0.25,
        days_since_last_contact: 0.20,
        mobile_count: 0.10,
        business_type: 0.05
      }
    };
  }

  // Check if it's a new day and reset if needed
  static async checkAndResetForNewDay(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if there's a session for today
      const q = query(
        collection(db, COLLECTION_NAMES.DAILY_WHATSAPP_SESSIONS),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // It's a new day, reset sent today list
        console.log('🌅 [DAILY-WHATSAPP] New day detected, resetting sent today list...');
        await this.resetSentTodayList();

        console.log('✅ [DAILY-WHATSAPP] New day reset complete, will generate new list when needed');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for new day:', error);
      return false;
    }
  }

  // Reset sent today list for new day
  private static async resetSentTodayList(): Promise<void> {
    try {
      // Get all sessions and reset sentTodayIds for all except today
      const sessionsQuery = query(
        collection(db, COLLECTION_NAMES.DAILY_WHATSAPP_SESSIONS),
        where('date', '!=', new Date().toISOString().split('T')[0])
      );

      const querySnapshot = await getDocs(sessionsQuery);
      const batch = writeBatch(db);

      for (const documentSnapshot of querySnapshot.docs) {
        const docRef = doc(db, COLLECTION_NAMES.DAILY_WHATSAPP_SESSIONS, documentSnapshot.id);
        batch.update(docRef, {
          sentTodayIds: [],
          updatedAt: Timestamp.now()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error resetting sent today list:', error);
      throw error;
    }
  }

  // Get call centers by IDs
  private static async getCallCentersByIds(callCenterIds: string[]): Promise<CallCenter[]> {
    try {
      if (callCenterIds.length === 0) return [];

      console.log('🔍 [DAILY-WHATSAPP] Getting call centers by IDs:', callCenterIds.slice(0, 3), '...');

      // Get call centers in batches to avoid query limits
      const batchSize = 10;
      const results: CallCenter[] = [];

      for (let i = 0; i < callCenterIds.length; i += batchSize) {
        const batchIds = callCenterIds.slice(i, i + batchSize);
        console.log(`🔄 [DAILY-WHATSAPP] Processing batch ${Math.floor(i / batchSize) + 1}, IDs:`, batchIds);

        // Use individual getDoc calls
        const batchPromises = batchIds.map(id => getDoc(doc(db, 'callCenters', id)));
        const batchResults = await Promise.all(batchPromises);
        const docs = batchResults.filter(result => result.exists);

        console.log(`✅ [DAILY-WHATSAPP] Found ${docs.length} documents in this batch`);

        for (const docSnapshot of docs) {
          const data = docSnapshot.data();
          if (!data) {
            console.log('⚠️ [DAILY-WHATSAPP] Document has no data, skipping:', docSnapshot.id);
            continue;
          }

          console.log('✅ [DAILY-WHATSAPP] Processing document:', docSnapshot.id, 'Name:', data.name);

          // Use the same exact mapping as ExternalCRMService
          results.push({
            id: docSnapshot.id,
            name: data.name || '',
            country: data.country || '',
            city: data.city || '',
            positions: data.positions || 0,
            status: data.status || 'New',
            value: data.value || 0,
            currency: data.currency || 'USD',
            phones: data.phones || [],
            phone_infos: data.phone_infos || [],
            emails: data.emails || [],
            website: data.website || '',
            address: data.address || '',
            source: data.source || '',
            type: data.type || '',
            businessType: data.businessType || undefined,
            tags: data.tags || [],
            markets: data.markets || [],
            competitors: data.competitors || [],
            socialMedia: data.socialMedia || [],
            foundDate: data.foundDate || '',
            lastContacted: data.lastContacted?.toDate?.()?.toISOString() || data.lastContacted,
            last_contacted_via_whatsapp: data.last_contacted_via_whatsapp?.toDate?.()?.toISOString() || data.last_contacted_via_whatsapp,
            notes: data.notes || '',
            // Manual WhatsApp exclusion fields
            no_whatsapp_phones: data.no_whatsapp_phones || [],
            whatsapp_excluded_until: data.whatsapp_excluded_until || undefined,
            // Follow-up action fields
            dnc_until: data.dnc_until || undefined,
            nwt_notification: data.nwt_notification || false,
            satisfied_followup_date: data.satisfied_followup_date || undefined,
            satisfied_notification: data.satisfied_notification || undefined,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            mobilePhones: data.mobilePhones || [],
          } as CallCenter);
        }
      }

      console.log(`✅ [DAILY-WHATSAPP] Total call centers retrieved: ${results.length}`);
      return results;
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP] Error getting call centers by IDs:', error);
      return [];
    }
  }

  // Filter eligible call centers
  private static filterEligibleCallCenters(callCenters: CallCenter[], excludedIds: string[]): CallCenter[] {
    return callCenters.filter(cc => {
      // Exclude specified IDs
      if (excludedIds.includes(cc.id)) {
        console.log('🚫 [DAILY-WHATSAPP] Excluding call center:', cc.id, cc.name);
        return false;
      }

      // EXCLUDE call centers manually marked as "No WhatsApp"
      if (cc.no_whatsapp_phones && cc.no_whatsapp_phones.length > 0) {
        console.log('🚫 [DAILY-WHATSAPP] Excluding call center with "No WhatsApp" phones:', cc.id, cc.name, cc.no_whatsapp_phones);
        return false;
      }

      // Must have mobile phone
      const hasMobilePhone = cc.phone_infos?.some(phone =>
        phone.is_mobile && phone.whatsapp_confidence >= 0.7
      ) || (cc.mobilePhones && cc.mobilePhones.length > 0);

      if (!hasMobilePhone) {
        return false;
      }

      // Must not be a client (not Closed-Won)
      const notAClient = cc.status !== 'Closed-Won';

      // Must be call-center type or not specified
      const isCallCenterType = cc.businessType === 'call-center' || !cc.businessType;

      return notAClient && isCallCenterType;
    });
  }

  // Prioritize call centers
  private static prioritizeCallCenters(callCenters: CallCenter[]): CallCenter[] {
    return callCenters.sort((a, b) => {
      // Primary: Number of positions
      if (a.positions !== b.positions) {
        return b.positions - a.positions;
      }

      // Secondary: WhatsApp confidence score
      const aConfidence = a.phone_infos?.find(p => p.is_mobile)?.whatsapp_confidence || 0;
      const bConfidence = b.phone_infos?.find(p => p.is_mobile)?.whatsapp_confidence || 0;

      if (aConfidence !== bConfidence) {
        return bConfidence - aConfidence;
      }

      return 0;
    });
  }

  // Create suggestion from call center
  private static createSuggestionFromCallCenter(callCenter: CallCenter, scheduledTime?: Date): DailyWhatsAppSuggestion {
    const mobilePhone = callCenter.mobilePhones?.[0] ||
      callCenter.phones.find(phone =>
        callCenter.phone_infos?.[callCenter.phones.indexOf(phone)]?.is_mobile &&
        callCenter.phone_infos?.[callCenter.phones.indexOf(phone)]?.whatsapp_confidence >= 0.7
      );

    const whatsappConfidence = callCenter.phone_infos?.find(p => p.is_mobile)?.whatsapp_confidence || 0;

    // Determine priority badge
    let priorityBadge = '';
    let priorityType: 'high_positions' | 'long_time' | 'medium_confidence' = 'medium_confidence';

    if (callCenter.positions >= 50) {
      priorityBadge = '🟢 High positions';
      priorityType = 'high_positions';
    } else if (whatsappConfidence >= 0.5 && whatsappConfidence < 0.7) {
      priorityBadge = '🟡 Medium WhatsApp confidence';
      priorityType = 'medium_confidence';
    }

    const scheduledTimeObj = scheduledTime || new Date();
    const timeUntilSend = Math.round((scheduledTimeObj.getTime() - new Date().getTime()) / (1000 * 60));

    return {
      callCenter,
      scheduledTime: scheduledTimeObj.toISOString(),
      timeUntilSend,
      whatsappLink: mobilePhone ? PhoneDetectionService.getWhatsAppLink(mobilePhone, `Hello! I'm interested in your call center services. Could we discuss potential collaboration?`) : '',
      lastWhatsAppSent: callCenter.last_contacted_via_whatsapp || callCenter.lastContacted || undefined,
      daysSinceLastWhatsApp: 30, // Default
      priorityBadge,
      priorityType,
      whatsappConfidence,
      mobileCount: callCenter.phone_infos?.filter(p => p.is_mobile).length || 0,
    };
  }

  // Generate variable time intervals between WhatsApp sends (in minutes)
  private static getTimeIntervals(): number[] {
    return [53, 59, 114, 216, 89, 147, 73, 181, 96, 132];
  }

  private static getNextScheduledTime(currentTime: Date, index: number): Date {
    const intervals = this.getTimeIntervals();
    const intervalMinutes = intervals[index % intervals.length];
    return new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }

  // Move suggestions to sent today
  static async moveToSentToday(callCenterIds: string[]): Promise<void> {
    try {
      console.log('🔄 [DAILY-WHATSAPP-SERVICE] Moving call centers to sent today:', callCenterIds);
      
      const session = await this.getOrCreateTodaySession();
      console.log('📊 [DAILY-WHATSAPP-SERVICE] Current session before update:', {
        selectedCount: session.selectedCallCenterIds.length,
        sentTodayCount: session.sentTodayIds.length,
      });

      // Add to sent today list
      const updatedSentTodayIds = [...new Set([...session.sentTodayIds, ...callCenterIds])];

      // Remove from selected list
      const updatedSelectedIds = session.selectedCallCenterIds.filter(id => !callCenterIds.includes(id));

      console.log('📊 [DAILY-WHATSAPP-SERVICE] Updated arrays:', {
        newSelectedCount: updatedSelectedIds.length,
        newSentTodayCount: updatedSentTodayIds.length,
      });

      await this.updateSession(session.id, {
        selectedCallCenterIds: updatedSelectedIds,
        sentTodayIds: updatedSentTodayIds,
      });

      console.log('✅ [DAILY-WHATSAPP-SERVICE] Successfully moved call centers to sent today');
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP-SERVICE] Error moving WhatsApp suggestions to sent today:', error);
      throw error;
    }
  }

  // Move suggestions back to available (from sent today to suggestions)
  static async moveBackToSuggestions(callCenterIds: string[]): Promise<void> {
    try {
      console.log('🔄 [DAILY-WHATSAPP-SERVICE] Moving call centers back to suggestions:', callCenterIds);
      
      const session = await this.getOrCreateTodaySession();

      // Add back to selected list
      const updatedSelectedIds = [...new Set([...session.selectedCallCenterIds, ...callCenterIds])];

      // Remove from sent today list
      const updatedSentTodayIds = session.sentTodayIds.filter(id => !callCenterIds.includes(id));

      await this.updateSession(session.id, {
        selectedCallCenterIds: updatedSelectedIds,
        sentTodayIds: updatedSentTodayIds,
      });

      console.log('✅ [DAILY-WHATSAPP-SERVICE] Successfully moved call centers back to suggestions');
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP-SERVICE] Error moving WhatsApp suggestions back to suggestions:', error);
      throw error;
    }
  }

  // Get recent daily calls sessions within specified days
  private static async getRecentDailyCallsSessions(days: number = 7): Promise<any[]> {
    try {
      const { DailyCallsService } = await import('./daily-calls-service');
      const collectionName = 'dailyCallsSessions'; // Assuming this is the collection name

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        collection(db, collectionName),
        where('date', '>=', cutoffDate.toISOString().split('T')[0]),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        selectedCallCenterIds: doc.data().selectedCallCenterIds || [],
        alreadyCalledIds: doc.data().alreadyCalledIds || []
      }));

      return sessions;
    } catch (error) {
      console.warn('⚠️ [DAILY-WHATSAPP] Could not get recent daily calls sessions:', error);
      return [];
    }
  }

  // Check if call center has any steps
  private static async hasSteps(callCenterId: string): Promise<boolean> {
    try {
      const q = query(collection(db, `callCenters/${callCenterId}/steps`));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn(`⚠️ [DAILY-WHATSAPP] Could not check steps for ${callCenterId}:`, error);
      return false;
    }
  }

  // Check if call center has any calendar events
  private static async hasCalendarEvents(callCenterId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'calendarEvents'),
        where('callCenterId', '==', callCenterId)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn(`⚠️ [DAILY-WHATSAPP] Could not check calendar events for ${callCenterId}:`, error);
      return false;
    }
  }

  // Check if call center has calendar events today (specifically tasks)
  private static async hasCalendarEventsToday(callCenterId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const q = query(
        collection(db, 'calendarEvents'),
        where('callCenterId', '==', callCenterId),
        where('date', '>=', today),
        where('date', '<', tomorrowStr),
        where('type', '==', 'task')
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn(`⚠️ [DAILY-WHATSAPP] Could not check calendar events today for ${callCenterId}:`, error);
      return false;
    }
  }

  // Check if call center appears in today's daily calls
  private static async appearsInTodaysDailyCalls(callCenterId: string): Promise<boolean> {
    try {
      const { DailyCallsService } = await import('./daily-calls-service');
      const todaySession = await DailyCallsService.getOrCreateTodaySession();
      return todaySession.selectedCallCenterIds.includes(callCenterId.toString()) ||
             todaySession.alreadyCalledIds.includes(callCenterId.toString());
    } catch (error) {
      console.warn(`⚠️ [DAILY-WHATSAPP] Could not check today's daily calls for ${callCenterId}:`, error);
      return false;
    }
  }

  // Check if call center has call logs in the past N days
  private static async hasRecentCallLogs(callCenterId: string, days: number = 15): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        collection(db, `callCenters/${callCenterId}/callLogs`),
        where('createdAt', '>=', Timestamp.fromDate(cutoffDate)),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn(`⚠️ [DAILY-WHATSAPP] Could not check recent call logs for ${callCenterId}:`, error);
      return false;
    }
  }

  // Remove call centers from suggestions
  static async removeFromSuggestions(callCenterIds: string[]): Promise<void> {
    try {
      console.log('🔄 [DAILY-WHATSAPP-SERVICE] Removing call centers from suggestions:', callCenterIds);

      const session = await this.getOrCreateTodaySession();
      console.log('📊 [DAILY-WHATSAPP-SERVICE] Current session before removal:', {
        selectedCount: session.selectedCallCenterIds.length,
        sentTodayCount: session.sentTodayIds.length,
        removeCount: callCenterIds.length
      });

      // Remove from selected list
      const updatedSelectedIds = session.selectedCallCenterIds.filter(id => !callCenterIds.includes(id));

      console.log('📊 [DAILY-WHATSAPP-SERVICE] Updated arrays:', {
        newSelectedCount: updatedSelectedIds.length,
        removedCount: session.selectedCallCenterIds.length - updatedSelectedIds.length
      });

      await this.updateSession(session.id, {
        selectedCallCenterIds: updatedSelectedIds,
      });

      console.log('✅ [DAILY-WHATSAPP-SERVICE] Successfully removed call centers from suggestions');
    } catch (error) {
      console.error('❌ [DAILY-WHATSAPP-SERVICE] Error removing call centers from suggestions:', error);
      throw error;
    }
  }
}