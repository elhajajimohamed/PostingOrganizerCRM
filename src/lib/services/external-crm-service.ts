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
  QueryConstraint,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CallCenter,
  PhoneRotationData,
  ExternalCRMData,
  SearchFilters,
  SortOptions,
  ApiResponse,
  BatchOperation,
  Suggestion,
  Contact,
  Step,
  CallLog,
  Recharge,
  PhoneInfo,
} from '@/lib/types/external-crm';
import { PhoneDetectionService } from './phone-detection-service';

const COLLECTION_NAMES = {
  CALL_CENTERS: 'callCenters',
  CALENDAR_EVENTS: 'calendarEvents',
  PHONE_ROTATION: 'phoneRotation',
  SUGGESTIONS: 'suggestions',
} as const;

// Call Center Service
export class ExternalCRMService {
  // Call Center CRUD operations
  static async getCallCenters(
    filters?: SearchFilters,
    sort?: SortOptions,
    offset?: number,
    limitParam?: number
  ): Promise<CallCenter[]> {
    try {
      console.log('🔍 ExternalCRMService.getCallCenters called with:', {
        filters,
        sort,
        offset,
        limitParam
      });

      const constraints: QueryConstraint[] = [];

      // Allow unlimited queries when limitParam is explicitly undefined (for total count)
      const limitValue = limitParam !== undefined ? Math.min(limitParam || 50, 100) : undefined;

      // For single-user VoIP sales, prioritize active/recent call centers
      // Use simple ordering to avoid composite index requirements
      constraints.push(orderBy('createdAt', 'desc'));

      // Apply basic filters only - avoid complex queries that need indexes
      if (filters?.status && ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'].includes(filters.status)) {
        constraints.push(where('status', '==', filters.status));
      }

      // Only apply limit if limitValue is defined
      if (limitValue !== undefined) {
        constraints.push(limit(limitValue));
      }

      console.log('🔍 ExternalCRMService - Building query with constraints:', constraints.length);

      const q = query(collection(db, COLLECTION_NAMES.CALL_CENTERS), ...constraints);
      console.log('🔍 ExternalCRMService - Executing query...');

      const querySnapshot = await getDocs(q);
      console.log('✅ ExternalCRMService - Query executed, docs count:', querySnapshot.docs.length);

      let callCenters: CallCenter[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
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
      });

      console.log('✅ ExternalCRMService - Mapped call centers:', callCenters.length);

      // Apply client-side search filtering if search term is provided
      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        console.log('🔍 ExternalCRMService - Applying search filter:', searchTerm);

        const originalCount = callCenters.length;
        callCenters = callCenters.filter(callCenter => {
          const matches = callCenter.name.toLowerCase().includes(searchTerm) ||
                 callCenter.city.toLowerCase().includes(searchTerm) ||
                 callCenter.country.toLowerCase().includes(searchTerm) ||
                 (callCenter.email && callCenter.email.toLowerCase().includes(searchTerm)) ||
                 (callCenter.notes && typeof callCenter.notes === 'string' && String(callCenter.notes).toLowerCase().includes(searchTerm)) ||
                 callCenter.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                 callCenter.phones?.some(phone => phone.includes(searchTerm));

          if (matches) {
            console.log('✅ ExternalCRMService - Match found:', callCenter.name);
          }

          return matches;
        });

        console.log('✅ ExternalCRMService - Search filtered from', originalCount, 'to', callCenters.length, 'results');
      }

      console.log('✅ ExternalCRMService - Returning call centers:', callCenters.length);
      return callCenters;
    } catch (error) {
      console.error('❌ ExternalCRMService - Error fetching call centers:', error);
      console.error('❌ ExternalCRMService - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  static async getCallCenter(id: number | string): Promise<CallCenter | null> {
    try {
      // Handle both numeric IDs and Firebase document IDs
      const docId = typeof id === 'string' ? id : id.toString();
      const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Load subcollections (contacts, steps, etc.)
        const [contacts, steps, callHistory, recharges] = await Promise.all([
          ExternalCRMSubcollectionsService.getContacts(docId),
          ExternalCRMSubcollectionsService.getSteps(docId),
          ExternalCRMSubcollectionsService.getCallHistory(docId),
          ExternalCRMSubcollectionsService.getRecharges(docId),
        ]);

        return {
          id: typeof id === 'string' ? parseInt(docSnap.id) : id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          lastContacted: data.lastContacted?.toDate?.()?.toISOString() || data.lastContacted,
          contacts,
          steps,
          callHistory,
          recharges,
          phone_infos: data.phone_infos || [],
        } as CallCenter;
      }
      return null;
    } catch (error) {
      console.error('Error fetching call center:', error);
      throw error;
    }
  }

  static async createCallCenter(callCenter: Omit<CallCenter, 'id' | 'createdAt'>): Promise<number> {
    try {
      // Run phone detection on phones
      let phoneInfos: PhoneInfo[] = [];
      if (callCenter.phones && callCenter.phones.length > 0) {
        phoneInfos = callCenter.phones.map(phone => PhoneDetectionService.detectPhone(phone, callCenter.country));
      }

      const callCenterWithInfo = { ...callCenter, phone_infos: phoneInfos };

      // Development mode: Try without authentication first
      const docRef = await addDoc(collection(db, COLLECTION_NAMES.CALL_CENTERS), {
        ...callCenterWithInfo,
        createdAt: Timestamp.now(),
        lastContacted: callCenter.lastContacted ? Timestamp.fromDate(new Date(callCenter.lastContacted)) : null,
      });

      return parseInt(docRef.id);
    } catch (error) {
      console.error('Error creating call center:', error);
      // If permission denied, suggest logging in or updating Firestore rules
      if (error instanceof Error && error.message.includes('permission-denied')) {
        console.error('Permission denied. Please ensure you are logged in or update Firestore rules to allow unauthenticated access for development.');
      }
      throw error;
    }
  }

  static async updateCallCenter(id: number, updates: Partial<CallCenter>): Promise<void> {
    try {
      // Run phone detection if phones are updated
      if (updates.phones) {
        const callCenter = await this.getCallCenter(id);
        const country = callCenter?.country;
        const phoneInfos = updates.phones.map(phone => PhoneDetectionService.detectPhone(phone, country));
        updates.phone_infos = phoneInfos;
      }

      const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, id.toString());
      const updateData: Record<string, any> = { ...updates };

      if (updates.lastContacted) {
        updateData.lastContacted = Timestamp.fromDate(new Date(updates.lastContacted));
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating call center:', error);
      throw error;
    }
  }

  static async deleteCallCenter(id: number): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAMES.CALL_CENTERS, id.toString()));
    } catch (error) {
      console.error('Error deleting call center:', error);
      throw error;
    }
  }

  // Batch operations for call centers
  static async batchDeleteCallCenters(callCenterIds: number[]): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const id of callCenterIds) {
        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, id.toString());
        batch.delete(docRef);
        deletedCount++;
      }

      await batch.commit();
      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('Error batch deleting call centers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async batchUpdateCallCenters(updates: { id: number; changes: Partial<CallCenter> }[]): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const update of updates) {
        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, update.id.toString());
        const updateData: Record<string, any> = { ...update.changes };

        if (update.changes.lastContacted) {
          updateData.lastContacted = Timestamp.fromDate(new Date(update.changes.lastContacted));
        }

        batch.update(docRef, updateData);
        updatedCount++;
      }

      await batch.commit();
      return { success: true, updated: updatedCount };
    } catch (error) {
      console.error('Error batch updating call centers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async batchTagCallCenters(callCenterIds: number[], tag: string): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      let taggedCount = 0;

      for (const id of callCenterIds) {
        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, id.toString());
        const updateData = {
          tags: [tag], // Simplified - just set tags array with the new tag
          lastUpdated: Timestamp.now(),
        };
        batch.update(docRef, updateData);
        taggedCount++;
      }

      await batch.commit();
      return { success: true, tagged: taggedCount };
    } catch (error) {
      console.error('Error batch tagging call centers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete all call centers
  static async deleteAllCallCenters(): Promise<ApiResponse<void>> {
    try {
      const q = query(collection(db, COLLECTION_NAMES.CALL_CENTERS));
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs;
      let deletedCount = 0;
      const batchSize = 400; // Firebase limit is 500, using 400 for safety

      // Process deletions in batches
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docs.slice(i, i + batchSize);

        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += batchDocs.length;
      }

      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('Error deleting all call centers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }


  // Phone Rotation Data
  static async getPhoneRotationData(): Promise<PhoneRotationData | null> {
    try {
      const q = query(collection(db, COLLECTION_NAMES.PHONE_ROTATION), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          ...doc.data(),
          date: doc.data().date,
        } as PhoneRotationData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching phone rotation data:', error);
      throw error;
    }
  }

  // Clear old invalid cache entries
  static async clearInvalidCacheEntries(): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTION_NAMES.PHONE_ROTATION),
        where('type', '==', 'daily_selection')
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const centerIds = data.centerIds || [];

        // Check if cache has invalid data (NaN values, mixed types, or duplicates)
        const hasInvalidData = centerIds.some(id =>
          id === null ||
          id === undefined ||
          (typeof id === 'number' && isNaN(id)) ||
          (typeof id === 'string' && (id === 'NaN' || !/^\d+$/.test(id)))
        );

        // Also check for duplicates in the cache
        const uniqueIds = new Set(centerIds.filter(id => id !== null && id !== undefined));
        const hasDuplicates = uniqueIds.size !== centerIds.length;

        if (hasInvalidData || hasDuplicates) {
          console.log(`🗑️ [CACHE-CLEANUP] Removing invalid cache entry: ${doc.id}`);
          batch.delete(doc.ref);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        await batch.commit();
        console.log(`🗑️ [CACHE-CLEANUP] Cleaned up ${deletedCount} invalid cache entries`);
      }
    } catch (error) {
      console.error('❌ [CACHE-CLEANUP] Error clearing invalid cache:', error);
    }
  }



  static async updatePhoneRotationData(data: PhoneRotationData): Promise<void> {
    try {
      // Delete existing data
      const q = query(collection(db, COLLECTION_NAMES.PHONE_ROTATION));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add new data
      await batch.commit();
      await addDoc(collection(db, COLLECTION_NAMES.PHONE_ROTATION), data);
    } catch (error) {
      console.error('Error updating phone rotation data:', error);
      throw error;
    }
  }

  // Suggestions
  static async getSuggestions(): Promise<Suggestion[]> {
    try {
      const q = query(collection(db, COLLECTION_NAMES.SUGGESTIONS), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      })) as Suggestion[];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      throw error;
    }
  }

  static async createSuggestion(suggestion: Omit<Suggestion, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAMES.SUGGESTIONS), {
        ...suggestion,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating suggestion:', error);
      throw error;
    }
  }

  static async deleteSuggestion(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAMES.SUGGESTIONS, id));
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      throw error;
    }
  }

  // Import data from external CRM
  static async importExternalCRMData(data: ExternalCRMData): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      let importedCount = 0;

      // Import call centers
      for (const callCenter of data.callCenters) {
        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, callCenter.id.toString());
        batch.set(docRef, {
          ...callCenter,
          createdAt: callCenter.createdAt ? Timestamp.fromDate(new Date(callCenter.createdAt)) : Timestamp.now(),
          lastContacted: callCenter.lastContacted ? Timestamp.fromDate(new Date(callCenter.lastContacted)) : null,
        });
        importedCount++;
      }


      // Import phone rotation data
      if (data.phoneRotationData) {
        const docRef = doc(db, COLLECTION_NAMES.PHONE_ROTATION, 'current');
        batch.set(docRef, data.phoneRotationData);
      }

      await batch.commit();
      return { success: true, imported: importedCount };
    } catch (error) {
      console.error('Error importing external CRM data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Migration function to update phone detection for existing call centers
  static async migratePhoneDetection(): Promise<{ migrated: number; errors: number }> {
    try {
      console.log('🔄 [MIGRATION] Starting phone detection migration for existing call centers...');

      // Get all call centers without limit for migration
      const q = query(collection(db, COLLECTION_NAMES.CALL_CENTERS));
      const querySnapshot = await getDocs(q);
      const callCenters = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
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
      });

      console.log(`📊 [MIGRATION] Found ${callCenters.length} call centers to process`);

      let migrated = 0;
      let errors = 0;

      // Process sequentially (one by one) for maximum stability
      for (let i = 0; i < callCenters.length; i++) {
        const callCenter = callCenters[i];

        // Only process call centers that have phones
        if (!callCenter.phones || callCenter.phones.length === 0) {
          console.log(`⏭️ [MIGRATION] Skipping call center ${i + 1}/${callCenters.length}: "${callCenter.name}" (no phones)`);
          continue;
        }

        console.log(`🔄 [MIGRATION] Processing call center ${i + 1}/${callCenters.length}: "${callCenter.name}" (${callCenter.phones.length} phones)`);

        try {
          let needsUpdate = false;
          let phoneInfos: PhoneInfo[] = [];

          // Check if phone detection needs to be run
          if (!callCenter.phone_infos || callCenter.phone_infos.length !== callCenter.phones.length) {
            needsUpdate = true;
            phoneInfos = callCenter.phones.map(phone => PhoneDetectionService.detectPhone(phone, callCenter.country));
          } else {
            // Check if any phone_info is missing or has low confidence
            for (let j = 0; j < callCenter.phones.length; j++) {
              const phone = callCenter.phones[j];
              const phoneInfo = callCenter.phone_infos[j];

              if (!phoneInfo || !phoneInfo.is_mobile || phoneInfo.whatsapp_confidence < 0.7) {
                needsUpdate = true;
                phoneInfos = callCenter.phones.map(p => PhoneDetectionService.detectPhone(p, callCenter.country));
                console.log(`📱 [MIGRATION] Call center "${callCenter.name}" needs update: low confidence or not mobile`);
                break;
              }
            }
          }

          if (needsUpdate) {
            await this.updateCallCenter(Number(callCenter.id), { phone_infos: phoneInfos });
            migrated++;
            console.log(`📱 [MIGRATION] Updated phone detection for call center: "${callCenter.name}" (${callCenter.id})`);
          } else {
            console.log(`⏭️ [MIGRATION] Skipping call center ${i + 1}/${callCenters.length}: "${callCenter.name}" (already up to date)`);
          }
        } catch (centerError) {
          console.error(`❌ [MIGRATION] Error updating call center ${callCenter.id}:`, centerError);
          errors++;
        }

        // Small delay between updates to avoid rate limiting
        if (i < callCenters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay for speed
        }
      }

      console.log(`✅ [MIGRATION] Phone detection migration completed. Migrated: ${migrated}, Errors: ${errors}`);
      return { migrated, errors };
    } catch (error) {
      console.error('❌ [MIGRATION] Phone detection migration failed:', error);
      throw error;
    }
  }

  // Migration function to create calendar events for existing steps
  static async migrateExistingStepsToCalendar(): Promise<{ migrated: number; errors: number }> {
    try {
      console.log('🔄 [MIGRATION] Starting migration of existing steps to calendar...');

      const callCenters = await this.getCallCenters();
      let migrated = 0;
      let errors = 0;

      for (const callCenter of callCenters) {
        try {
          const steps = await ExternalCRMSubcollectionsService.getSteps(callCenter.id.toString());

          for (const step of steps) {
            try {
              // Check if calendar event already exists for this step
              const existingEventsQuery = query(
                collection(db, COLLECTION_NAMES.CALENDAR_EVENTS),
                where('relatedType', '==', 'step'),
                where('relatedId', '==', step.id),
                where('callCenterId', '==', callCenter.id.toString())
              );
              const existingEvents = await getDocs(existingEventsQuery);

              if (existingEvents.empty) {
                // Create calendar event for the step
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
                  callCenterId: callCenter.id.toString(),
                  callCenterName: callCenter.name || 'Unknown Call Center',
                  relatedType: 'step',
                  relatedId: step.id
                };

                await addDoc(collection(db, COLLECTION_NAMES.CALENDAR_EVENTS), {
                  ...eventData,
                  createdAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });

                migrated++;
                console.log(`📅 [MIGRATION] Created calendar event for step: "${step.title || 'Step'}" in ${callCenter.name}`);
              } else {
                // Update existing event if priority/color changed
                const existingEvent = existingEvents.docs[0];
                const existingData = existingEvent.data();
                const currentPriorityColor = step.priority === 'high' ? '#ef4444' :
                                            step.priority === 'medium' ? '#FFC107' : '#4CAF50';

                if (existingData.color !== currentPriorityColor ||
                    existingData.title !== (step.title || 'Step') ||
                    existingData.description !== (step.description || '')) {
                  await updateDoc(existingEvent.ref, {
                    color: currentPriorityColor,
                    title: step.title || 'Step',
                    description: step.description || '',
                    updatedAt: Timestamp.now(),
                  });
                  console.log(`📅 [MIGRATION] Updated calendar event for step: "${step.title || 'Step'}" in ${callCenter.name}`);
                }
              }
            } catch (stepError) {
              console.error(`❌ [MIGRATION] Error migrating step ${step.id}:`, stepError);
              errors++;
            }
          }
        } catch (centerError) {
          console.error(`❌ [MIGRATION] Error processing call center ${callCenter.id}:`, centerError);
          errors++;
        }
      }

      console.log(`✅ [MIGRATION] Migration completed. Migrated: ${migrated}, Errors: ${errors}`);
      return { migrated, errors };
    } catch (error) {
      console.error('❌ [MIGRATION] Migration failed:', error);
      throw error;
    }
  }
}

// Subcollection operations for contacts, steps, call history, and recharges
export class ExternalCRMSubcollectionsService {
  static async getContacts(callCenterId: string): Promise<Contact[]> {
    try {
      const q = query(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/contacts`));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        phone_info: doc.data().phone_info || undefined,
      })) as Contact[];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }
  static async addContact(callCenterId: string, contact: Omit<Contact, 'id'>): Promise<string> {
    try {
      // Get call center country for detection
      const callCenter = await ExternalCRMService.getCallCenter(callCenterId);
      const country = callCenter?.country;

      // Run phone detection if phone is provided
      let phoneInfo;
      if (contact.phone) {
        phoneInfo = PhoneDetectionService.detectPhone(contact.phone, country);
      }

      const contactWithInfo = { ...contact, phone_info: phoneInfo };
      const docRef = await addDoc(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/contacts`), contactWithInfo);
      return docRef.id;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  static async updateContact(callCenterId: string, contactId: string, updates: Partial<Contact>): Promise<void> {
    try {
      // Get call center country for detection
      const callCenter = await ExternalCRMService.getCallCenter(callCenterId);
      const country = callCenter?.country;

      // Run phone detection if phone is updated
      let phoneInfo;
      if (updates.phone) {
        phoneInfo = PhoneDetectionService.detectPhone(updates.phone, country);
        updates.phone_info = phoneInfo;
      }

      const docRef = doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/contacts/${contactId}`);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  static async deleteContact(callCenterId: string, contactId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/contacts/${contactId}`));
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  static async getSteps(callCenterId: string): Promise<Step[]> {
    try {
      const q = query(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/steps`), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      })) as Step[];
    } catch (error) {
      console.error('Error fetching steps:', error);
      throw error;
    }
  }

  static async addStep(callCenterId: string, step: Omit<Step, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/steps`), {
        ...step,
        date: Timestamp.fromDate(new Date(step.date)),
      });

      // Create calendar event for the step
      if (step.date) {
        try {
          const callCenter = await ExternalCRMService.getCallCenter(callCenterId);
          const priorityColor = step.priority === 'high' ? '#ef4444' :
                                step.priority === 'medium' ? '#FFC107' : '#4CAF50';

          // Check if calendar event already exists for this step
          const existingEventsQuery = query(
            collection(db, COLLECTION_NAMES.CALENDAR_EVENTS),
            where('relatedType', '==', 'step'),
            where('relatedId', '==', docRef.id),
            where('callCenterId', '==', callCenterId)
          );
          const existingEvents = await getDocs(existingEventsQuery);

          if (existingEvents.empty) {
            const eventData = {
              title: step.title || 'Step',
              description: step.description || '',
              date: step.date,
              time: '',
              location: '',
              type: 'task' as const,
              color: priorityColor,
              callCenterId: callCenterId,
              callCenterName: callCenter?.name || 'Unknown Call Center',
              relatedType: 'step',
              relatedId: docRef.id
            };

            await addDoc(collection(db, COLLECTION_NAMES.CALENDAR_EVENTS), {
              ...eventData,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
            console.log(`📅 [CALENDAR] Created calendar event for step: "${step.title || 'Step'}"`);
          } else {
            console.log(`📅 [CALENDAR] Calendar event already exists for step: "${step.title || 'Step'}"`);
          }
        } catch (calendarError) {
          console.error('Error creating calendar event for step:', calendarError);
          // Don't fail the step creation if calendar event fails
        }
      }

      return docRef.id;
    } catch (error) {
      console.error('Error adding step:', error);
      throw error;
    }
  }

  static async updateStep(callCenterId: string, stepId: string, updates: Partial<Step>): Promise<void> {
    try {
      const docRef = doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/steps/${stepId}`);
      const updateData: Record<string, any> = { ...updates };

      if (updates.date) {
        updateData.date = Timestamp.fromDate(new Date(updates.date));
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating step:', error);
      throw error;
    }
  }

  static async deleteStep(callCenterId: string, stepId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/steps/${stepId}`));
    } catch (error) {
      console.error('Error deleting step:', error);
      throw error;
    }
  }

  static async getCallHistory(callCenterId: string): Promise<CallLog[]> {
    try {
      const q = query(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/callHistory`), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      })) as CallLog[];
    } catch (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }
  }

  static async addCallLog(callCenterId: string, callLog: Omit<CallLog, 'id'>): Promise<string> {
    try {
      console.log(`📞 [CALL-LOG] Attempting to save call log for center ${callCenterId}:`, {
        date: callLog.date,
        outcome: callLog.outcome,
        duration: callLog.duration,
        notes: callLog.notes,
        followUp: callLog.followUp
      });

      const collectionPath = `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/callHistory`;
      console.log(`📞 [CALL-LOG] Collection path: ${collectionPath}`);

      const docData = {
        ...callLog,
        date: Timestamp.fromDate(new Date(callLog.date)),
      };

      console.log(`📞 [CALL-LOG] Document data:`, docData);

      const docRef = await addDoc(collection(db, collectionPath), docData);
      console.log(`✅ [CALL-LOG] Successfully saved call log with ID: ${docRef.id}`);

      // Create calendar event for follow-up calls
      if (callLog.followUp && typeof callLog.followUp === 'object' && 'date' in callLog.followUp) {
        try {
          const callCenter = await ExternalCRMService.getCallCenter(callCenterId);
          const followUp = callLog.followUp as { date: string; time?: string; notes?: string };
          const eventData = {
            title: `Follow-up: ${callCenter?.name || 'Call Center'}`,
            description: followUp.notes || callLog.notes || `Follow-up call scheduled`,
            date: followUp.date,
            time: followUp.time || '',
            location: '',
            type: 'call' as const,
            callCenterId: callCenterId,
            callCenterName: callCenter?.name || 'Unknown Call Center',
            relatedType: 'callLog',
            relatedId: docRef.id
          };

          await addDoc(collection(db, COLLECTION_NAMES.CALENDAR_EVENTS), {
            ...eventData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          console.log(`📅 [CALENDAR] Created follow-up event for call log ${docRef.id}`);
        } catch (calendarError) {
          console.error('Error creating calendar event for call log:', calendarError);
          // Don't fail the call log creation if calendar event fails
        }
      }

      return docRef.id;
    } catch (error) {
      console.error('❌ [CALL-LOG] Error adding call log:', error);
      console.error('❌ [CALL-LOG] Error details:', {
        callCenterId,
        callLog,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  static async updateCallLog(callCenterId: string, callLogId: string, updates: Partial<CallLog>): Promise<void> {
    try {
      const docRef = doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/callHistory/${callLogId}`);
      const updateData: Record<string, any> = { ...updates };

      if (updates.date) {
        updateData.date = Timestamp.fromDate(new Date(updates.date));
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating call log:', error);
      throw error;
    }
  }

  static async deleteCallLog(callCenterId: string, callLogId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/callHistory/${callLogId}`));
    } catch (error) {
      console.error('Error deleting call log:', error);
      throw error;
    }
  }

  static async getRecharges(callCenterId: string): Promise<Recharge[]> {
    try {
      const q = query(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/recharges`), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
      })) as Recharge[];
    } catch (error) {
      console.error('Error fetching recharges:', error);
      throw error;
    }
  }

  static async addRecharge(callCenterId: string, recharge: Omit<Recharge, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/recharges`), {
        ...recharge,
        date: Timestamp.fromDate(new Date(recharge.date)),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding recharge:', error);
      throw error;
    }
  }

  static async updateRecharge(callCenterId: string, rechargeId: string, updates: Partial<Recharge>): Promise<void> {
    try {
      const docRef = doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/recharges/${rechargeId}`);
      const updateData: Record<string, any> = { ...updates };

      if (updates.date) {
        updateData.date = Timestamp.fromDate(new Date(updates.date));
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating recharge:', error);
      throw error;
    }
  }

  static async deleteRecharge(callCenterId: string, rechargeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/recharges/${rechargeId}`));
    } catch (error) {
      console.error('Error deleting recharge:', error);
      throw error;
    }
  }
}

// Cross-section Steps Management Service
export class CrossSectionStepsService {
  // Get all steps across all call centers for global views
  static async getAllSteps(filters?: {
    dateRange?: { start: string; end: string };
    callCenterIds?: string[];
    completed?: boolean;
    types?: string[];
  }): Promise<{ steps: Step[]; callCenterMap: { [callCenterId: string]: CallCenter } }> {
    try {
      const callCenters = await ExternalCRMService.getCallCenters();
      const callCenterMap: { [callCenterId: string]: CallCenter } = {};

      callCenters.forEach(cc => {
        callCenterMap[cc.id.toString()] = cc;
      });

      const allSteps: Step[] = [];
      const eligibleCallCenterIds = filters?.callCenterIds || callCenters.map(cc => cc.id.toString());

      // Load steps for each call center
      for (const callCenterId of eligibleCallCenterIds) {
        try {
          const steps = await ExternalCRMSubcollectionsService.getSteps(callCenterId);
          const stepsWithCallCenterId = steps.map(step => ({
            ...step,
            callCenterId
          }));

          // Apply filters
          let filteredSteps = stepsWithCallCenterId;

          if (filters?.dateRange) {
            filteredSteps = filteredSteps.filter(step =>
              step.date >= filters.dateRange!.start && step.date <= filters.dateRange!.end
            );
          }

          if (filters?.completed !== undefined) {
            filteredSteps = filteredSteps.filter(step => step.completed === filters.completed);
          }

          if (filters?.types && filters.types.length > 0) {
            filteredSteps = filteredSteps.filter(step =>
              filters.types!.some(type => step.title.toLowerCase().includes(type.toLowerCase()) ||
                                          step.description.toLowerCase().includes(type.toLowerCase()))
            );
          }

          allSteps.push(...filteredSteps);
        } catch (error) {
          console.error(`Error loading steps for call center ${callCenterId}:`, error);
        }
      }

      return { steps: allSteps, callCenterMap };
    } catch (error) {
      console.error('Error getting all steps:', error);
      throw error;
    }
  }

  // Create a step for a specific call center (used by daily calls and other sections)
  static async createStepForCallCenter(callCenterId: string, stepData: Omit<Step, 'id'>): Promise<string> {
    try {
      return await ExternalCRMSubcollectionsService.addStep(callCenterId, stepData);
    } catch (error) {
      console.error('Error creating step for call center:', error);
      throw error;
    }
  }

  // Create calendar event from step (used by dashboard)
  static async createCalendarEventFromStep(step: Step & { callCenterId?: string; callCenterName?: string }, callCenterName?: string): Promise<void> {
    try {
      // Check if calendar event already exists for this step
      const existingEventsQuery = query(
        collection(db, COLLECTION_NAMES.CALENDAR_EVENTS),
        where('relatedType', '==', 'step'),
        where('relatedId', '==', step.id),
        where('callCenterId', '==', step.callCenterId || '')
      );
      const existingEvents = await getDocs(existingEventsQuery);

      if (existingEvents.empty) {
        const callCenter = callCenterName || step.callCenterName || 'Unknown Call Center';
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
          callCenterId: step.callCenterId || '',
          callCenterName: callCenter,
          relatedType: 'step',
          relatedId: step.id
        };

        await addDoc(collection(db, COLLECTION_NAMES.CALENDAR_EVENTS), {
          ...eventData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log(`📅 [CALENDAR] Created calendar event for step: "${step.title || 'Step'}"`);
      } else {
        console.log(`📅 [CALENDAR] Calendar event already exists for step: "${step.title || 'Step'}"`);
      }
    } catch (error) {
      console.error('Error creating calendar event from step:', error);
      throw error;
    }
  }

  // Update a step across all sections
  static async updateStepForCallCenter(callCenterId: string, stepId: string, updates: Partial<Step>): Promise<void> {
    try {
      await ExternalCRMSubcollectionsService.updateStep(callCenterId, stepId, updates);
    } catch (error) {
      console.error('Error updating step for call center:', error);
      throw error;
    }
  }

  // Delete a step across all sections
  static async deleteStepForCallCenter(callCenterId: string, stepId: string): Promise<void> {
    try {
      await ExternalCRMSubcollectionsService.deleteStep(callCenterId, stepId);
    } catch (error) {
      console.error('Error deleting step for call center:', error);
      throw error;
    }
  }

}

// Cross-section Contacts Management Service
export class CrossSectionContactsService {
  // Get all contacts across all call centers for global views
  static async getAllContacts(filters?: {
    callCenterIds?: string[];
    searchTerm?: string;
    departments?: string[];
  }): Promise<{ contacts: Contact[]; callCenterMap: { [callCenterId: string]: CallCenter } }> {
    try {
      const callCenters = await ExternalCRMService.getCallCenters();
      const callCenterMap: { [callCenterId: string]: CallCenter } = {};

      callCenters.forEach(cc => {
        callCenterMap[cc.id.toString()] = cc;
      });

      const allContacts: Contact[] = [];
      const eligibleCallCenterIds = filters?.callCenterIds || callCenters.map(cc => cc.id.toString());

      // Load contacts for each call center
      for (const callCenterId of eligibleCallCenterIds) {
        try {
          const contacts = await ExternalCRMSubcollectionsService.getContacts(callCenterId);
          const contactsWithCallCenterId = contacts.map(contact => ({
            ...contact,
            callCenterId
          }));

          // Apply filters
          let filteredContacts = contactsWithCallCenterId;

          if (filters?.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            filteredContacts = filteredContacts.filter(contact =>
              contact.name.toLowerCase().includes(searchLower) ||
              contact.email.toLowerCase().includes(searchLower) ||
              contact.position.toLowerCase().includes(searchLower)
            );
          }

          if (filters?.departments && filters.departments.length > 0) {
            filteredContacts = filteredContacts.filter(contact =>
              contact.position && filters.departments!.some(dept =>
                contact.position!.toLowerCase().includes(dept.toLowerCase())
              )
            );
          }

          allContacts.push(...filteredContacts);
        } catch (error) {
          console.error(`Error loading contacts for call center ${callCenterId}:`, error);
        }
      }

      return { contacts: allContacts, callCenterMap };
    } catch (error) {
      console.error('Error getting all contacts:', error);
      throw error;
    }
  }

  // Create a contact for a specific call center
  static async createContactForCallCenter(callCenterId: string, contactData: Omit<Contact, 'id'>): Promise<string> {
    try {
      return await ExternalCRMSubcollectionsService.addContact(callCenterId, contactData);
    } catch (error) {
      console.error('Error creating contact for call center:', error);
      throw error;
    }
  }

  // Update a contact across all sections
  static async updateContactForCallCenter(callCenterId: string, contactId: string, updates: Partial<Contact>): Promise<void> {
    try {
      await ExternalCRMSubcollectionsService.updateContact(callCenterId, contactId, updates);
    } catch (error) {
      console.error('Error updating contact for call center:', error);
      throw error;
    }
  }

  // Delete a contact across all sections
  static async deleteContactForCallCenter(callCenterId: string, contactId: string): Promise<void> {
    try {
      await ExternalCRMSubcollectionsService.deleteContact(callCenterId, contactId);
    } catch (error) {
      console.error('Error deleting contact for call center:', error);
      throw error;
    }
  }
}