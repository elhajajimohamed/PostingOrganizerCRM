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
  writeBatch,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PhoneDetectionService } from './phone-detection-service';

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

const COLLECTION_NAMES = {
  PROSPECTS: 'prospects',
} as const;

export interface Prospect {
  id: string;
  name: string;
  country: string;
  city: string;
  positions: number;
  businessType: 'call-center' | 'voip-reseller' | 'data-vendor' | 'workspace-rental' | 'individual';
  phones: string[];
  phone_infos?: any[];
  emails: string[];
  website: string;
  address?: string;
  source?: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  prospectDate: string;
  addedDate?: string;
  status: 'pending' | 'contacted' | 'qualified' | 'not_interested' | 'invalid' | 'active' | 'added_to_crm' | 'archived';
  priority: 'low' | 'medium' | 'high';
  // New destinations field for calling destinations (multiple selection)
  destinations?: string[];
  contacts?: Contact[];
  steps?: Step[];
  callHistory?: CallLog[];
  contactAttempts?: number;
  lastContacted?: string;
  // DNC/DND/DP fields
  dnc?: boolean;
  dnd?: boolean;
  dp?: boolean;
  dncDescription?: string;
  dndDescription?: string;
  dpDescription?: string;
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  notes: string;
  // Personalization fields for rapport building
  personal_details?: string;
  rapport_tags?: string[];
  // Pattern interrupt fields
  pattern_interrupt_used?: boolean;
  pattern_interrupt_note?: string;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
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
    // Quality scoring fields
    accroche_score?: number; // 1-5
    discovery_score?: number; // 1-5
    value_prop_score?: number; // 1-5
    objection_score?: number; // 1-5
    closing_score?: number; // 1-5
    client_talk_ratio?: number; // 0-100 percentage
    agent_talk_ratio?: number; // 0-100 percentage (derived as 100 - client_talk_ratio)
    // Advanced call result classification fields
    is_argumented?: boolean; // True = argumenté, False = non argumenté
    decision_maker_reached?: boolean; // True/False
    objection_category?: 'price' | 'email' | 'timing' | 'already_has_provider' | 'bad_number' | 'other'; // ENUM values
    objection_detail?: string; // Free text for exact prospect response
    refusal_reason?: 'prix_trop_cher' | 'envoyez_un_email' | 'pas_maintenant' | 'deja_un_fournisseur' | 'mauvais_numero' | 'autre'; // ENUM values
    // Personalization fields for rapport building (added to call log)
    personal_details?: string;
    rapport_tags?: string[];
    // Pattern interrupt fields (added to call log)
    pattern_interrupt_used?: boolean;
    pattern_interrupt_note?: string;
  }

export class ProspectionService {
  // Get all prospects (for the new structure)
  static async getAllProspects(): Promise<Prospect[]> {
    try {
      console.log('🔍 ProspectionService - Fetching all prospects');


      // Get all prospects using client SDK
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAMES.PROSPECTS));

      const prospects = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          country: data.country || '',
          city: data.city || '',
          positions: data.positions || 0,
          businessType: data.businessType || 'call-center',
          phones: data.phones || [],
          phone_infos: data.phone_infos || [],
          emails: data.emails || [],
          website: data.website || '',
          address: data.address || '',
          source: data.source || '',
          tags: data.tags || '',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          prospectDate: data.prospectDate || '',
          addedDate: data.addedDate || data.prospectDate || '',
          status: data.status || 'active',
          priority: data.priority || 'medium',
          destinations: data.destinations || [],
          contacts: data.contacts || [],
          steps: data.steps || [],
          callHistory: data.callHistory || [],
          contactAttempts: data.contactAttempts || 0,
          lastContacted: data.lastContacted || undefined,
          // DNC/DND/DP fields
          dnc: data.dnc || false,
          dnd: data.dnd || false,
          dp: data.dp || false,
          dncDescription: data.dncDescription || '',
          dndDescription: data.dndDescription || '',
          dpDescription: data.dpDescription || '',
        } as Prospect;
      });

      console.log('✅ ProspectionService - Fetched prospects:', prospects.length);
      return prospects;
    } catch (error) {
      console.error('❌ ProspectionService - Error fetching all prospects:', error);
      throw error;
    }
  }

  // Get prospects for a specific date
  static async getProspects(date?: string, tab: 'today' | 'history' | 'contacted' = 'today'): Promise<Prospect[]> {
    try {
      // Get all prospects and filter client-side to avoid composite index issues
      const q = query(collection(db, COLLECTION_NAMES.PROSPECTS), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      let prospects = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          country: data.country || '',
          city: data.city || '',
          positions: data.positions || 0,
          businessType: data.businessType || 'call-center',
          phones: data.phones || [],
          phone_infos: data.phone_infos || [],
          emails: data.emails || [],
          website: data.website || '',
          address: data.address || '',
          source: data.source || '',
          tags: data.tags || '',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          prospectDate: data.prospectDate || '',
          addedDate: data.addedDate || data.prospectDate || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          destinations: data.destinations || [],
          contacts: data.contacts || [],
          steps: data.steps || [],
          callHistory: data.callHistory || [],
          contactAttempts: data.contactAttempts || 0,
          lastContacted: data.lastContacted || undefined,
          // DNC/DND/DP fields
          dnc: data.dnc || false,
          dnd: data.dnd || false,
          dp: data.dp || false,
          dncDescription: data.dncDescription || '',
          dndDescription: data.dndDescription || '',
          dpDescription: data.dpDescription || '',
        } as Prospect;
      });

      // Apply client-side filtering based on tab
      if (date) {
        if (tab === 'today') {
          // Show only prospects for this date with pending status
          prospects = prospects.filter(p => p.prospectDate === date && p.status === 'pending');
        } else if (tab === 'contacted') {
          // Show only prospects that were contacted (moved to this section) on this date
          // Include both 'contacted' and 'added_to_crm' status prospects that were contacted on the selected date
          const selectedDateFormatted = new Date(date).toISOString().split('T')[0];
          prospects = prospects.filter(p => {
            if (!p.lastContacted) return false;
            const contactedDateFormatted = new Date(p.lastContacted).toISOString().split('T')[0];
            return contactedDateFormatted === selectedDateFormatted && (p.status === 'contacted' || p.status === 'added_to_crm');
          });
        } else {
          // History tab: show prospects from dates before the selected date
          prospects = prospects.filter(p => p.prospectDate && p.prospectDate < date);
        }
      } else {
        // If no date provided, show all prospects
        if (tab === 'contacted') {
          prospects = prospects.filter(p => p.status === 'contacted' || p.status === 'added_to_crm');
        }
      }

      return prospects;
    } catch (error) {
      console.error('Error fetching prospects:', error);
      throw error;
    }
  }

  // Get a single prospect
  static async getProspect(id: string): Promise<Prospect | null> {
    try {
      const docRef = doc(db, COLLECTION_NAMES.PROSPECTS, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          country: data.country || '',
          city: data.city || '',
          positions: data.positions || 0,
          businessType: data.businessType || 'call-center',
          phones: data.phones || [],
          phone_infos: data.phone_infos || [],
          emails: data.emails || [],
          website: data.website || '',
          address: data.address || '',
          source: data.source || '',
          tags: data.tags || '',
          notes: data.notes || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          prospectDate: data.prospectDate || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          destinations: data.destinations || [],
          contacts: data.contacts || [],
          steps: data.steps || [],
          callHistory: data.callHistory || [],
          // DNC/DND/DP fields
          dnc: data.dnc || false,
          dnd: data.dnd || false,
          dp: data.dp || false,
          dncDescription: data.dncDescription || '',
          dndDescription: data.dndDescription || '',
          dpDescription: data.dpDescription || '',
        } as Prospect;
      }
      return null;
    } catch (error) {
      console.error('Error fetching prospect:', error);
      throw error;
    }
  }

  // Create a new prospect
  static async createProspect(prospect: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Creating prospect:', prospect);

      // Run phone detection on phones
      let phoneInfos: any[] = [];
      if (prospect.phones && prospect.phones.length > 0) {
        phoneInfos = (prospect.phones as string[]).map((phone: string) => PhoneDetectionService.detectPhone(phone, prospect.country));
      }

      const prospectData = {
        ...prospect,
        phone_infos: phoneInfos,
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAMES.PROSPECTS), {
        ...prospectData,
        createdAt: Timestamp.now(),
      });

      console.log('Prospect created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating prospect:', error);
      throw error;
    }
  }

  // Update a prospect
  static async updateProspect(id: string, updates: Partial<Prospect>, skipSync: boolean = false): Promise<void> {
    try {
      // Run phone detection if phones are updated
      if (updates.phones) {
        const prospect = await this.getProspect(id);
        const country = prospect?.country;
        // Handle both string and array formats for phones
        const phoneArray = Array.isArray(updates.phones)
          ? updates.phones
          : (typeof updates.phones === 'string'
              ? (updates.phones as string).split(';').map((p: string) => p.trim()).filter((p: string) => p)
              : []);
        const phoneInfos = phoneArray.map((phone: string) => PhoneDetectionService.detectPhone(phone, country));
        updates.phone_infos = phoneInfos;
      }

      const docRef = doc(db, COLLECTION_NAMES.PROSPECTS, id);
      const updateData: Record<string, any> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, updateData);

      // Skip sync operations if requested
      if (skipSync) {
        return;
      }

      // Sync DNC/DND/DP flags to call centers
      if (updates.dnc !== undefined || updates.dnd !== undefined || updates.dp !== undefined ||
          updates.dncDescription !== undefined || updates.dndDescription !== undefined || updates.dpDescription !== undefined) {
        try {
          const prospect = await this.getProspect(id);
          if (prospect) {
            await this.syncComplianceFlagsToCallCenters(prospect, updates);
          }
        } catch (syncError) {
          console.error('❌ Error syncing compliance flags to call centers:', syncError);
          // Don't fail the prospect update if sync fails
        }
      }

      // Sync status changes to call centers
      if (updates.status !== undefined) {
        try {
          const prospect = await this.getProspect(id);
          if (prospect) {
            await this.syncStatusToCallCenters(prospect, updates.status);
          }
        } catch (syncError) {
          console.error('❌ Error syncing status to call centers:', syncError);
          // Don't fail the prospect update if sync fails
        }
      }

      // Sync priority changes to call centers
      if (updates.priority !== undefined) {
        try {
          const prospect = await this.getProspect(id);
          if (prospect) {
            await this.syncPriorityToCallCenters(prospect, updates.priority);
          }
        } catch (syncError) {
          console.error('❌ Error syncing priority to call centers:', syncError);
          // Don't fail the prospect update if sync fails
        }
      }

      // Sync tags to call centers
      if (updates.tags !== undefined) {
        try {
          const prospect = await this.getProspect(id);
          if (prospect) {
            await this.syncTagsToCallCenters(prospect, updates.tags);
          }
        } catch (syncError) {
          console.error('❌ Error syncing tags to call centers:', syncError);
          // Don't fail the prospect update if sync fails
        }
      }

      // Sync destinations to call centers
      if (updates.destinations !== undefined) {
        try {
          const prospect = await this.getProspect(id);
          if (prospect) {
            await this.syncDestinationsToCallCenters(prospect, updates.destinations);
          }
        } catch (syncError) {
          console.error('❌ Error syncing destinations to call centers:', syncError);
          // Don't fail the prospect update if sync fails
        }
      }

      // Sync notes to call centers
      if (updates.notes !== undefined) {
        try {
          const prospect = await this.getProspect(id);
          if (prospect) {
            await this.syncNotesToCallCenters(prospect, updates.notes);
          }
        } catch (syncError) {
          console.error('❌ Error syncing notes to call centers:', syncError);
          // Don't fail the prospect update if sync fails
        }
      }
    } catch (error) {
      console.error('Error updating prospect:', error);
      throw error;
    }
  }

  // Delete a prospect
  static async deleteProspect(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAMES.PROSPECTS, id));
    } catch (error) {
      console.error('Error deleting prospect:', error);
      throw error;
    }
  }

  // Bulk delete prospects
  static async bulkDeleteProspects(prospectIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const id of prospectIds) {
        const docRef = doc(db, COLLECTION_NAMES.PROSPECTS, id);
        batch.delete(docRef);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error bulk deleting prospects:', error);
      throw error;
    }
  }

  // Import prospects from JSON
  static async importProspects(prospects: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'>[], date: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const prospect of prospects) {
        // Run phone detection for each prospect
        let phoneInfos: any[] = [];
        let phoneArray: string[] = [];
        
        if (prospect.phones) {
          // Convert to array if it's a string
          phoneArray = Array.isArray(prospect.phones)
            ? prospect.phones
            : (typeof prospect.phones === 'string'
                ? (prospect.phones as string).split(';').map((p: string) => p.trim()).filter((p: string) => p)
                : []);
          
          if (phoneArray.length > 0) {
            phoneInfos = phoneArray.map((phone: string) => PhoneDetectionService.detectPhone(phone, prospect.country));
          }
        }

        // Convert emails from string to array if needed
        let emailArray: string[] = [];
        if (prospect.emails) {
          emailArray = Array.isArray(prospect.emails)
            ? prospect.emails
            : (typeof prospect.emails === 'string'
                ? (prospect.emails as string).split(';').map((e: string) => e.trim()).filter((e: string) => e)
                : []);
        }

        // Convert tags from string to array if needed
        let tagArray: string[] = [];
        if (prospect.tags) {
          tagArray = Array.isArray(prospect.tags)
            ? prospect.tags
            : (typeof prospect.tags === 'string'
                ? (prospect.tags as string).split(';').map((t: string) => t.trim()).filter((t: string) => t)
                : []);
        }

        const prospectData = {
          ...prospect,
          phones: phoneArray,
          emails: emailArray,
          tags: tagArray,
          prospectDate: date,
          phone_infos: phoneInfos,
          updatedAt: new Date().toISOString(),
        };

        const docRef = doc(collection(db, COLLECTION_NAMES.PROSPECTS));
        batch.set(docRef, {
          ...prospectData,
          createdAt: Timestamp.now(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error importing prospects:', error);
      throw error;
    }
  }

  // Add contact to prospect
  static async addContact(prospectId: string, contact: Omit<Contact, 'id'>, skipSync: boolean = false): Promise<string> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect) throw new Error('Prospect not found');

      // Run phone detection for contact phone
      let phoneInfo;
      if (contact.phone) {
        phoneInfo = PhoneDetectionService.detectPhone(contact.phone, prospect.country);
      }

      const contactWithInfo = {
        ...contact,
        phone_info: phoneInfo,
        id: Date.now().toString() // Simple ID generation
      };

      const contacts = [...(prospect.contacts || []), contactWithInfo];
      await this.updateProspect(prospectId, { contacts });

      // Sync contact to call centers (only if not skipping sync)
      if (!skipSync) {
        try {
          await this.syncContactToCallCenters(prospect, contactWithInfo);
        } catch (syncError) {
          console.error('❌ Error syncing contact to call centers:', syncError);
          // Don't fail the contact addition if sync fails
        }
      }

      return contactWithInfo.id;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  // Add step to prospect
  static async addStep(prospectId: string, step: Omit<Step, 'id'>): Promise<string> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect) throw new Error('Prospect not found');

      const stepWithId = {
        ...step,
        id: Date.now().toString(), // Simple ID generation
        completed: false
      };

      const steps = [...(prospect.steps || []), stepWithId];
      await this.updateProspect(prospectId, { steps });

      // Create calendar event for the step
      if (step.date) {
        try {
          const priorityColor = step.priority === 'high' ? '#ef4444' :
                               step.priority === 'medium' ? '#FFC107' : '#4CAF50';

          const eventData = {
            title: step.title || 'Step',
            description: step.description || '',
            date: step.date,
            time: '',
            location: '',
            type: 'task' as const,
            color: priorityColor,
            callCenterId: prospectId, // Use prospect ID as callCenterId for prospects
            callCenterName: prospect.name || 'Unknown Prospect',
            relatedType: 'step',
            relatedId: stepWithId.id
          };

          // Import the calendar collection functions
          const { collection, addDoc, Timestamp } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');

          await addDoc(collection(db, 'calendarEvents'), {
            ...eventData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          console.log(`📅 [CALENDAR] Created calendar event for prospect step: "${step.title || 'Step'}"`);
        } catch (calendarError) {
          console.error('Error creating calendar event for prospect step:', calendarError);
          // Don't fail the step creation if calendar event fails
        }
      }

      return stepWithId.id;
    } catch (error) {
      console.error('Error adding step:', error);
      throw error;
    }
  }

  // Add call log to prospect
  static async addCallLog(prospectId: string, callLog: Omit<CallLog, 'id'>): Promise<string> {
    try {
      console.log(`📞 [CALL-LOG] Attempting to save call log for prospect ${prospectId}:`, {
        date: callLog.date,
        outcome: callLog.outcome,
        duration: callLog.duration,
        notes: callLog.notes,
        followUp: callLog.followUp
      });

      const prospect = await this.getProspect(prospectId);
      if (!prospect) throw new Error('Prospect not found');

      const callLogWithId = {
        ...callLog,
        id: Date.now().toString(), // Simple ID generation
        date: callLog.date || new Date().toISOString()
      };

      console.log(`📞 [CALL-LOG] Call log data to save:`, callLogWithId);

      const callHistory = [...(prospect.callHistory || []), callLogWithId];

      // Update prospect with call log and set status to contacted if not already contacted
      const updates: Partial<Prospect> = {
        callHistory,
        lastContacted: callLogWithId.date,
        contactAttempts: (prospect.contactAttempts || 0) + 1
      };

      // Set status to 'contacted' if this is the first contact attempt
      if (!prospect.lastContacted && prospect.status === 'pending') {
        updates.status = 'contacted';
      }

      await this.updateProspect(prospectId, updates);

      console.log(`✅ [CALL-LOG] Successfully saved call log with ID: ${callLogWithId.id}`);

      // Sync call log to call centers
      try {
        await this.syncCallLogToCallCenters(prospect, callLogWithId);
      } catch (syncError) {
        console.error('❌ Error syncing call log to call centers:', syncError);
        // Don't fail the call log addition if sync fails
      }

      return callLogWithId.id;
    } catch (error) {
      console.error('❌ [CALL-LOG] Error adding call log:', error);
      console.error('❌ [CALL-LOG] Error details:', {
        prospectId,
        callLog,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Update contact
  static async updateContact(prospectId: string, contactId: string, updates: Partial<Contact>): Promise<void> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect || !prospect.contacts) throw new Error('Prospect or contacts not found');

      const updatedContacts = prospect.contacts.map(contact =>
        contact.id === contactId ? { ...contact, ...updates } : contact
      );

      await this.updateProspect(prospectId, { contacts: updatedContacts });
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  // Update step
  static async updateStep(prospectId: string, stepId: string, updates: Partial<Step>): Promise<void> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect || !prospect.steps) throw new Error('Prospect or steps not found');

      const updatedSteps = prospect.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      );

      await this.updateProspect(prospectId, { steps: updatedSteps });
    } catch (error) {
      console.error('Error updating step:', error);
      throw error;
    }
  }

  // Delete contact
  static async deleteContact(prospectId: string, contactId: string): Promise<void> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect || !prospect.contacts) throw new Error('Prospect or contacts not found');

      const updatedContacts = prospect.contacts.filter(contact => contact.id !== contactId);
      await this.updateProspect(prospectId, { contacts: updatedContacts });
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  // Delete step
  static async deleteStep(prospectId: string, stepId: string): Promise<void> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect || !prospect.steps) throw new Error('Prospect or steps not found');

      const updatedSteps = prospect.steps.filter(step => step.id !== stepId);
      await this.updateProspect(prospectId, { steps: updatedSteps });
    } catch (error) {
      console.error('Error deleting step:', error);
      throw error;
    }
  }

  // Update call log
  static async updateCallLog(prospectId: string, callLogId: string, updates: Partial<CallLog>): Promise<void> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect || !prospect.callHistory) throw new Error('Prospect or call history not found');

      const updatedCallHistory = prospect.callHistory.map(callLog =>
        callLog.id === callLogId ? { ...callLog, ...updates } : callLog
      );

      await this.updateProspect(prospectId, { callHistory: updatedCallHistory });
    } catch (error) {
      console.error('Error updating call log:', error);
      throw error;
    }
  }

  // Delete call log
  static async deleteCallLog(prospectId: string, callLogId: string): Promise<void> {
    try {
      const prospect = await this.getProspect(prospectId);
      if (!prospect || !prospect.callHistory) throw new Error('Prospect or call history not found');

      const updatedCallHistory = prospect.callHistory.filter(callLog => callLog.id !== callLogId);
      await this.updateProspect(prospectId, { callHistory: updatedCallHistory });
    } catch (error) {
      console.error('Error deleting call log:', error);
      throw error;
    }
  }

  // Find duplicate prospects based on name or phone
  static async findDuplicateProspects(): Promise<{ [key: string]: Prospect[] }> {
    try {
      console.log('🔍 ProspectionService - Finding duplicate prospects');

      const allProspects = await this.getAllProspects();
      const duplicates: { [key: string]: Prospect[] } = {};

      // Group by normalized name (lowercase, trim, remove special chars)
      const nameGroups: { [key: string]: Prospect[] } = {};
      const phoneGroups: { [key: string]: Prospect[] } = {};

      for (const prospect of allProspects) {
        // Group by name
        const normalizedName = prospect.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
        if (!nameGroups[normalizedName]) {
          nameGroups[normalizedName] = [];
        }
        nameGroups[normalizedName].push(prospect);

        // Group by phone numbers
        if (prospect.phones && prospect.phones.length > 0) {
          for (const phone of prospect.phones) {
            // Normalize phone: remove spaces, dashes, parentheses
            const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (!phoneGroups[normalizedPhone]) {
              phoneGroups[normalizedPhone] = [];
            }
            phoneGroups[normalizedPhone].push(prospect);
          }
        }
      }

      // Find duplicates by name (groups with more than 1 prospect)
      for (const [nameKey, prospects] of Object.entries(nameGroups)) {
        if (prospects.length > 1) {
          duplicates[`name_${nameKey}`] = prospects;
        }
      }

      // Find duplicates by phone (groups with more than 1 prospect)
      for (const [phoneKey, prospects] of Object.entries(phoneGroups)) {
        if (prospects.length > 1) {
          // Avoid duplicating groups already found by name
          const isAlreadyGrouped = Object.values(duplicates).some(group =>
            group.some(p => prospects.some(dp => dp.id === p.id))
          );

          if (!isAlreadyGrouped) {
            duplicates[`phone_${phoneKey}`] = prospects;
          }
        }
      }

      console.log('✅ ProspectionService - Found duplicate groups:', Object.keys(duplicates).length);
      return duplicates;
    } catch (error) {
      console.error('❌ ProspectionService - Error finding duplicates:', error);
      throw error;
    }
  }

  // Synchronization methods for bidirectional updates

  // Sync compliance flags (DNC/DND/DP) from prospect to call centers
  static async syncComplianceFlagsToCallCenters(prospect: Prospect, updates: Partial<Prospect>): Promise<void> {
    try {
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        const flagUpdates: any = {};
        if (updates.dnc !== undefined) flagUpdates.dnc = updates.dnc;
        if (updates.dnd !== undefined) flagUpdates.dnd = updates.dnd;
        if (updates.dp !== undefined) flagUpdates.dp = updates.dp;
        if (updates.dncDescription !== undefined) flagUpdates.dncDescription = updates.dncDescription;
        if (updates.dndDescription !== undefined) flagUpdates.dndDescription = updates.dndDescription;
        if (updates.dpDescription !== undefined) flagUpdates.dpDescription = updates.dpDescription;

        if (Object.keys(flagUpdates).length > 0) {
          await ExternalCRMService.updateCallCenter(matchingCallCenter.id, flagUpdates);
          console.log(`🔄 Synced compliance flags from prospect ${prospect.name} to call center`);
        }
      }
    } catch (error) {
      console.error('Error syncing compliance flags to call centers:', error);
      throw error;
    }
  }

  // Sync status from prospect to call centers
  static async syncStatusToCallCenters(prospect: Prospect, newStatus: Prospect['status']): Promise<void> {
    try {
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        // Map prospect status to call center status
        let callCenterStatus: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold' = 'New';
        switch (newStatus) {
          case 'pending':
            callCenterStatus = 'New';
            break;
          case 'contacted':
            callCenterStatus = 'Contacted';
            break;
          case 'qualified':
            callCenterStatus = 'Qualified';
            break;
          case 'not_interested':
            callCenterStatus = 'Closed-Lost';
            break;
          case 'invalid':
            callCenterStatus = 'Closed-Lost';
            break;
          case 'added_to_crm':
            callCenterStatus = 'Proposal';
            break;
          case 'archived':
            callCenterStatus = 'Closed-Lost';
            break;
        }

        await ExternalCRMService.updateCallCenter(matchingCallCenter.id, { status: callCenterStatus });
        console.log(`🔄 Synced status from prospect ${prospect.name} to call center: ${newStatus} -> ${callCenterStatus}`);
      }
    } catch (error) {
      console.error('Error syncing status to call centers:', error);
      throw error;
    }
  }

  // Sync priority from prospect to call centers (Note: CallCenter doesn't have priority field, so we'll skip this for now)
  static async syncPriorityToCallCenters(prospect: Prospect, newPriority: Prospect['priority']): Promise<void> {
    // CallCenter interface doesn't have a priority field, so we'll skip this sync
    console.log(`⚠️ Skipping priority sync for prospect ${prospect.name} - CallCenter doesn't have priority field`);
  }

  // Sync tags from prospect to call centers
  static async syncTagsToCallCenters(prospect: Prospect, newTags: string[]): Promise<void> {
    try {
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        await ExternalCRMService.updateCallCenter(matchingCallCenter.id, { tags: newTags });
        console.log(`🔄 Synced tags from prospect ${prospect.name} to call center`);
      }
    } catch (error) {
      console.error('Error syncing tags to call centers:', error);
      throw error;
    }
  }

  // Sync destinations from prospect to call centers
  static async syncDestinationsToCallCenters(prospect: Prospect, newDestinations: string[]): Promise<void> {
    try {
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        await ExternalCRMService.updateCallCenter(matchingCallCenter.id, { destinations: newDestinations });
        console.log(`🔄 Synced destinations from prospect ${prospect.name} to call center`);
      }
    } catch (error) {
      console.error('Error syncing destinations to call centers:', error);
      throw error;
    }
  }

  // Sync notes from prospect to call centers
  static async syncNotesToCallCenters(prospect: Prospect, newNotes: string): Promise<void> {
    try {
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        // Append prospect notes to call center notes
        const updatedNotes = matchingCallCenter.notes
          ? `${matchingCallCenter.notes}\n\n--- Prospect Notes ---\n${newNotes}`
          : newNotes;

        await ExternalCRMService.updateCallCenter(matchingCallCenter.id, { notes: updatedNotes });
        console.log(`🔄 Synced notes from prospect ${prospect.name} to call center`);
      }
    } catch (error) {
      console.error('Error syncing notes to call centers:', error);
      throw error;
    }
  }

  // Sync contact from prospect to call centers
  static async syncContactToCallCenters(prospect: Prospect, contact: Contact): Promise<void> {
    try {
      const { ExternalCRMSubcollectionsService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        // Convert prospect contact to call center contact format
        const callCenterContact = {
          name: contact.name,
          position: contact.position,
          email: contact.email,
          phone: contact.phone,
          department: contact.position || 'General', // Use position as department
          notes: contact.notes,
          lastContact: new Date().toISOString()
        };

        await ExternalCRMSubcollectionsService.addContact(matchingCallCenter.id.toString(), callCenterContact);
        console.log(`🔄 Synced contact ${contact.name} from prospect ${prospect.name} to call center`);
      }
    } catch (error) {
      console.error('Error syncing contact to call centers:', error);
      throw error;
    }
  }

  // Sync call log from prospect to call centers
  static async syncCallLogToCallCenters(prospect: Prospect, callLog: CallLog): Promise<void> {
    try {
      const { ExternalCRMSubcollectionsService } = await import('@/lib/services/external-crm-service');

      // Find matching call centers by name
      const { ExternalCRMService } = await import('@/lib/services/external-crm-service');
      const callCenters = await ExternalCRMService.getCallCenters({}, { field: 'createdAt', direction: 'desc' }, 0, 1000);
      const matchingCallCenter = callCenters.find(cc => cc.name.toLowerCase() === prospect.name.toLowerCase());

      if (matchingCallCenter) {
        // Remove id field for the new call log
        const { id, ...callLogData } = callLog;
        await ExternalCRMSubcollectionsService.addCallLog(matchingCallCenter.id.toString(), callLogData);
        console.log(`🔄 Synced call log from prospect ${prospect.name} to call center`);
      }
    } catch (error) {
      console.error('Error syncing call log to call centers:', error);
      throw error;
    }
  }
}