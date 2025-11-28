import { CallCenter } from '@/lib/types/external-crm';

/**
 * Interface for prospect matching results
 */
export interface ProspectMatch {
  callCenter: CallCenter;
  matchType: 'phone' | 'name';
  remainingDays: number;
  absentUntil: string;
}

/**
 * Normalize phone number for comparison
 * Removes all non-digit characters and normalizes format
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Check if phone numbers match (considering country codes)
 */
function phonesMatch(phone1: string, phone2: string): boolean {
  const norm1 = normalizePhone(phone1);
  const norm2 = normalizePhone(phone2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check if one is a subset of the other (to handle different formats)
  if (norm1.length >= 9 && norm2.length >= 9) {
    // Take the last 9 digits for comparison (typical phone number length)
    const last9_1 = norm1.slice(-9);
    const last9_2 = norm2.slice(-9);
    return last9_1 === last9_2;
  }
  
  return false;
}

/**
 * Check if names match (case-insensitive substring match)
 * More strict matching to avoid false positives
 */
function namesMatch(name1: string, name2: string): boolean {
  const cleanName1 = name1.toLowerCase().trim();
  const cleanName2 = name2.toLowerCase().trim();

  // Exact match
  if (cleanName1 === cleanName2) return true;

  // Substring match (one contains the other) - only if significant overlap
  if (cleanName1.includes(cleanName2) || cleanName2.includes(cleanName1)) {
    // Require at least 3 characters to avoid false positives
    // And require that the shorter name is at least half the length of the longer one
    const minLength = Math.min(cleanName1.length, cleanName2.length);
    const maxLength = Math.max(cleanName1.length, cleanName2.length);
    return minLength >= 3 && minLength >= maxLength * 0.5;
  }

  // Word-based matching (for company names with multiple words)
  const words1 = cleanName1.split(/\s+/).filter(w => w.length >= 3);
  const words2 = cleanName2.split(/\s+/).filter(w => w.length >= 3);

  // Common words that should not be considered for matching
  const commonWords = new Set(['call', 'center', 'centre', 'maroc', 'morocco', 'services', 'group', 'company', 'contact', 'communication', 'telecom', 'phone', 'mobile', 'business', 'solutions', 'international', 'global', 'world', 'network', 'system', 'tech', 'technology', 'digital', 'online', 'web', 'net', 'pro', 'plus', 'new', 'best', 'top', 'first', 'second', 'third', 'north', 'south', 'east', 'west', 'central', 'courtage']);

  let matchCount = 0;

  // Check for significant word matches (not common words)
  for (const word1 of words1) {
    if (!commonWords.has(word1)) {
      for (const word2 of words2) {
        if (!commonWords.has(word2) && (word1.includes(word2) || word2.includes(word1))) {
          // Require the matching word to be at least 4 characters
          if (word1.length >= 4 && word2.length >= 4) {
            matchCount++;
            if (matchCount >= 2) return true; // Require at least 2 significant word matches
          }
        }
      }
    }
  }

  // If only one significant match, check if it's a very specific match
  if (matchCount === 1) {
    // For single word matches, require exact match or very close
    for (const word1 of words1) {
      if (!commonWords.has(word1) && word1.length >= 5) {
        for (const word2 of words2) {
          if (!commonWords.has(word2) && word2.length >= 5 && word1 === word2) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Calculate remaining days until a date
 */
function calculateRemainingDays(absentUntil: string): number {
  const now = new Date();
  const until = new Date(absentUntil);
  const diffTime = until.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Check if a call center has an active absence period
 */
function hasActiveAbsence(callCenter: CallCenter): boolean {
  if (!callCenter.absentDays || callCenter.absentDays <= 0) {
    return false;
  }
  
  // If absentUntil is set, check if it's still in the future
  if (callCenter.absentUntil) {
    const now = new Date();
    const until = new Date(callCenter.absentUntil);
    return until > now;
  }
  
  // Fallback: if absentDays is set but absentUntil is not calculated yet
  // This shouldn't happen with the form logic, but just in case
  return true;
}

/**
 * Match a prospect against a list of call centers
 * Returns the best match if found, or null if no match
 */
export function matchProspectToCallCenters(
  prospectName: string,
  prospectPhones: string[],
  callCenters: CallCenter[]
): ProspectMatch | null {
  let bestMatch: ProspectMatch | null = null;

  for (const callCenter of callCenters) {
    // Skip if call center doesn't have active absence
    if (!hasActiveAbsence(callCenter)) {
      continue;
    }

    let matchType: 'phone' | 'name' | null = null;

    // First, try phone matching (higher priority)
    for (const prospectPhone of prospectPhones) {
      for (const callCenterPhone of callCenter.phones) {
        if (phonesMatch(prospectPhone, callCenterPhone)) {
          matchType = 'phone';
          break;
        }
      }
      if (matchType) break;
    }

    // If no phone match, try name matching
    if (!matchType && namesMatch(prospectName, callCenter.name)) {
      matchType = 'name';
    }

    // If we found a match, calculate remaining days
    if (matchType && callCenter.absentUntil) {
      const remainingDays = calculateRemainingDays(callCenter.absentUntil);

      // Only include if there are still remaining days
      if (remainingDays > 0) {
        const match: ProspectMatch = {
          callCenter,
          matchType,
          remainingDays,
          absentUntil: callCenter.absentUntil
        };

        // Phone matches take priority over name matches
        if (!bestMatch || matchType === 'phone' || bestMatch.matchType === 'name') {
          bestMatch = match;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Check if a prospect exists in call centers database (for badge display)
 * Returns match info if found, or null if no match
 */
export interface CallCenterMatch {
  callCenter: CallCenter;
  matchType: 'phone' | 'name';
}

export function checkProspectInCallCenters(
  prospectName: string,
  prospectPhones: string[],
  callCenters: CallCenter[]
): CallCenterMatch | null {
  // Enhanced input validation and debugging
  if (!prospectName || prospectName.trim() === '') {
    console.warn('⚠️ Prospect name is empty, skipping match check');
    return null;
  }
  
  if (!Array.isArray(prospectPhones) || prospectPhones.length === 0) {
    console.warn('⚠️ Prospect has no phones, only checking name matches');
  }
  
  if (!Array.isArray(callCenters) || callCenters.length === 0) {
    console.warn('⚠️ No call centers provided for matching');
    return null;
  }
  
  console.log(`🔍 Matching prospect "${prospectName}" with ${prospectPhones.length} phones against ${callCenters.length} call centers`);

  for (const callCenter of callCenters) {
    if (!callCenter) {
      console.warn('⚠️ Skipping null call center');
      continue;
    }
    
    let matchType: 'phone' | 'name' | null = null;

    // First, try phone matching (higher priority)
    if (Array.isArray(prospectPhones) && prospectPhones.length > 0 && Array.isArray(callCenter.phones)) {
      for (const prospectPhone of prospectPhones) {
        if (!prospectPhone || prospectPhone.trim() === '') continue;
        
        for (const callCenterPhone of callCenter.phones) {
          if (!callCenterPhone || callCenterPhone.trim() === '') continue;
          
          const isMatch = phonesMatch(prospectPhone, callCenterPhone);
          console.log(`  📱 Comparing phones: "${prospectPhone}" vs "${callCenterPhone}" => ${isMatch ? 'MATCH' : 'no match'}`);
          
          if (isMatch) {
            matchType = 'phone';
            console.log(`  ✅ PHONE MATCH FOUND with call center "${callCenter.name}"`);
            break;
          }
        }
        if (matchType) break;
      }
    }

    // If no phone match, try name matching
    if (!matchType && callCenter.name) {
      const isNameMatch = namesMatch(prospectName, callCenter.name);
      console.log(`  📝 Comparing names: "${prospectName}" vs "${callCenter.name}" => ${isNameMatch ? 'MATCH' : 'no match'}`);
      
      if (isNameMatch) {
        matchType = 'name';
        console.log(`  ✅ NAME MATCH FOUND with call center "${callCenter.name}"`);
      }
    }

    // If we found a match, return it
    if (matchType) {
      console.log(`🎯 DUPLICATE DETECTED: "${prospectName}" matches "${callCenter.name}" via ${matchType}`);
      return {
        callCenter,
        matchType
      };
    }
  }

  console.log(`❌ No matches found for "${prospectName}"`);
  return null;
}

/**
 * Check multiple prospects against call centers
 * Returns a map of prospect ID to match result
 */
export function matchProspectsToCallCenters(
  prospects: Array<{
    id: string;
    name: string;
    phones: string[];
  }>,
  callCenters: CallCenter[]
): Map<string, ProspectMatch | null> {
  const matches = new Map<string, ProspectMatch | null>();
  
  for (const prospect of prospects) {
    const match = matchProspectToCallCenters(prospect.name, prospect.phones, callCenters);
    matches.set(prospect.id, match);
  }
  
  return matches;
}

/**
 * Get call centers with active absence periods
 */
export function getCallCentersWithActiveAbsence(callCenters: CallCenter[]): CallCenter[] {
  return callCenters.filter(hasActiveAbsence);
}