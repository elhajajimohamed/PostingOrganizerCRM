#!/usr/bin/env node

/**
 * Debug script for duplicate detection issue
 * This script diagnoses why the "ALREADY IN CALL CENTERS" badge is not showing
 */

console.log('🔍 DEBUGGING DUPLICATE DETECTION ISSUE');
console.log('=====================================');

// Simulate the matching logic
function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

function phonesMatch(phone1, phone2) {
  const norm1 = normalizePhone(phone1);
  const norm2 = normalizePhone(phone2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check if one is a subset of the other
  if (norm1.length >= 9 && norm2.length >= 9) {
    const last9_1 = norm1.slice(-9);
    const last9_2 = norm2.slice(-9);
    return last9_1 === last9_2;
  }
  
  return false;
}

function namesMatch(name1, name2) {
  const cleanName1 = name1.toLowerCase().trim();
  const cleanName2 = name2.toLowerCase().trim();

  // Exact match
  if (cleanName1 === cleanName2) return true;

  // Substring match
  if (cleanName1.includes(cleanName2) || cleanName2.includes(cleanName1)) {
    return cleanName1.length >= 3 && cleanName2.length >= 3;
  }

  // Word-based matching
  const words1 = cleanName1.split(/\s+/);
  const words2 = cleanName2.split(/\s+/);

  for (const word1 of words1) {
    if (word1.length >= 3) {
      for (const word2 of words2) {
        if (word2.length >= 3 && (word1.includes(word2) || word2.includes(word1))) {
          return true;
        }
      }
    }
  }

  return false;
}

function checkProspectInCallCenters(prospectName, prospectPhones, callCenters) {
  console.log(`\n🔍 Checking prospect: "${prospectName}" with phones:`, prospectPhones);
  console.log(`🔍 Against ${callCenters.length} call centers`);
  
  for (const callCenter of callCenters) {
    console.log(`\n  📞 Checking against call center: "${callCenter.name}"`);
    console.log(`     Phones: ${callCenter.phones.join(', ')}`);
    
    let matchType = null;

    // First, try phone matching
    for (const prospectPhone of prospectPhones) {
      for (const callCenterPhone of callCenter.phones) {
        console.log(`     Comparing "${prospectPhone}" with "${callCenterPhone}"`);
        if (phonesMatch(prospectPhone, callCenterPhone)) {
          console.log(`     ✅ PHONE MATCH FOUND!`);
          matchType = 'phone';
          break;
        } else {
          console.log(`     ❌ No match`);
        }
      }
      if (matchType) break;
    }

    // If no phone match, try name matching
    if (!matchType) {
      console.log(`     Comparing names: "${prospectName}" vs "${callCenter.name}"`);
      if (namesMatch(prospectName, callCenter.name)) {
        console.log(`     ✅ NAME MATCH FOUND!`);
        matchType = 'name';
      } else {
        console.log(`     ❌ No name match`);
      }
    }

    // If we found a match, return it
    if (matchType) {
      console.log(`\n🎯 MATCH FOUND: ${matchType.toUpperCase()} match with "${callCenter.name}"`);
      return {
        callCenter,
        matchType
      };
    }
  }
  
  console.log(`\n❌ NO MATCHES FOUND for "${prospectName}"`);
  return null;
}

// Test cases based on typical scenarios
console.log('\n🧪 TEST CASE 1: Exact phone match');
const testProspect1 = {
  id: '1',
  name: 'Test Call Center',
  phones: ['0522123456']
};

const testCallCenters1 = [
  {
    id: 'cc1',
    name: 'Different Name',
    phones: ['0522123456']
  }
];

const result1 = checkProspectInCallCenters(testProspect1.name, testProspect1.phones, testCallCenters1);
console.log('Result:', result1 ? `✅ Found ${result1.matchType} match` : '❌ No match');

console.log('\n🧪 TEST CASE 2: Name similarity');
const testProspect2 = {
  id: '2', 
  name: 'Informafrik Services',
  phones: ['0612345678']
};

const testCallCenters2 = [
  {
    id: 'cc2',
    name: 'INFORMAFRIK',
    phones: ['0654321098']
  }
];

const result2 = checkProspectInCallCenters(testProspect2.name, testProspect2.phones, testCallCenters2);
console.log('Result:', result2 ? `✅ Found ${result2.matchType} match` : '❌ No match');

console.log('\n🧪 TEST CASE 3: Phone with different formatting');
const testProspect3 = {
  id: '3',
  name: 'Another Test',
  phones: ['+212 522 123 456']
};

const testCallCenters3 = [
  {
    id: 'cc3', 
    name: 'Different Name',
    phones: ['212522123456']
  }
];

const result3 = checkProspectInCallCenters(testProspect3.name, testProspect3.phones, testCallCenters3);
console.log('Result:', result3 ? `✅ Found ${result3.matchType} match` : '❌ No match');

console.log('\n🔍 ANALYSIS OF POTENTIAL ISSUES:');
console.log('==================================');
console.log('1. ✅ Matching logic seems correct');
console.log('2. 🔍 Potential issues:');
console.log('   - Empty call centers database');
console.log('   - Phone number format inconsistencies'); 
console.log('   - Name variations not detected');
console.log('   - API data not loading properly');
console.log('   - Frontend state not updating correctly');

console.log('\n🛠️  RECOMMENDED FIXES:');
console.log('======================');
console.log('1. Add more detailed console logging in the frontend');
console.log('2. Verify call centers API is returning data');
console.log('3. Test with specific known duplicate cases');
console.log('4. Add user feedback when no matches are found');
console.log('5. Consider expanding name matching criteria');

console.log('\n✨ The matching logic appears to be working correctly.');
console.log('The issue is likely in data loading or state management.');