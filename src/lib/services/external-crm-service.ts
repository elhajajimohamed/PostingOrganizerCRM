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


      // For pagination, we need to fetch all documents and slice them client-side
      // since Firestore doesn't support efficient offset-based pagination
      const allConstraints: QueryConstraint[] = [];

      // Use simple ordering to avoid composite index requirements
      allConstraints.push(orderBy('createdAt', 'desc'));

      // Apply basic filters only - avoid complex queries that need indexes
      if (filters?.status && ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'].includes(filters.status)) {
        allConstraints.push(where('status', '==', filters.status));
      }

      console.log('🔍 ExternalCRMService - Building query with constraints:', allConstraints.length);

      const q = query(collection(db, COLLECTION_NAMES.CALL_CENTERS), ...allConstraints);
      console.log('🔍 ExternalCRMService - Executing query...');

      const querySnapshot = await getDocs(q);
      console.log('✅ ExternalCRMService - Query executed, docs count:', querySnapshot.docs.length);

      let callCenters: CallCenter[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`🔍 [GET-CENTERS] Processing call center ${doc.id}:`, {
          name: data.name,
          businessType: data.businessType
        });
        
        return {
          id: doc.id,
          name: data.name || '',
          country: data.country || '',
          city: data.city || '',
          positions: data.positions || 0,
          status: data.status || 'New',
          businessType: data.businessType || undefined,
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
          summary: data.summary || '',
          // New destinations field for calling destinations (multiple selection)
          destinations: data.destinations || [],
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

      // Apply pagination after filtering
      if (offset !== undefined && limitParam !== undefined) {
        console.log('🔍 ExternalCRMService - Applying pagination: offset', offset, 'limit', limitParam);
        callCenters = callCenters.slice(offset, offset + limitParam);
        console.log('✅ ExternalCRMService - After pagination:', callCenters.length, 'call centers');
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

        console.log(`🔍 [GET-CENTER] Fetching individual call center ${docId}:`, {
          name: data.name,
          rawDestinations: data.destinations,
          destinationsType: typeof data.destinations,
          destinationsIsArray: Array.isArray(data.destinations)
        });

        // Load subcollections (contacts, steps, etc.)
        const [contacts, steps, callHistory, recharges] = await Promise.all([
          ExternalCRMSubcollectionsService.getContacts(docId),
          ExternalCRMSubcollectionsService.getSteps(docId),
          ExternalCRMSubcollectionsService.getCallHistory(docId),
          ExternalCRMSubcollectionsService.getRecharges(docId),
        ]);

        const callCenter = {
          id: docSnap.id,
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
          notes: data.notes || '',
          summary: data.summary || '',
          // New destinations field for calling destinations (multiple selection)
          destinations: data.destinations || [],
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
          contacts,
          steps,
          callHistory,
          recharges,
        } as CallCenter;

        console.log(`✅ [GET-CENTER] Returning call center ${docId} with destinations:`, {
          destinations: callCenter.destinations,
          destinationsType: typeof callCenter.destinations,
          destinationsIsArray: Array.isArray(callCenter.destinations)
        });

        return callCenter;
      }
      console.log(`❌ [GET-CENTER] Call center ${docId} not found`);
      return null;
    } catch (error) {
      console.error('❌ [GET-CENTER] Error fetching call center:', error);
      throw error;
    }
  }

  static async createCallCenter(callCenter: Omit<CallCenter, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('🔍 [CREATE] Creating call center with data:', callCenter);

      // Run phone detection on phones
      let phoneInfos: PhoneInfo[] = [];
      if (callCenter.phones && callCenter.phones.length > 0) {
        phoneInfos = callCenter.phones.map(phone => PhoneDetectionService.detectPhone(phone, callCenter.country));
      }

      // Ensure all required fields are present and correctly typed
      const callCenterData = {
        name: callCenter.name || '',
        country: callCenter.country || 'Morocco',
        city: callCenter.city || '',
        positions: callCenter.positions || 0,
        status: callCenter.status || 'New',
        value: callCenter.value || 0,
        currency: callCenter.currency || 'USD',
        phones: Array.isArray(callCenter.phones) ? callCenter.phones : [],
        phone_infos: phoneInfos,
        emails: Array.isArray(callCenter.emails) ? callCenter.emails : [],
        website: callCenter.website || '',
        address: callCenter.address || '',
        source: callCenter.source || '',
        type: callCenter.type || '',
        businessType: callCenter.businessType || undefined,
        tags: Array.isArray(callCenter.tags) ? callCenter.tags : [],
        markets: Array.isArray(callCenter.markets) ? callCenter.markets : [],
        competitors: Array.isArray(callCenter.competitors) ? callCenter.competitors : [],
        socialMedia: Array.isArray(callCenter.socialMedia) ? callCenter.socialMedia : [],
        foundDate: callCenter.foundDate || '',
        notes: callCenter.notes || '',
        // New destinations field for calling destinations (multiple selection)
        destinations: Array.isArray(callCenter.destinations) ? callCenter.destinations : [],
        updatedAt: new Date().toISOString(),
      };

      console.log('📝 [CREATE] Final call center data to save:', callCenterData);

      // Development mode: Try without authentication first
      const docRef = await addDoc(collection(db, COLLECTION_NAMES.CALL_CENTERS), {
        ...callCenterData,
        createdAt: Timestamp.now(),
        lastContacted: callCenter.lastContacted ? Timestamp.fromDate(new Date(callCenter.lastContacted)) : null,
      });

      console.log('✅ [CREATE] Call center created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ [CREATE] Error creating call center:', error);
      // If permission denied, suggest logging in or updating Firestore rules
      if (error instanceof Error && error.message.includes('permission-denied')) {
        console.error('Permission denied. Please ensure you are logged in or update Firestore rules to allow unauthenticated access for development.');
      }
      throw error;
    }
  }

  static async updateCallCenter(id: number | string, updates: Partial<CallCenter>, skipSync: boolean = false): Promise<void> {
    try {
      // Handle both numeric IDs and Firebase document IDs
      const docId = typeof id === 'string' ? id : id.toString();

      console.log('🔍 [UPDATE] Starting updateCallCenter for ID:', docId);
      console.log('🔍 [UPDATE] Updates received:', updates);
      console.log('🔍 [UPDATE] Destinations in updates:', updates.destinations);
      console.log('🔍 [UPDATE] Destinations type:', typeof updates.destinations);
      console.log('🔍 [UPDATE] Destinations isArray:', Array.isArray(updates.destinations));

      // Get current call center to compare phone changes
      const currentCallCenter = await this.getCallCenter(id);
      console.log('🔍 [UPDATE] Current call center destinations:', currentCallCenter?.destinations);

      // Run phone detection if phones are updated
      if (updates.phones) {
        const country = currentCallCenter?.country;
        const phoneInfos = updates.phones.map(phone => PhoneDetectionService.detectPhone(phone, country));
        updates.phone_infos = phoneInfos;
      }

      // Check if new mobile phones were added and remove "No WhatsApp" exclusion
      if (updates.phones && currentCallCenter?.no_whatsapp_phones?.length) {
        const currentPhones = currentCallCenter.phones || [];
        const newPhones = updates.phones || [];
        const oldMobilePhones = new Set();
        const currentMobilePhones = new Set();

        // Find current mobile phones
        if (currentCallCenter.phone_infos) {
          currentCallCenter.phone_infos.forEach((phoneInfo, index) => {
            if (phoneInfo.is_mobile && phoneInfo.whatsapp_confidence >= 0.7) {
              oldMobilePhones.add(currentPhones[index]);
            }
          });
        }

        // Find new mobile phones
        const newPhoneInfos = updates.phone_infos || [];
        newPhoneInfos.forEach((phoneInfo, index) => {
          if (phoneInfo.is_mobile && phoneInfo.whatsapp_confidence >= 0.7) {
            currentMobilePhones.add(newPhones[index]);
          }
        });

        // Check if there are new mobile phones that weren't previously detected
        const newMobilePhones = [...currentMobilePhones].filter(phone =>
          !oldMobilePhones.has(phone) && !currentCallCenter.no_whatsapp_phones?.includes(phone as string)
        );

        if (newMobilePhones.length > 0) {
          console.log(`📱 [UPDATE] New mobile phones detected: ${newMobilePhones.join(', ')}. Removing "No WhatsApp" exclusion.`);

          // Remove phones from no_whatsapp_phones that are now mobile
          const updatedNoWhatsappPhones = (currentCallCenter.no_whatsapp_phones || []).filter(
            phone => !newMobilePhones.includes(phone)
          );

          // Clear the exclusion if no phones remain
          if (updatedNoWhatsappPhones.length === 0) {
            updates.no_whatsapp_phones = [];
            updates.whatsapp_excluded_until = undefined;
            console.log(`📱 [UPDATE] All "No WhatsApp" phones removed. Call center now eligible for WhatsApp.`);
          } else {
            updates.no_whatsapp_phones = updatedNoWhatsappPhones;
          }
        }
      }

      const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, docId);
      const updateData: Record<string, any> = { ...updates };

      console.log('🔍 [UPDATE] Update data before processing:', updateData);
      console.log('🔍 [UPDATE] Destinations in updateData:', updateData.destinations);
      console.log('🔍 [UPDATE] Update data JSON.stringify:', JSON.stringify(updateData, null, 2));

      if (updates.lastContacted) {
        updateData.lastContacted = Timestamp.fromDate(new Date(updates.lastContacted));
      }

      console.log('🔍 [UPDATE] Final updateData being saved:', updateData);
      console.log('🔍 [UPDATE] Destinations in final updateData:', updateData.destinations);
      console.log('🔍 [UPDATE] About to call updateDoc with ref:', docRef.path);

      await updateDoc(docRef, updateData);

      console.log('✅ [UPDATE] Successfully updated call center in Firestore');

      // Verify the update by reading back the document
      try {
        const updatedDoc = await getDoc(docRef);
        if (updatedDoc.exists()) {
          const data = updatedDoc.data();
          console.log('✅ [UPDATE] Verification - Document data after save:', {
            destinations: data.destinations,
            destinationsType: typeof data.destinations,
            destinationsIsArray: Array.isArray(data.destinations)
          });
        } else {
          console.log('❌ [UPDATE] Verification failed - Document not found after save');
        }
      } catch (verifyError) {
        console.error('❌ [UPDATE] Verification error:', verifyError);
      }

      // Sync back to prospects (only if not skipping sync)
      if (currentCallCenter && !skipSync) {
        try {
          await ExternalCRMSubcollectionsService.syncUpdatesToProspects(currentCallCenter, updates);
        } catch (syncError) {
          console.error('❌ Error syncing call center updates to prospects:', syncError);
          // Don't fail the call center update if sync fails
        }
      }
    } catch (error) {
      console.error('❌ [UPDATE] Error updating call center:', error);
      console.error('❌ [UPDATE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  static async deleteCallCenter(id: string | number): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAMES.CALL_CENTERS, id.toString()));
    } catch (error) {
      console.error('Error deleting call center:', error);
      throw error;
    }
  }

  // Batch operations for call centers
  static async batchDeleteCallCenters(callCenterIds: (number | string)[]): Promise<ApiResponse<void>> {
    try {
      console.log('🔍 [BATCH-DELETE] Starting batch delete with IDs:', callCenterIds);

      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const id of callCenterIds) {
        // Handle null/undefined IDs
        if (id === null || id === undefined) {
          console.log('⚠️ [BATCH-DELETE] Skipping null/undefined ID');
          continue;
        }

        // Handle both string IDs (Firebase document IDs) and numeric IDs
        const docId = typeof id === 'string' ? id : id.toString();
        console.log(`🗑️ [BATCH-DELETE] Deleting document with ID: ${docId}`);

        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, docId);
        batch.delete(docRef);
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`🔄 [BATCH-DELETE] Committing batch delete of ${deletedCount} documents`);
        await batch.commit();
        console.log('✅ [BATCH-DELETE] Batch delete completed successfully');
      } else {
        console.log('⚠️ [BATCH-DELETE] No valid IDs to delete');
      }

      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('❌ [BATCH-DELETE] Error batch deleting call centers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async batchUpdateCallCenters(updates: { id: number | string; changes: Partial<CallCenter> }[]): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      let updatedCount = 0;

      for (const update of updates) {
        // Handle both string IDs (Firebase document IDs) and numeric IDs
        const docId = typeof update.id === 'string' ? update.id : update.id.toString();
        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, docId);
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

  static async batchTagCallCenters(callCenterIds: (number | string)[], tag: string): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);
      let taggedCount = 0;

      for (const id of callCenterIds) {
        // Handle both string IDs (Firebase document IDs) and numeric IDs
        const docId = typeof id === 'string' ? id : id.toString();
        const docRef = doc(db, COLLECTION_NAMES.CALL_CENTERS, docId);
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

  // Merge duplicate call centers - transfer steps and other data before deleting
  static async mergeCallCenters(primaryId: string, duplicateIds: string[]): Promise<ApiResponse<void>> {
    try {
      console.log(`🔄 [MERGE] Starting merge operation: primary=${primaryId}, duplicates=${duplicateIds.join(',')}`);

      // Validate primary call center exists
      const primaryCallCenter = await this.getCallCenter(primaryId);
      if (!primaryCallCenter) {
        return { success: false, error: `Primary call center ${primaryId} not found` };
      }

      const batch = writeBatch(db);
      let transferredSteps = 0;
      let transferredCallLogs = 0;
      let transferredContacts = 0;
      let transferredRecharges = 0;

      for (const duplicateId of duplicateIds) {
        console.log(`🔄 [MERGE] Processing duplicate: ${duplicateId}`);

        // Transfer steps from duplicate to primary
        try {
          const duplicateSteps = await ExternalCRMSubcollectionsService.getSteps(duplicateId);
          console.log(`📋 [MERGE] Found ${duplicateSteps.length} steps in duplicate ${duplicateId}`);

          for (const step of duplicateSteps) {
            // Create the step in the primary call center
            await ExternalCRMSubcollectionsService.addStep(primaryId, {
              title: step.title,
              description: step.description,
              date: step.date,
              priority: step.priority,
              completed: step.completed,
              notes: step.notes
            });
            transferredSteps++;
          }
        } catch (error) {
          console.error(`❌ [MERGE] Error transferring steps from ${duplicateId}:`, error);
        }

        // Transfer call logs from duplicate to primary
        try {
          const duplicateCallLogs = await ExternalCRMSubcollectionsService.getCallHistory(duplicateId);
          console.log(`📞 [MERGE] Found ${duplicateCallLogs.length} call logs in duplicate ${duplicateId}`);

          for (const callLog of duplicateCallLogs) {
            await ExternalCRMSubcollectionsService.addCallLog(primaryId, {
              date: callLog.date,
              outcome: callLog.outcome,
              duration: callLog.duration,
              notes: callLog.notes,
              followUp: callLog.followUp
            });
            transferredCallLogs++;
          }
        } catch (error) {
          console.error(`❌ [MERGE] Error transferring call logs from ${duplicateId}:`, error);
        }

        // Transfer contacts from duplicate to primary
        try {
          const duplicateContacts = await ExternalCRMSubcollectionsService.getContacts(duplicateId);
          console.log(`👥 [MERGE] Found ${duplicateContacts.length} contacts in duplicate ${duplicateId}`);

          for (const contact of duplicateContacts) {
            await ExternalCRMSubcollectionsService.addContact(primaryId, {
              name: contact.name,
              position: contact.position,
              phone: contact.phone,
              email: contact.email,
              notes: contact.notes,
              lastContact: contact.lastContact || ''
            });
            transferredContacts++;
          }
        } catch (error) {
          console.error(`❌ [MERGE] Error transferring contacts from ${duplicateId}:`, error);
        }

        // Transfer recharges from duplicate to primary
        try {
          const duplicateRecharges = await ExternalCRMSubcollectionsService.getRecharges(duplicateId);
          console.log(`💰 [MERGE] Found ${duplicateRecharges.length} recharges in duplicate ${duplicateId}`);

          for (const recharge of duplicateRecharges) {
            await ExternalCRMSubcollectionsService.addRecharge(primaryId, {
              amount: recharge.amount,
              currency: recharge.currency,
              date: recharge.date,
              method: recharge.method,
              notes: recharge.notes
            });
            transferredRecharges++;
          }
        } catch (error) {
          console.error(`❌ [MERGE] Error transferring recharges from ${duplicateId}:`, error);
        }

        // Delete the duplicate call center
        console.log(`🗑️ [MERGE] Deleting duplicate call center: ${duplicateId}`);
        batch.delete(doc(db, COLLECTION_NAMES.CALL_CENTERS, duplicateId));
      }

      // Update primary call center's updatedAt timestamp
      batch.update(doc(db, COLLECTION_NAMES.CALL_CENTERS, primaryId), {
        updatedAt: new Date().toISOString(),
        notes: (primaryCallCenter.notes || '') + `\n\nMerged ${duplicateIds.length} duplicate(s): ${duplicateIds.join(', ')}`
      });

      await batch.commit();

      console.log(`✅ [MERGE] Merge completed successfully`);
      console.log(`📊 [MERGE] Transferred: ${transferredSteps} steps, ${transferredCallLogs} call logs, ${transferredContacts} contacts, ${transferredRecharges} recharges`);

      return { success: true, merged: duplicateIds.length };
    } catch (error) {
      console.error('❌ [MERGE] Error merging call centers:', error);
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
        const hasInvalidData = centerIds.some((id: any) =>
          id === null ||
          id === undefined ||
          (typeof id === 'number' && isNaN(id)) ||
          (typeof id === 'string' && (id === 'NaN' || !/^\d+$/.test(id)))
        );

        // Also check for duplicates in the cache
        const uniqueIds = new Set(centerIds.filter((id: any) => id !== null && id !== undefined));
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
          businessType: data.businessType || undefined,
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
  static async addContact(callCenterId: string, contact: Omit<Contact, 'id'>, skipSync: boolean = false): Promise<string> {
    try {
      console.log('👤 [ADD-CONTACT] Starting contact addition for call center:', callCenterId);
      console.log('👤 [ADD-CONTACT] Contact data:', {
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        position: contact.position,
        notes: contact.notes?.substring(0, 50) + (contact.notes?.length > 50 ? '...' : '')
      });

      // Get call center country for detection
      const callCenter = await ExternalCRMService.getCallCenter(callCenterId);
      const country = callCenter?.country;

      // Check for potential duplicates before adding
      const existingContacts = await this.getContacts(callCenterId);
      const duplicateKey = `${contact.name || ''}|${contact.phone || ''}|${contact.email || ''}`;
      const existingDuplicate = existingContacts.find(c =>
        `${c.name || ''}|${c.phone || ''}|${c.email || ''}` === duplicateKey
      );

      if (existingDuplicate) {
        console.warn('⚠️ [ADD-CONTACT] Potential duplicate contact detected:', {
          existingId: existingDuplicate.id,
          newContact: contact,
          callCenterId
        });
        // Return existing contact ID instead of creating duplicate
        return existingDuplicate.id;
      }

      // Run phone detection if phone is provided
      let phoneInfo;
      if (contact.phone) {
        phoneInfo = PhoneDetectionService.detectPhone(contact.phone, country);
      }

      const contactWithInfo = { ...contact, phone_info: phoneInfo };
      console.log('👤 [ADD-CONTACT] Adding contact to Firestore...');
      const docRef = await addDoc(collection(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/contacts`), contactWithInfo);
      console.log('✅ [ADD-CONTACT] Contact added successfully with ID:', docRef.id);

      // Sync contact to prospects (only if not skipping sync)
      if (callCenter && !skipSync) {
        try {
          await this.syncContactToProspects(callCenter, contactWithInfo);
          console.log('✅ [ADD-CONTACT] Contact synced to prospects');
        } catch (syncError) {
          console.error('❌ Error syncing contact to prospects:', syncError);
          // Don't fail the contact addition if sync fails
        }
      }

      return docRef.id;
    } catch (error) {
      console.error('❌ [ADD-CONTACT] Error adding contact:', error);
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

      // Check if this call center was created from a prospect and sync the call log back
      try {
        const callCenter = await ExternalCRMService.getCallCenter(callCenterId);
        if (callCenter && (callCenter as any).prospectId) {
          const prospectId = (callCenter as any).prospectId;
          console.log(`🔄 [SYNC] Call center ${callCenterId} has prospectId ${prospectId}, syncing call log back to prospect`);

          // Import the ProspectionService to avoid circular dependency
          const { ProspectionService } = await import('@/lib/services/prospection-service');

          // Add the call log to the prospect
          await ProspectionService.addCallLog(prospectId, {
            ...callLog,
            // Keep the original date format for prospects
            date: callLog.date
          });

          console.log(`✅ [SYNC] Successfully synced call log back to prospect ${prospectId}`);
        }
      } catch (syncError) {
        console.error('❌ [SYNC] Error syncing call log back to prospect:', syncError);
        // Don't fail the call log creation if sync fails
      }

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

  static async batchDeleteCallLogs(callCenterId: string, callLogIds: string[]): Promise<ApiResponse<void>> {
    try {
      console.log('🔍 [BATCH-DELETE-CALL-LOGS] Starting batch delete with IDs:', callLogIds);

      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const callLogId of callLogIds) {
        // Handle null/undefined IDs
        if (callLogId === null || callLogId === undefined) {
          console.log('⚠️ [BATCH-DELETE-CALL-LOGS] Skipping null/undefined ID');
          continue;
        }

        console.log(`🗑️ [BATCH-DELETE-CALL-LOGS] Deleting call log with ID: ${callLogId}`);

        const docRef = doc(db, `${COLLECTION_NAMES.CALL_CENTERS}/${callCenterId}/callHistory/${callLogId}`);
        batch.delete(docRef);
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`🔄 [BATCH-DELETE-CALL-LOGS] Committing batch delete of ${deletedCount} call logs`);
        await batch.commit();
        console.log('✅ [BATCH-DELETE-CALL-LOGS] Batch delete completed successfully');
      } else {
        console.log('⚠️ [BATCH-DELETE-CALL-LOGS] No valid IDs to delete');
      }

      return { success: true, deleted: deletedCount };
    } catch (error) {
      console.error('❌ [BATCH-DELETE-CALL-LOGS] Error batch deleting call logs:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

  // Synchronization methods for bidirectional updates

  // Sync call center updates back to prospects
  static async syncUpdatesToProspects(callCenter: CallCenter, updates: Partial<CallCenter>): Promise<void> {
    try {
      const { ProspectionService } = await import('@/lib/services/prospection-service');

      // Find matching prospects by name
      const prospects = await ProspectionService.getAllProspects();
      const matchingProspect = prospects.find(p => p.name.toLowerCase() === callCenter.name.toLowerCase());

      if (matchingProspect) {
        const prospectUpdates: any = {};

        // Sync status
        if (updates.status !== undefined) {
          let prospectStatus: 'pending' | 'contacted' | 'qualified' | 'not_interested' | 'invalid' | 'active' | 'added_to_crm' | 'archived' = 'active';
          switch (updates.status) {
            case 'New':
              prospectStatus = 'pending';
              break;
            case 'Contacted':
              prospectStatus = 'contacted';
              break;
            case 'Qualified':
              prospectStatus = 'qualified';
              break;
            case 'Proposal':
              prospectStatus = 'added_to_crm';
              break;
            case 'Negotiation':
              prospectStatus = 'added_to_crm';
              break;
            case 'Closed-Won':
              prospectStatus = 'added_to_crm';
              break;
            case 'Closed-Lost':
              prospectStatus = 'not_interested';
              break;
            case 'On-Hold':
              prospectStatus = 'pending';
              break;
          }
          prospectUpdates.status = prospectStatus;
        }

        // Sync tags
        if (updates.tags !== undefined) {
          prospectUpdates.tags = updates.tags;
        }

        // Sync destinations
        if (updates.destinations !== undefined) {
          prospectUpdates.destinations = updates.destinations;
        }

        // Sync notes (append to existing notes)
        if (updates.notes !== undefined) {
          const updatedNotes = matchingProspect.notes
            ? `${matchingProspect.notes}\n\n--- Call Center Notes ---\n${updates.notes}`
            : updates.notes;
          prospectUpdates.notes = updatedNotes;
        }

        if (Object.keys(prospectUpdates).length > 0) {
          await ProspectionService.updateProspect(matchingProspect.id, prospectUpdates, true);
          console.log(`🔄 Synced updates from call center ${callCenter.name} to prospect`);
        }
      }
    } catch (error) {
      console.error('Error syncing call center updates to prospects:', error);
      throw error;
    }
  }

  // Sync contact from call center to prospects
  static async syncContactToProspects(callCenter: CallCenter, contact: any): Promise<void> {
    try {
      const { ProspectionService } = await import('@/lib/services/prospection-service');

      // Find matching prospects by name
      const prospects = await ProspectionService.getAllProspects();
      const matchingProspect = prospects.find(p => p.name.toLowerCase() === callCenter.name.toLowerCase());

      if (matchingProspect) {
        // Convert call center contact to prospect contact format
        const prospectContact = {
          name: contact.name,
          position: contact.position,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes
        };

        await ProspectionService.addContact(matchingProspect.id, prospectContact, true);
        console.log(`🔄 Synced contact ${contact.name} from call center ${callCenter.name} to prospect`);
      }
    } catch (error) {
      console.error('Error syncing contact to prospects:', error);
      throw error;
    }
  }

  // Sync WhatsApp history from call center to prospects (framework ready)
  // This will be implemented when WhatsApp history logging is added to DailyWhatsAppService
  static async syncWhatsAppHistoryToProspects(callCenter: CallCenter, whatsappHistory: any): Promise<void> {
    try {
      // Framework ready - implement when WhatsApp history is properly stored
      // This would sync WhatsApp interactions from call centers to prospects
      console.log(`🔄 [FRAMEWORK] WhatsApp history sync ready for call center ${callCenter.name}`);
    } catch (error) {
      console.error('Error syncing WhatsApp history to prospects:', error);
      throw error;
    }
  }

  // Sync step priority changes (when step priorities are updated)
  static async syncStepPriorityToProspects(callCenter: CallCenter, step: Step): Promise<void> {
    try {
      const { ProspectionService } = await import('@/lib/services/prospection-service');

      // Find matching prospects by name
      const prospects = await ProspectionService.getAllProspects();
      const matchingProspect = prospects.find(p => p.name.toLowerCase() === callCenter.name.toLowerCase());

      if (matchingProspect && matchingProspect.steps) {
        // Find matching step by title/description
        const matchingStep = matchingProspect.steps.find(s =>
          s.title === step.title || s.description === step.description
        );

        if (matchingStep) {
          // Update step priority in prospect
          await ProspectionService.updateStep(matchingProspect.id, matchingStep.id, {
            priority: step.priority
          });
          console.log(`🔄 Synced step priority ${step.priority} from call center ${callCenter.name} to prospect`);
        }
      }
    } catch (error) {
      console.error('Error syncing step priority to prospects:', error);
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