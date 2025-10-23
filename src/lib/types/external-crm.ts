// External CRM Types for Call Center Management
export interface CallCenter {
   id: string; // Changed to string to match Firestore document IDs
   name: string;
   country: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon';
   city: string;
   positions: number;
   status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold';
   phones: string[];
   emails: string[];
   website: string;
   tags: string[];
   notes: string;
   createdAt: string;
   updatedAt: string;
   lastContacted: string | null;
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
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
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
}

export interface DailyCallCenter {
    callCenter: CallCenter;
    callCount: number;
    lastCalledDate?: string;
    needsNewPhoneNumber: boolean;
    daysSinceLastCall: number;
}