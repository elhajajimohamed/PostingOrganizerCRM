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
  DailyCallHistory,
} from '@/lib/types/external-crm';
import { ExternalCRMService, ExternalCRMSubcollectionsService } from './external-crm-service';
import { SettingsService } from './settings-service';
import { PhoneDetectionService } from './phone-detection-service';

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

  // Enhanced selection with scoring and filtering - optimized version
  static async selectScoredCallCenters(count: number = 20, excludedIds: string[] = []): Promise<DailyCallCenter[]> {
    try {
      console.log(`🎯 [DAILY-CALLS] Selecting ${count} scored call centers...`);

      // Get settings for configuration
      const settings = await SettingsService.getSettings();
      const dailyCallsConfig = settings?.dailyCalls || SettingsService.getDefaultDailyCallsConfig();

      // Get all call centers
      const callCenters = await ExternalCRMService.getCallCenters();

      if (callCenters.length === 0) {
        console.log('⚠️ [DAILY-CALLS] No call centers available for selection');
        return [];
      }

      console.log(`📊 [DAILY-CALLS] Got ${callCenters.length} call centers to evaluate`);
      console.log(`🚫 [DAILY-CALLS] Excluding ${excludedIds.length} call centers from WhatsApp list`);

      // First pass: Apply basic filters that don't require call history
      // Process call centers one by one to handle async step checking
      const basicFiltered: CallCenter[] = [];
      for (const callCenter of callCenters) {
        // Exclude Daily WhatsApp overlap
        if (excludedIds.includes(callCenter.id.toString())) continue;

        // Exclude clients
        if (callCenter.is_client === true) continue;

        // Exclude Closed-Won call centers
        if (callCenter.status === 'Closed-Won') continue;

        // Exclude blacklisted
        if (callCenter.is_blacklisted === true) continue;

        // Exclude if no valid phones
        if (!callCenter.phones || callCenter.phones.length === 0) continue;

        // Validate phone numbers using phone detection service
        const hasValidPhone = callCenter.phones.some(phone => {
          const detection = this.validatePhoneNumber(phone, callCenter.country);
          return detection.isValid;
        });

        if (!hasValidPhone) continue;

        // Update is_valid_phone flag
        callCenter.is_valid_phone = hasValidPhone;

        // Exclude if has upcoming steps (calendar events)
        // Need to fetch steps since they're not included in bulk getCallCenters
        let hasUncompletedSteps = false;
        try {
          const steps = await ExternalCRMSubcollectionsService.getSteps(callCenter.id.toString());
          hasUncompletedSteps = steps.some(step => !step.completed);
        } catch (error) {
          console.warn(`⚠️ [DAILY-CALLS] Could not check steps for ${callCenter.id}:`, error);
          // Continue without excluding - better to include than exclude incorrectly
        }

        if (hasUncompletedSteps) continue;

        // Exclude if has calendar events (mentioned in calendar section)
        let hasCalendarEvents = false;
        try {
          const calendarEvents = await this.getCalendarEventsForCallCenter(callCenter.id.toString());
          hasCalendarEvents = calendarEvents.length > 0;
        } catch (error) {
          console.warn(`⚠️ [DAILY-CALLS] Could not check calendar events for ${callCenter.id}:`, error);
          // Continue without excluding - better to include than exclude incorrectly
        }

        if (hasCalendarEvents) continue;

        // Exclude if manually marked to be excluded from daily suggestions
        if (callCenter.exclude_from_daily_suggestions) continue;

        // Enforce cool-off period
        const coolOffDate = new Date();
        coolOffDate.setDate(coolOffDate.getDate() - dailyCallsConfig.cool_off_days);
        if (callCenter.lastContacted && new Date(callCenter.lastContacted) >= coolOffDate) continue;

        basicFiltered.push(callCenter);
      }

      console.log(`📊 [DAILY-CALLS] After basic filtering: ${basicFiltered.length} call centers`);

      if (basicFiltered.length === 0) {
        console.log('⚠️ [DAILY-CALLS] No call centers passed basic filters');
        return [];
      }

      // Limit to a reasonable number to avoid performance issues
      const maxToProcess = Math.min(basicFiltered.length, 200); // Process max 200 call centers
      const callCentersToProcess = basicFiltered.slice(0, maxToProcess);

      console.log(`📊 [DAILY-CALLS] Processing ${callCentersToProcess.length} call centers for scoring`);

      // Process call centers in batches to get call history and compute scores
      const scoredCallCenters: DailyCallCenter[] = [];
      const batchSize = 20; // Increased batch size for better performance

      for (let i = 0; i < callCentersToProcess.length; i += batchSize) {
        const batch = callCentersToProcess.slice(i, i + batchSize);

        for (const callCenter of batch) {
          try {
            // Get call history for scoring
            const callHistory = await ExternalCRMSubcollectionsService.getCallHistory(callCenter.id.toString());

            // Apply remaining filters that require call history
            if (this.applyCallHistoryFilters(callCenter, callHistory, dailyCallsConfig)) {
              // Compute score and create DailyCallCenter
              const scoredCenter = await this.computeScoredCallCenter(callCenter, callHistory, dailyCallsConfig);
              if (scoredCenter) {
                scoredCallCenters.push(scoredCenter);
              }
            }
          } catch (error) {
            console.warn(`⚠️ [DAILY-CALLS] Error processing call center ${callCenter.id}:`, error);
          }
        }

        // No delay needed with smaller batches
      }

      console.log(`✅ [DAILY-CALLS] Found ${scoredCallCenters.length} eligible call centers`);

      if (scoredCallCenters.length === 0) {
        console.log('⚠️ [DAILY-CALLS] No eligible call centers found');
        return [];
      }

      // Sort by computed score descending and take top N
      const selected = scoredCallCenters
        .sort((a, b) => (b.computed_score || 0) - (a.computed_score || 0))
        .slice(0, Math.min(count, scoredCallCenters.length));

      console.log(`🎯 [DAILY-CALLS] Successfully selected ${selected.length} call centers with average score: ${(selected.reduce((sum, cc) => sum + (cc.computed_score || 0), 0) / selected.length).toFixed(2)}`);
      return selected;
    } catch (error) {
      console.error('❌ [DAILY-CALLS] Error selecting scored call centers:', error);
      return [];
    }
  }

  // Get daily WhatsApp session to exclude overlap
  private static async getDailyWhatsAppSession(): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, 'dailyWhatsAppSessions'),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          selectedCallCenterIds: data.selectedCallCenterIds || [],
          sentTodayIds: data.sentTodayIds || [],
        };
      }
      return null;
    } catch (error) {
      console.warn('⚠️ [DAILY-CALLS] Could not get daily WhatsApp session:', error);
      return null;
    }
  }

  // Apply filters that require call history
  private static applyCallHistoryFilters(callCenter: CallCenter, callHistory: CallLog[], config: any): boolean {
    // Count attempts in last periods
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));

    const attempts15d = callHistory.filter(log => new Date(log.date) >= fifteenDaysAgo).length;

    // Exclude if too many attempts in last 15 days
    if (attempts15d >= config.max_attempts_15_days) {
      return false;
    }

    return true;
  }

  // Apply hard filters to exclude ineligible call centers
  private static applyHardFilters(callCenter: CallCenter, callHistory: CallLog[], config: any): boolean {
    // Exclude clients
    if (callCenter.is_client === true) {
      return false;
    }

    // Exclude blacklisted
    if (callCenter.is_blacklisted === true) {
      return false;
    }

    // Exclude if no valid phones - validate phone format and carrier detection
    if (!callCenter.phones || callCenter.phones.length === 0) {
      return false;
    }

    // Validate phone numbers using phone detection service
    const hasValidPhone = callCenter.phones.some(phone => {
      const detection = this.validatePhoneNumber(phone, callCenter.country);
      return detection.isValid;
    });

    if (!hasValidPhone) {
      return false;
    }

    // Update is_valid_phone flag
    callCenter.is_valid_phone = hasValidPhone;

    // Exclude if has upcoming steps (calendar events)
    // Note: This method is used in different contexts - steps should be checked in selectScoredCallCenters
    // where we can fetch them asynchronously
    if (callCenter.steps && callCenter.steps.some(step => !step.completed)) {
      return false;
    }

    // Enforce cool-off period
    const coolOffDate = new Date();
    coolOffDate.setDate(coolOffDate.getDate() - config.cool_off_days);
    if (callCenter.lastContacted && new Date(callCenter.lastContacted) >= coolOffDate) {
      return false;
    }

    // Count attempts in last periods
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    const attempts15d = callHistory.filter(log => new Date(log.date) >= fifteenDaysAgo).length;
    const attempts90d = callHistory.filter(log => new Date(log.date) >= ninetyDaysAgo).length;

    // Exclude if too many attempts in last 15 days
    if (attempts15d >= config.max_attempts_15_days) {
      return false;
    }

    return true;
  }

  // Validate phone number format and carrier detection
  private static validatePhoneNumber(phone: string, country: string): { isValid: boolean; isMobile: boolean; confidence: number } {
    try {
      const detection = PhoneDetectionService.detectPhone(phone, country);

      // Consider valid if we have a reasonable confidence score and proper format
      const isValid = detection.whatsapp_confidence >= 0.6 &&
                     detection.phone_norm.length >= 8 &&
                     detection.country_code.length > 0;

      return {
        isValid,
        isMobile: detection.is_mobile,
        confidence: detection.whatsapp_confidence
      };
    } catch (error) {
      console.warn(`Phone validation error for ${phone}:`, error);
      // Fallback: basic validation
      const normalized = phone.replace(/[\s\.\(\)\-]/g, '');
      return {
        isValid: normalized.length >= 8 && /^\+?[\d]+$/.test(normalized),
        isMobile: false,
        confidence: 0.3
      };
    }
  }

  // Compute score for a call center
  private static async computeScoredCallCenter(
    callCenter: CallCenter,
    callHistory: CallLog[],
    config: any
  ): Promise<DailyCallCenter | null> {
    try {
      // Calculate attempt statistics
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const attempts15d = callHistory.filter(log => new Date(log.date) >= fifteenDaysAgo).length;
      const attempts90d = callHistory.filter(log => new Date(log.date) >= ninetyDaysAgo).length;
      const attempts30d = callHistory.filter(log => new Date(log.date) >= thirtyDaysAgo).length;

      // Calculate days since last call
      let daysSinceLastCall = Infinity;
      if (callHistory.length > 0) {
        const lastCallDate = new Date(callHistory[0].date);
        daysSinceLastCall = Math.floor((now.getTime() - lastCallDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Mobile available score (0.30 weight)
      const mobileAvailable = callCenter.phone_infos?.some(info => info.is_mobile) ? 1 : 0;

      // Days since last call score (0.20 weight) - normalize to 0-1, higher is better
      const daysScore = Math.min(daysSinceLastCall / 30, 1); // Cap at 30 days

      // Positions count score (0.15 weight) - normalize to 0-1
      const positionsScore = Math.min((callCenter.positions || 0) / 50, 1); // Cap at 50 positions

      // Lead quality score (0.15 weight) - use existing or default
      const leadQualityScore = callCenter.lead_quality_score || 0.5;

      // Company size score (0.10 weight) - use existing or default
      const companySizeScore = callCenter.company_size_score || 0.5;

      // Recent attempts penalty (0.05 weight) - fewer attempts = higher score
      const recentAttemptsScore = Math.max(0, 1 - (attempts15d / config.max_attempts_15_days));

      // Business hours score (0.05 weight)
      const businessHoursScore = callCenter.business_hours_score || this.calculateBusinessHoursScore(callCenter, config);

      // Calculate weighted score
      const weights = config.scoring_weights;
      const computedScore =
        mobileAvailable * weights.mobile_available +
        daysScore * weights.days_since_last_call +
        positionsScore * weights.positions_count +
        leadQualityScore * weights.lead_quality_score +
        companySizeScore * weights.company_size_score +
        recentAttemptsScore * weights.recent_attempts_penalty +
        businessHoursScore * weights.business_hours_score;

      // Apply penalty for excessive 90-day attempts
      let finalScore = computedScore;
      let badgeReason: string | undefined;
      let badgeType: 'attempt_penalty' | 'cool_off' | 'none' = 'none';

      if (attempts90d >= config.max_attempts_90_days) {
        finalScore = Math.max(0, finalScore - config.score_penalty_90_days);
        badgeReason = `Attempt #${attempts90d + 1} — ${attempts90d} previous no answers`;
        badgeType = 'attempt_penalty';
      }

      // Normalize to 0-100
      finalScore = Math.min(100, Math.max(0, finalScore * 100));

      // Create score breakdown
      const scoreBreakdown = {
        mobile_available: mobileAvailable * weights.mobile_available * 100,
        days_since_last_call: daysScore * weights.days_since_last_call * 100,
        positions_count: positionsScore * weights.positions_count * 100,
        lead_quality_score: leadQualityScore * weights.lead_quality_score * 100,
        company_size_score: companySizeScore * weights.company_size_score * 100,
        recent_attempts_penalty: recentAttemptsScore * weights.recent_attempts_penalty * 100,
        business_hours_score: businessHoursScore * weights.business_hours_score * 100,
      };

      return {
        callCenter,
        callCount: callHistory.length,
        lastCalledDate: callHistory.length > 0 ? callHistory[0].date : undefined,
        needsNewPhoneNumber: false, // Not used in new system
        daysSinceLastCall,
        attempts_last_90_days: attempts90d,
        attempts_last_15_days: attempts15d,
        attempts_30d: attempts30d,
        computed_score: finalScore,
        score_breakdown: scoreBreakdown,
        badge_reason: badgeReason,
        badge_type: badgeType,
        phone_index: 0, // Will be used for cycling
        is_valid_phone: callCenter.is_valid_phone,
        business_hours_score: businessHoursScore,
      };
    } catch (error) {
      console.error(`❌ [DAILY-CALLS] Error computing score for ${callCenter.id}:`, error);
      return null;
    }
  }

  // Calculate business hours score based on timezone and current time
  private static calculateBusinessHoursScore(callCenter: CallCenter, config: any): number {
    try {
      const countryConfig = config.business_hours[callCenter.country];
      if (!countryConfig) return 0.5; // Default neutral score

      // Get current time in the call center's timezone
      const now = new Date();
      const timezoneOffset = this.getTimezoneOffset(countryConfig.timezone);
      const localTime = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000));

      const currentHour = localTime.getHours();
      const currentDay = localTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check if it's a workday
      if (!countryConfig.work_days.includes(currentDay)) {
        return 0.2; // Low score for non-work days
      }

      // Check if it's business hours
      if (currentHour >= countryConfig.work_hours_start && currentHour < countryConfig.work_hours_end) {
        return 1.0; // Full score during business hours
      } else if (currentHour >= countryConfig.work_hours_end - 1 && currentHour < countryConfig.work_hours_end + 1) {
        return 0.7; // Good score near end of business hours
      } else if (currentHour >= countryConfig.work_hours_start - 1 && currentHour < countryConfig.work_hours_start) {
        return 0.7; // Good score near start of business hours
      } else {
        return 0.3; // Low score outside business hours
      }
    } catch (error) {
      console.warn(`⚠️ [DAILY-CALLS] Error calculating business hours score for ${callCenter.country}:`, error);
      return 0.5;
    }
  }

  // Get timezone offset in hours from UTC
  private static getTimezoneOffset(timezone: string): number {
    // Simplified timezone mapping - in production, use a proper timezone library
    const timezoneOffsets: { [key: string]: number } = {
      'Africa/Casablanca': 1,
      'Africa/Tunis': 1,
      'Africa/Dakar': 0,
      'Africa/Abidjan': 0,
      'Africa/Conakry': 0,
      'Africa/Douala': 1,
    };
    return timezoneOffsets[timezone] || 0;
  }

  // Generate today's call list (configurable count + already called from previous days)
  static async generateTodayCallList(forceRegenerate: boolean = false): Promise<{
    selectedForToday: DailyCallCenter[];
    alreadyCalled: DailyCallCenter[];
    session: DailyCallSession;
  }> {
    try {
      console.log('🚀 [DAILY-CALLS] Starting to generate today call list...');

      // Get settings for configuration
      const settings = await SettingsService.getSettings();
      const dailyCallsConfig = settings?.dailyCalls || SettingsService.getDefaultDailyCallsConfig();

      // Get current Daily WhatsApp session to exclude overlap
      const dailyWhatsAppSession = await this.getDailyWhatsAppSession();
      const excludedIds = [...(dailyWhatsAppSession?.selectedCallCenterIds || []), ...(dailyWhatsAppSession?.sentTodayIds || [])];
      console.log('🚫 [DAILY-CALLS] Excluding WhatsApp call centers:', excludedIds.length);

      // Get or create today's session
      console.log('📅 [DAILY-CALLS] Getting or creating session...');
      const session = await this.getOrCreateTodaySession();
      console.log('✅ [DAILY-CALLS] Session ready:', { id: session.id, date: session.date });

      // Check if we already have selected call centers for today
      if (session.selectedCallCenterIds.length > 0 && !forceRegenerate) {
        console.log(`📋 [DAILY-CALLS] Using cached ${session.selectedCallCenterIds.length} selected call centers...`);

        // Get only the call centers we need (selected + already called)
        const neededIds = [...session.selectedCallCenterIds, ...session.alreadyCalledIds];
        const callCentersWithHistory = await this.getCallCentersByIds(neededIds);
      } else if (forceRegenerate) {
        console.log('🔄 [DAILY-CALLS] Force regenerating list - clearing existing session...');

        // Clear the existing session data
        await this.updateSession(session.id, {
          selectedCallCenterIds: [],
          alreadyCalledIds: [],
        });

        session.selectedCallCenterIds = [];
        session.alreadyCalledIds = [];
      }

      // If we have cached data (either from existing session or after clearing), use it
      if (session.selectedCallCenterIds.length > 0) {
        // Get only the call centers we need (selected + already called)
        const neededIds = [...session.selectedCallCenterIds, ...session.alreadyCalledIds];
        const callCentersWithHistory = await this.getCallCentersByIds(neededIds);

        const selectedForToday = callCentersWithHistory.filter(dailyCC =>
          session.selectedCallCenterIds.includes(dailyCC.callCenter.id.toString())
        );

        const alreadyCalled = callCentersWithHistory.filter(dailyCC =>
          session.alreadyCalledIds.includes(dailyCC.callCenter.id.toString())
        );

        // Check if we have all the expected call centers
        const expectedSelectedCount = session.selectedCallCenterIds.length;
        const expectedAlreadyCalledCount = session.alreadyCalledIds.length;
        const actualSelectedCount = selectedForToday.length;
        const actualAlreadyCalledCount = alreadyCalled.length;

        if (actualSelectedCount < expectedSelectedCount || actualAlreadyCalledCount < expectedAlreadyCalledCount) {
          console.log(`⚠️ [DAILY-CALLS] Some cached call centers are missing (${actualSelectedCount}/${expectedSelectedCount} selected, ${actualAlreadyCalledCount}/${expectedAlreadyCalledCount} already called). Clearing and continuing with available data...`);

          // Clear session and continue with available data instead of recursive call
          await this.updateSession(session.id, {
            selectedCallCenterIds: selectedForToday.map(cc => cc.callCenter.id.toString()),
            alreadyCalledIds: alreadyCalled.map(cc => cc.callCenter.id.toString()),
          });

          session.selectedCallCenterIds = selectedForToday.map(cc => cc.callCenter.id.toString());
          session.alreadyCalledIds = alreadyCalled.map(cc => cc.callCenter.id.toString());
        }

        console.log(`✅ [DAILY-CALLS] Loaded ${selectedForToday.length} selected and ${alreadyCalled.length} already called call centers`);

        return {
          selectedForToday,
          alreadyCalled,
          session,
        };
      }

      // Need to select new call centers for today - use scored selection
      console.log('🎯 [DAILY-CALLS] No cached selection, selecting new call centers...');
      // Pass excluded IDs to ensure no overlap with WhatsApp
      const selectedForToday = await this.selectScoredCallCenters(dailyCallsConfig.daily_suggestion_count, excludedIds);
      console.log(`✅ [DAILY-CALLS] Selected ${selectedForToday.length} call centers for today`);

      // Update session with selected call center IDs and score data
      const selectedIds = selectedForToday.map(dailyCC => dailyCC.callCenter.id.toString());
      const sessionScoreData: { [callCenterId: string]: any } = {};

      selectedForToday.forEach(dailyCC => {
        sessionScoreData[dailyCC.callCenter.id.toString()] = {
          computed_score: dailyCC.computed_score,
          score_breakdown: dailyCC.score_breakdown,
          attempts_last_90_days: dailyCC.attempts_last_90_days,
          attempts_last_15_days: dailyCC.attempts_last_15_days,
          attempts_30d: dailyCC.attempts_30d,
          badge_reason: dailyCC.badge_reason || null,
          badge_type: dailyCC.badge_type,
        };
      });

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
      const logId = await ExternalCRMSubcollectionsService.addCallLog(callCenterId, callLog);

      // Create full call log object for audit checking
      const fullCallLog: CallLog = { ...callLog, id: logId };

      // Check for audit logging triggers
      await this.checkAuditTriggers(callCenterId, fullCallLog);

      return logId;
    } catch (error) {
      console.error('Error adding call log:', error);
      throw error;
    }
  }

  // Check for audit logging triggers (attempt thresholds, DNC marks, etc.)
  private static async checkAuditTriggers(callCenterId: string, callLog: CallLog): Promise<void> {
    try {
      // Get call history to check thresholds
      const callHistory = await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);

      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

      const attempts15d = callHistory.filter(log => new Date(log.date) >= fifteenDaysAgo).length;
      const attempts90d = callHistory.filter(log => new Date(log.date) >= ninetyDaysAgo).length;

      // Log when attempt thresholds are reached
      if (attempts15d >= 3) {
        await this.logAuditEvent(callCenterId, 'attempt_threshold_reached', {
          threshold_type: '15_day_attempts',
          attempt_count: attempts15d,
        });
      }

      if (attempts90d >= 3) {
        await this.logAuditEvent(callCenterId, 'attempt_threshold_reached', {
          threshold_type: '90_day_attempts',
          attempt_count: attempts90d,
        });
      }

      // Log disposition-based actions
      if (callLog.disposition === 'dnc') {
        await this.logAuditEvent(callCenterId, 'marked_dnc', {
          dnc_reason: callLog.notes || 'Marked as DNC during call',
        });
      }

      if (callLog.disposition === 'invalid_number') {
        await this.logAuditEvent(callCenterId, 'marked_invalid', {
          invalid_reason: callLog.notes || 'Marked as invalid during call',
        });
      }

      if (callLog.override_reason) {
        await this.logAuditEvent(callCenterId, 'manual_override', {
          override_reason: callLog.override_reason,
          override_by_agent: callLog.override_by_agent || 'unknown',
        });
      }

    } catch (error) {
      console.warn('Error checking audit triggers:', error);
      // Don't throw - audit logging failures shouldn't break call logging
    }
  }

  // Log audit events
  private static async logAuditEvent(
    callCenterId: string,
    action: DailyCallHistory['action'],
    details: any
  ): Promise<void> {
    try {
      await fetch('/api/external-crm/daily-calls/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId,
          callCenterName: 'Unknown', // Would need to fetch name
          action,
          details,
        }),
      });
    } catch (error) {
      console.warn('Failed to log audit event:', error);
    }
  }

  // Check if it's a new day and reset if needed - also regenerate daily list
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
        // It's a new day, reset and regenerate
        console.log('🌅 [DAILY-CALLS] New day detected, resetting already called list...');
        await this.resetAlreadyCalledList();

        // Don't auto-regenerate here to avoid infinite recursion
        console.log('✅ [DAILY-CALLS] New day reset complete, will generate list when needed');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for new day:', error);
      return false;
    }
  }

  // Implement phone number cycling for multiple numbers
  private static cyclePhoneNumber(dailyCallCenter: DailyCallCenter): DailyCallCenter {
    if (!dailyCallCenter.callCenter.phones || dailyCallCenter.callCenter.phones.length <= 1) {
      return dailyCallCenter;
    }

    const currentIndex = dailyCallCenter.phone_index || 0;
    const nextIndex = (currentIndex + 1) % dailyCallCenter.callCenter.phones.length;

    return {
      ...dailyCallCenter,
      phone_index: nextIndex
    };
  }

  // Use next phone number for a call center
  static async useNextPhoneNumber(callCenterId: string): Promise<DailyCallCenter | null> {
    try {
      // Get current call center data
      const callCenters = await this.getCallCentersByIds([callCenterId]);
      if (callCenters.length === 0) return null;

      const callCenter = callCenters[0];
      const cycledCallCenter = this.cyclePhoneNumber(callCenter);

      // Update the call center in the database if phone_index changed
      if (cycledCallCenter.phone_index !== callCenter.phone_index) {
        const { ExternalCRMService } = await import('./external-crm-service');
        await ExternalCRMService.updateCallCenter(callCenterId, {
          // Note: phone_index might need to be stored in call center data
        });
      }

      return cycledCallCenter;
    } catch (error) {
      console.error('Error cycling phone number:', error);
      return null;
    }
  }

  // Get calendar events for a specific call center
  static async getCalendarEventsForCallCenter(callCenterId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'calendarEvents'),
        where('callCenterId', '==', callCenterId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching calendar events for call center:', error);
      return [];
    }
  }
}