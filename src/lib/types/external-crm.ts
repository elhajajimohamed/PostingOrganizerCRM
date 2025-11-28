export const DESTINATION_OPTIONS = [
  'USA',
  'Canada',
  'France',
  'Spain',
  'Switzerland',
  'Italy',
  'Germany',
  'UK',
  'Belgium'
] as const;

export type Destination = typeof DESTINATION_OPTIONS[number];

// External CRM Types for Call Center Management
export interface CallCenter {
   id: string; // Changed to string to match Firestore document IDs
   name: string;
   country: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon';
   city: string;
   positions: number;
   positions_count?: number; // Alias for positions, used in scoring
   status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold';
   businessType?: 'call-center' | 'voip-reseller' | 'data-vendor' | 'workspace-rental' | 'individual';
   phones: string[];
   phone_infos?: PhoneInfo[];
   emails: string[];
   website: string;
   tags: string[];
   notes: string;
   createdAt: string;
   updatedAt: string;
   lastContacted: string | null;
   // New destinations field for calling destinations (multiple selection)
   destinations?: string[];
   // Phone type separation for WhatsApp functionality
   mobilePhones?: string[];
   fixedPhones?: string[];
   unknownPhones?: string[];
   // For backward compatibility with existing code
   contacts?: Contact[];
   steps?: Step[];
   callHistory?: CallLog[];
   recharges?: Recharge[];
   competitors?: string[];
   address?: string;
   email?: string;
   socialMedia?: string[];
   value?: number;
   currency?: string;
   archived?: boolean;
   completed?: boolean;
   type?: string;
   markets?: string[];
   source?: string;
   foundDate?: string;
   lastUpdated?: string;
   // Daily calls specific fields
   is_client?: boolean;
   is_blacklisted?: boolean;
   is_valid_phone?: boolean;
   attempts_last_90_days?: number;
   attempts_last_15_days?: number;
   attempts_30d?: number;
   lead_quality_score?: number;
   company_size_score?: number;
   business_hours_score?: number;
   last_contacted_via_whatsapp?: string;
   // Follow-up action fields
   dnc_until?: string; // Date until DNC (Don't Call) is active
   nwt_notification?: boolean; // Show notification to add new phone
   satisfied_followup_date?: string; // When to check satisfaction again
   satisfied_notification?: string; // Notification message for satisfaction check
   // Manual WhatsApp exclusion fields
   no_whatsapp_phones?: string[]; // Phone numbers manually marked as having no WhatsApp
   whatsapp_excluded_until?: string; // Date until WhatsApp exclusion is active
   // Manual daily suggestions exclusion
   exclude_from_daily_suggestions?: boolean; // Manually exclude from daily call suggestions
   // Absence management for daily call suggestions
   absentDays?: number; // Number of days to be absent from daily call suggestions
   absentUntil?: string; // Calculated date until which the call center is absent (ISO string)
   // Summary field for documenting all processes and interactions
   summary?: string;
}

export interface PhoneInfo {
  original: string;
  phone_norm: string;
  country_code: string;
  nsn: string;
  is_mobile: boolean;
  whatsapp_confidence: number;
  mobile_detection_reason: string;
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
  phone_info?: PhoneInfo;
  email: string;
  notes: string;
  lastContact: string;
}

export interface CallCenterContact {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  phone_info?: PhoneInfo;
  department: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  notes: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CallLog {
     id: string;
     date: string;
     duration: number;
     outcome: string;
     notes: string;
     followUp: string;
     // Call time field for tracking specific time of call
     callTime?: string;
     // Enhanced call log fields
     disposition?: 'interested' | 'quote_requested' | 'callback' | 'trial_requested' | 'no_budget' | 'technical_contact' | 'competitor' | 'wrong_number' | 'duplicate' | 'spam' | 'satisfied' | 'not_with_them' | 'meeting_scheduled' | 'dead' | 'noc' | 'closed' | 'out' | 'abusive' | 'nc' | 'busy' | 'noanswer' | 'no_answer' | 'not_interested' | 'invalid_number' | 'dnc' | 'manual_override';
     phone_used?: string;
     phone_index?: number;
     attempts_count?: number;
     override_reason?: string;
     override_by_agent?: string;
     // Follow-up actions for answered calls
     followUpAction?: 'dnc' | 'nwt' | 'satisfied';
     followUpDate?: string; // When to show again
     followUpNotification?: string; // Notification message to show
     // Recording and transcription fields
     recordingUrl?: string | null;
     transcriptionText?: string | null;
     autoAnalysisSummary?: string | null;
     coachFeedback?: string | null;
     hasRecording?: boolean;
     // Advanced call result classification fields
     is_argumented?: boolean;
     decision_maker_reached?: boolean;
     objection_category?: 'price' | 'email' | 'timing' | 'already_has_provider' | 'bad_number' | 'other';
     objection_detail?: string;
     refusal_reason?: 'prix_trop_cher' | 'envoyez_un_email' | 'pas_maintenant' | 'deja_un_fournisseur' | 'mauvais_numero' | 'autre';
}

export interface Recharge {
   id: string;
   amount: number;
   currency: string;
   date: string;
   method: string;
   notes: string;
}


export interface PhoneRotationData {
   date: string;
   calls: {
       [callId: string]: {
           callCenterId: string;
           scheduledTime: string;
           completed: boolean;
           completedAt?: string;
           notes: string;
       };
   };
}

export interface ExternalCRMData {
   callCenters: CallCenter[];
   phoneRotationData: PhoneRotationData;
   lastUpdated: string;
 }

// Web scraping and suggestion types
export interface Suggestion {
   id: string;
   name: string;
   address: string;
   phones: string[];
   phone_infos?: PhoneInfo[];
   country: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon';
   city: string;
   positions: number;
   source: 'google' | 'facebook' | 'csv';
   exported: boolean;
   createdAt: string;
   website?: string;
   email?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  found?: number;
  new?: number;
  added?: number;
  deleted?: number;
  updated?: number;
  tagged?: number;
  completed?: number;
  rescheduled?: number;
  merged?: number;
  ignored?: number;
  imported?: number;
}

// Batch operation types
export interface BatchOperation<T> {
  ids: string[];
  data?: T;
}

export interface BatchTagOperation {
  callCenterIds: number[];
  tag: string;
}

export interface BatchUpdateOperation {
  id: number;
  changes: Partial<CallCenter>;
}

export interface BatchDeleteOperation {
  callCenterId: number;
  contactIds: string[];
}

export interface BatchStepOperation {
  callCenterId: number;
  stepIds: string[];
}

export interface BatchRechargeOperation {
  callCenterId: number;
  rechargeIds: string[];
}

export interface BatchCallOperation {
  callIds: string[];
  newDate?: string;
}

// Search and filter types
export interface SearchFilters {
   query?: string;
   search?: string;
   country?: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon';
   city?: string;
   status?: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold';
   positions?: {
     min?: number;
     max?: number;
   };
   lastContacted?: {
     from?: string;
     to?: string;
   };
   createdAt?: {
     from?: string;
     to?: string;
   };
   tags?: string[];
}

export interface SortOptions {
   field: keyof CallCenter;
   direction: 'asc' | 'desc';
}

// Additional types for the specification
export interface Task {
   id: string;
   title: string;
   description: string;
   dueDate: string;
   completed: boolean;
   callCenterId: string;
   type: 'call' | 'meeting' | 'follow-up' | 'deadline';
   priority: 'low' | 'medium' | 'high';
}

export interface PriceSimulation {
   positions: number;
   monthlyFee: number;
   setupFee: number;
   currency: string;
   features: string[];
   totalCost: number;
}

export interface DuplicateGroup {
   id: string;
   callCenters: CallCenter[];
   mergeSuggestion?: CallCenter;
}

export interface ExportData {
     callCenters: CallCenter[];
     contacts: Contact[];
     steps: Step[];
     callHistory: CallLog[];
     recharges: Recharge[];
 }

export interface DailyCallSession {
     id: string;
     date: string;
     selectedCallCenterIds: string[];
     alreadyCalledIds: string[];
     createdAt: string;
     updatedAt: string;
     // Enhanced session data
     session_score_data?: {
       [callCenterId: string]: {
         computed_score: number;
         score_breakdown: {
           mobile_available: number;
           days_since_last_call: number;
           positions_count: number;
           lead_quality_score: number;
           company_size_score: number;
           recent_attempts_penalty: number;
           business_hours_score: number;
         };
         attempts_last_90_days: number;
         attempts_last_15_days: number;
         attempts_30d: number;
         badge_reason?: string;
         badge_type?: 'attempt_penalty' | 'cool_off' | 'none';
       };
     };
}

export interface DailyCallCenter {
     callCenter: CallCenter;
     callCount: number;
     lastCalledDate?: string;
     needsNewPhoneNumber: boolean;
     daysSinceLastCall: number;
     // Enhanced scoring fields
     attempts_last_90_days?: number;
     attempts_last_15_days?: number;
     attempts_30d?: number;
     computed_score?: number;
     score_breakdown?: {
       mobile_available: number;
       days_since_last_call: number;
       positions_count: number;
       lead_quality_score: number;
       company_size_score: number;
       recent_attempts_penalty: number;
       business_hours_score: number;
     };
     badge_reason?: string;
     badge_type?: 'attempt_penalty' | 'cool_off' | 'none';
     phone_index?: number; // For cycling through multiple phones
     is_valid_phone?: boolean;
     business_hours_score?: number;
}

export interface DailyWhatsAppSession {
     id: string;
     date: string;
     selectedCallCenterIds: string[];
     sentTodayIds: string[];
     createdAt: string;
     updatedAt: string;
     // Enhanced session data
     sessionScoreData?: {
       [callCenterId: string]: {
         scheduledTime: string;
         timeUntilSend: number;
         priorityBadge?: string;
         whatsappConfidence?: number;
       };
     };
}

export interface DailyWhatsAppSuggestion {
  callCenter: CallCenter;
  scheduledTime: string; // ISO string
  timeUntilSend: number; // minutes until send
  whatsappLink: string;
  lastWhatsAppSent?: string; // ISO string of last WhatsApp message
  daysSinceLastWhatsApp: number;
  priorityBadge?: string;
  priorityType?: 'high_positions' | 'long_time' | 'medium_confidence';
  whatsappConfidence?: number;
  mobileCount?: number;
}

export interface DailyCallHistory {
   id: string;
   callCenterId: string;
   callCenterName: string;
   action: 'call_logged' | 'moved_to_called' | 'moved_back_to_today' | 'manual_override' | 'marked_dnc' | 'marked_invalid' | 'attempt_threshold_reached';
   timestamp: string;
   details: {
     outcome?: string;
     duration?: number;
     notes?: string;
     followUp?: string;
     steps?: Array<{ title: string; description: string; priority: string }>;
     override_reason?: string;
     override_by_agent?: string;
     dnc_reason?: string;
     invalid_reason?: string;
     threshold_type?: '15_day_attempts' | '90_day_attempts';
     attempt_count?: number;
   };
   userId?: string;
}

export interface DailyCallsSettings {
   daily_suggestion_count: number;
   cool_off_days: number;
   max_attempts_15_days: number;
   max_attempts_90_days: number;
   score_penalty_90_days: number;
   scoring_weights: {
     mobile_available: number;
     days_since_last_call: number;
     positions_count: number;
     lead_quality_score: number;
     company_size_score: number;
     recent_attempts_penalty: number;
     business_hours_score: number;
   };
   business_hours: {
     [country: string]: {
       timezone: string;
       work_hours_start: number; // 24h format
       work_hours_end: number;
       work_days: number[]; // 0=Sunday, 1=Monday, etc.
     };
   };
}

export interface DailyWhatsAppHistory {
  id: string;
  callCenterId: string;
  callCenterName: string;
  action: 'whatsapp_sent' | 'bulk_whatsapp_sent' | 'scheduled' | 'moved_to_sent' | 'moved_back_to_suggestions' | 'removed';
  timestamp: string;
  details: {
    message?: string;
    scheduledTime?: string;
    whatsappLink?: string;
    reason?: string;
  };
  userId?: string;
}