import { collection, query, where, getDocs, getDoc, orderBy, limit, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CallCenter } from '@/lib/types/external-crm';

export interface DuplicateMatch {
  id: string;
  name: string;
  country: string;
  city: string;
  similarity: number;
  matchType: 'exact' | 'high' | 'medium' | 'low';
  existingCallCenter: CallCenter;
}

export interface DuplicateGroup {
  id: string;
  name: string;
  matches: DuplicateMatch[];
  suggestedAction: 'merge' | 'skip' | 'create_new';
}

export class DuplicateDetectionService {
  private static readonly SIMILARITY_THRESHOLDS = {
    exact: 100,
    high: 90,
    medium: 70,
    low: 50
  };

  /**
    * Calculate similarity between two strings using Levenshtein distance
    */
   static calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 100;

    // One string contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      return 85;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    if (maxLength === 0) return 100;

    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.round(similarity);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
    * Check if a call center is a potential duplicate
    */
   static async findDuplicates(callCenter: Partial<CallCenter>): Promise<DuplicateMatch[]> {
     try {
       console.log('🔍 [DUPLICATE-DETECTION] Starting duplicate search for:', {
         name: callCenter.name,
         country: callCenter.country,
         city: callCenter.city,
         id: callCenter.id
       });

       const duplicates: DuplicateMatch[] = [];

       // Search by name and country (most important criteria)
       if (callCenter.name && callCenter.country) {
        const nameQuery = query(
          collection(db, 'callCenters'),
          where('country', '==', callCenter.country),
          orderBy('name'),
          limit(20)
        );

        const querySnapshot = await getDocs(nameQuery);

        console.log(`🔍 [DUPLICATE-DETECTION] Query returned ${querySnapshot.docs.length} potential matches for ${callCenter.name} in ${callCenter.country}`);

        querySnapshot.docs.forEach(doc => {
          const existing = { id: doc.id, ...doc.data() } as CallCenter;
          const nameSimilarity = this.calculateSimilarity(callCenter.name || '', existing.name);

          console.log(`🔍 [DUPLICATE-DETECTION] Comparing "${callCenter.name}" with "${existing.name}": ${nameSimilarity}% similarity`);

          if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.low) {
            let matchType: 'exact' | 'high' | 'medium' | 'low' = 'low';
            if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.exact) matchType = 'exact';
            else if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.high) matchType = 'high';
            else if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.medium) matchType = 'medium';

            // Boost similarity if city also matches
            if (callCenter.city && existing.city) {
              const citySimilarity = this.calculateSimilarity(callCenter.city, existing.city);
              if (citySimilarity >= 80) {
                matchType = matchType === 'low' ? 'medium' : matchType;
              }
            }

            duplicates.push({
              id: existing.id,
              name: existing.name,
              country: existing.country,
              city: existing.city,
              similarity: nameSimilarity,
              matchType,
              existingCallCenter: existing
            });
          }
        });
      }

      // Sort by similarity (highest first)
      const sortedDuplicates = duplicates.sort((a, b) => b.similarity - a.similarity);

      console.log(`✅ [DUPLICATE-DETECTION] Found ${sortedDuplicates.length} potential duplicates:`, sortedDuplicates.map(d => ({
        name: d.name,
        similarity: d.similarity,
        matchType: d.matchType
      })));

      return sortedDuplicates;

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTION] Error finding duplicates:', error);
      return [];
    }
  }

  /**
   * Group duplicates into logical groups for review
   */
  static groupDuplicates(duplicates: DuplicateMatch[]): DuplicateGroup[] {
    const groups = new Map<string, DuplicateMatch[]>();

    duplicates.forEach(duplicate => {
      // Group by exact name and country for true duplicates
      const key = `${duplicate.name.toLowerCase().trim()}_${duplicate.country}`.toLowerCase();

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(duplicate);
    });

    return Array.from(groups.entries()).map(([key, matches]) => ({
      id: key,
      name: matches[0].name,
      matches: matches.sort((a, b) => b.similarity - a.similarity), // Sort by similarity within group
      suggestedAction: this.suggestAction(matches)
    }));
  }

  /**
   * Suggest the best action for a group of duplicates
   */
  private static suggestAction(matches: DuplicateMatch[]): 'merge' | 'skip' | 'create_new' {
    const exactMatches = matches.filter(m => m.matchType === 'exact');
    const highMatches = matches.filter(m => m.matchType === 'high');

    if (exactMatches.length > 0) {
      return 'merge'; // Definitely merge exact matches
    } else if (highMatches.length > 0) {
      return 'merge'; // Likely merge high similarity matches
    } else {
      return 'create_new'; // Create new for low similarity matches
    }
  }

  /**
   * Validate call center data before import
   */
  static validateCallCenter(callCenter: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!callCenter.name || !callCenter.name.trim()) {
      errors.push('Name is required');
    }

    if (!callCenter.country) {
      errors.push('Country is required');
    } else {
      const validCountries = ['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'];
      if (!validCountries.includes(callCenter.country)) {
        errors.push(`Country must be one of: ${validCountries.join(', ')}`);
      }
    }

    // Optional but validated fields
    if (callCenter.positions && (isNaN(callCenter.positions) || callCenter.positions < 0)) {
      errors.push('Positions must be a valid positive number');
    }

    if (callCenter.value && (isNaN(callCenter.value) || callCenter.value < 0)) {
      errors.push('Value must be a valid positive number');
    }

    if (callCenter.status) {
      const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];
      if (!validStatuses.includes(callCenter.status)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Validate email format if provided
    if (callCenter.email && !this.isValidEmail(callCenter.email)) {
      errors.push('Email format is invalid');
    }

    // Validate phone numbers if provided
    if (callCenter.phones && Array.isArray(callCenter.phones)) {
      callCenter.phones.forEach((phone: string, index: number) => {
        if (phone && !this.isValidPhone(phone)) {
          errors.push(`Phone number ${index + 1} format is invalid`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if email format is valid
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if phone number format is valid
   */
  private static isValidPhone(phone: string): boolean {
    // Basic phone validation - should contain numbers and common phone symbols
    const phoneRegex = /^[\+\-\(\)\s\d]{7,20}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Clean and normalize call center data
   */
  static sanitizeCallCenter(callCenter: any): any {
    return {
      name: (callCenter.name || '').trim(),
      country: (callCenter.country || 'Morocco').trim(),
      city: (callCenter.city || '').trim(),
      positions: parseInt(callCenter.positions) || 0,
      status: (callCenter.status || 'New').trim(),
      phones: Array.isArray(callCenter.phones)
        ? callCenter.phones.filter((p: string) => p && p.trim()).map((p: string) => p.trim())
        : [],
      emails: Array.isArray(callCenter.emails)
        ? callCenter.emails.filter((e: string) => e && e.trim()).map((e: string) => e.trim())
        : [],
      website: (callCenter.website || '').trim(),
      tags: Array.isArray(callCenter.tags)
        ? callCenter.tags.filter((t: string) => t && t.trim()).map((t: string) => t.trim())
        : [],
      notes: (callCenter.notes || '').trim(),
      address: (callCenter.address || '').trim(),
      value: parseFloat(callCenter.value) || 0,
      currency: (callCenter.currency || 'MAD').trim(),
      source: (callCenter.source || 'import').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContacted: callCenter.lastContacted || null
    };
  }

  /**
   * Analyze entire database for duplicates using optimized approach
   */
  static async analyzeAllDuplicates(): Promise<{
    totalCallCenters: number;
    duplicateGroups: DuplicateGroup[];
    summary: {
      exactMatches: number;
      highMatches: number;
      mediumMatches: number;
      lowMatches: number;
      totalDuplicates: number;
    };
  }> {
    try {
      console.log('🔍 [DUPLICATE-DETECTION] Starting optimized database analysis...');

      // Get all call centers
      const callCentersQuery = query(collection(db, 'callCenters'));
      const querySnapshot = await getDocs(callCentersQuery);

      const allCallCenters = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CallCenter[];

      console.log(`📊 [DUPLICATE-DETECTION] Analyzing ${allCallCenters.length} call centers for duplicates`);

      if (allCallCenters.length === 0) {
        return {
          totalCallCenters: 0,
          duplicateGroups: [],
          summary: { exactMatches: 0, highMatches: 0, mediumMatches: 0, lowMatches: 0, totalDuplicates: 0 }
        };
      }

      const allDuplicates: DuplicateMatch[] = [];

      // Group call centers by country for more efficient processing
      const callCentersByCountry = new Map<string, CallCenter[]>();
      allCallCenters.forEach(cc => {
        const country = cc.country || 'Unknown';
        if (!callCentersByCountry.has(country)) {
          callCentersByCountry.set(country, []);
        }
        callCentersByCountry.get(country)!.push(cc);
      });

      // Process each country separately to reduce comparisons
      for (const [country, centers] of callCentersByCountry.entries()) {
        console.log(`🔍 [DUPLICATE-DETECTION] Processing ${centers.length} centers in ${country}`);

        // Group by exact name matches first (most efficient)
        const exactNameGroups = new Map<string, CallCenter[]>();
        centers.forEach(center => {
          const exactKey = `${center.name.toLowerCase().trim()}_${center.country}`;
          if (!exactNameGroups.has(exactKey)) {
            exactNameGroups.set(exactKey, []);
          }
          exactNameGroups.get(exactKey)!.push(center);
        });

        // Process exact duplicates (same name and country)
        for (const [exactKey, groupCenters] of exactNameGroups.entries()) {
          if (groupCenters.length >= 2) {
            // All centers in this group are exact duplicates
            groupCenters.forEach(center => {
              allDuplicates.push({
                id: center.id,
                name: center.name,
                country: center.country,
                city: center.city,
                similarity: 100,
                matchType: 'exact',
                existingCallCenter: center
              });
            });
            console.log(`🔍 [DUPLICATE-DETECTION] Found ${groupCenters.length} exact duplicates for "${groupCenters[0].name}" in ${country}`);
          }
        }

        // For non-exact matches, group by normalized name prefix
        const processedIds = new Set(allDuplicates.map(d => d.id));
        const remainingCenters = centers.filter(c => !processedIds.has(c.id));

        if (remainingCenters.length >= 2) {
          const nameGroups = new Map<string, CallCenter[]>();
          remainingCenters.forEach(center => {
            const normalizedName = center.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
            if (!nameGroups.has(normalizedName)) {
              nameGroups.set(normalizedName, []);
            }
            nameGroups.get(normalizedName)!.push(center);
          });

          // Only compare centers within the same name group for similarity
          for (const [nameKey, groupCenters] of nameGroups.entries()) {
            if (groupCenters.length < 2) continue;

            for (let i = 0; i < groupCenters.length; i++) {
              for (let j = i + 1; j < groupCenters.length; j++) {
                const cc1 = groupCenters[i];
                const cc2 = groupCenters[j];

                const nameSimilarity = this.calculateSimilarity(cc1.name, cc2.name);

                if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.low) {
                  let matchType: 'exact' | 'high' | 'medium' | 'low' = 'low';
                  if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.exact) matchType = 'exact';
                  else if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.high) matchType = 'high';
                  else if (nameSimilarity >= this.SIMILARITY_THRESHOLDS.medium) matchType = 'medium';

                  // Boost similarity if city also matches
                  if (cc1.city && cc2.city) {
                    const citySimilarity = this.calculateSimilarity(cc1.city, cc2.city);
                    if (citySimilarity >= 80) {
                      matchType = matchType === 'low' ? 'medium' : matchType;
                    }
                  }

                  // Only add if not already processed
                  if (!processedIds.has(cc1.id)) {
                    allDuplicates.push({
                      id: cc1.id,
                      name: cc1.name,
                      country: cc1.country,
                      city: cc1.city,
                      similarity: nameSimilarity,
                      matchType,
                      existingCallCenter: cc1
                    });
                    processedIds.add(cc1.id);
                  }

                  if (!processedIds.has(cc2.id)) {
                    allDuplicates.push({
                      id: cc2.id,
                      name: cc2.name,
                      country: cc2.country,
                      city: cc2.city,
                      similarity: nameSimilarity,
                      matchType,
                      existingCallCenter: cc2
                    });
                    processedIds.add(cc2.id);
                  }

                  console.log(`🔍 [DUPLICATE-DETECTION] Found similar pair: "${cc1.name}" vs "${cc2.name}" (${nameSimilarity}% similarity)`);
                }
              }
            }
          }
        }
      }

      // Group duplicates
      const duplicateGroups = this.groupDuplicates(allDuplicates);

      // Calculate summary
      const summary = {
        exactMatches: allDuplicates.filter(d => d.matchType === 'exact').length,
        highMatches: allDuplicates.filter(d => d.matchType === 'high').length,
        mediumMatches: allDuplicates.filter(d => d.matchType === 'medium').length,
        lowMatches: allDuplicates.filter(d => d.matchType === 'low').length,
        totalDuplicates: allDuplicates.length
      };

      console.log('✅ [DUPLICATE-DETECTION] Database analysis complete:', {
        totalCallCenters: allCallCenters.length,
        duplicateGroups: duplicateGroups.length,
        summary
      });

      return {
        totalCallCenters: allCallCenters.length,
        duplicateGroups,
        summary
      };

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTION] Error analyzing duplicates:', error);
      throw error;
    }
  }

  /**
   * Merge duplicate call centers
   */
  static async mergeDuplicates(masterId: string, duplicateIds: string[]): Promise<boolean> {
    try {
      console.log(`🔄 [DUPLICATE-DETECTION] Merging duplicates. Master: ${masterId}, Duplicates: ${duplicateIds.join(', ')}`);

      // Get master call center
      const masterRef = doc(db, 'callCenters', masterId);
      const masterSnap = await getDoc(masterRef);
      if (!masterSnap.exists()) {
        throw new Error('Master call center not found');
      }

      const masterData = masterSnap.data() as CallCenter;

      // Get all duplicate call centers
      const duplicateRefs = duplicateIds.map(id => doc(db, 'callCenters', id));
      const duplicateSnaps = await Promise.all(duplicateRefs.map(ref => getDoc(ref)));

      // Merge logic: combine data from duplicates into master
      const mergedData = { ...masterData };

      // Combine arrays and fields
      const allPhones = new Set([...(mergedData.phones || []), ...duplicateSnaps.flatMap(snap => snap.exists() ? snap.data().phones || [] : [])]);
      const allEmails = new Set([...(mergedData.emails || []), ...duplicateSnaps.flatMap(snap => snap.exists() ? snap.data().emails || [] : [])]);
      const allTags = new Set([...(mergedData.tags || []), ...duplicateSnaps.flatMap(snap => snap.exists() ? snap.data().tags || [] : [])]);

      mergedData.phones = Array.from(allPhones);
      mergedData.emails = Array.from(allEmails);
      mergedData.tags = Array.from(allTags);

      // Combine notes
      const duplicateNotes = duplicateSnaps
        .filter(snap => snap.exists())
        .map(snap => `Merged from duplicate: ${snap.data().name} - ${snap.data().notes || ''}`)
        .join('\n\n');
      mergedData.notes = `${mergedData.notes || ''}\n\n${duplicateNotes}`.trim();

      // Update positions, value if higher
      for (const snap of duplicateSnaps) {
        if (snap.exists()) {
          const dupData = snap.data() as CallCenter;
          if ((dupData.positions || 0) > (mergedData.positions || 0)) mergedData.positions = dupData.positions || 0;
          if ((dupData.value || 0) > (mergedData.value || 0)) mergedData.value = dupData.value || 0;
        }
      }

      mergedData.updatedAt = new Date().toISOString();

      // Update master with merged data
      await updateDoc(masterRef, mergedData);

      // Delete the duplicates
      await Promise.all(duplicateSnaps.map(snap => snap.exists() ? deleteDoc(snap.ref) : Promise.resolve()));

      console.log(`✅ [DUPLICATE-DETECTION] Successfully merged ${duplicateIds.length} duplicates into master record`);
      return true;

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTION] Error merging duplicates:', error);
      return false;
    }
  }

  /**
   * Bulk delete duplicates
   */
  static async bulkDeleteDuplicates(duplicateIds: string[]): Promise<boolean> {
    try {
      console.log(`🗑️ [DUPLICATE-DETECTION] Bulk deleting ${duplicateIds.length} duplicate call centers`);

      const deletePromises = duplicateIds.map(id => {
        const docRef = doc(db, 'callCenters', id);
        return getDoc(docRef).then(docSnap => {
          if (docSnap.exists()) {
            return deleteDoc(docRef);
          }
        });
      });

      await Promise.all(deletePromises);

      console.log(`✅ [DUPLICATE-DETECTION] Successfully deleted ${duplicateIds.length} duplicate call centers`);
      return true;

    } catch (error) {
      console.error('❌ [DUPLICATE-DETECTION] Error bulk deleting duplicates:', error);
      return false;
    }
  }
}