/**
 * COMPREHENSIVE DEBUGGING SCRIPT - Collection Access Differences
 * This script compares GroupService vs GroupsPostingGeneratorService data access patterns
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, getDocs, collection, query, orderBy, getDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: 'posting-organizer-crm-new.firebaseapp.com',
  projectId: 'posting-organizer-crm-new',
  storageBucket: 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: '593772237603',
  appId: '1:593772237603:web:9559b82b91f3353cb2f296'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_NAME = 'groupsVOIP';

/**
 * GroupService approach - WITH ordering
 */
async function getAllGroupsWithOrder() {
  try {
    console.log('🔍 [GroupService] Using query with orderBy("createdAt", "desc")');
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    console.log(`✅ [GroupService] Successfully loaded ${querySnapshot.docs.length} groups with ordering`);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ [GroupService] Error:', error);
    return [];
  }
}

/**
 * GroupsPostingGeneratorService approach - WITHOUT ordering
 */
async function getGroupsWithoutOrder() {
  try {
    console.log('🔍 [Algorithm] Using getDocs without ordering');
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    console.log(`✅ [Algorithm] Successfully loaded ${querySnapshot.docs.length} groups without ordering`);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ [Algorithm] Error:', error);
    return [];
  }
}

/**
 * Hybrid approach - Same collection, different query styles
 */
async function compareCollectionAccess() {
  console.log('=' .repeat(60));
  console.log('🔍 COLLECTION ACCESS COMPARISON DEBUGGING');
  console.log('=' .repeat(60));
  
  // Method 1: GroupService style (with ordering)
  console.log('\n📊 Method 1: GroupService Style (with orderBy)');
  console.log('-'.repeat(50));
  const groupsWithOrder = await getAllGroupsWithOrder();
  
  // Method 2: Algorithm style (no ordering)
  console.log('\n📊 Method 2: Algorithm Style (no orderBy)');
  console.log('-'.repeat(50));
  const groupsWithoutOrder = await getGroupsWithoutOrder();
  
  // Compare results
  console.log('\n📊 COMPARISON RESULTS');
  console.log('-'.repeat(50));
  console.log(`With orderBy: ${groupsWithOrder.length} groups`);
  console.log(`Without orderBy: ${groupsWithoutOrder.length} groups`);
  console.log(`Difference: ${groupsWithOrder.length - groupsWithoutOrder.length} groups`);
  
  // Show sample data from both methods
  if (groupsWithOrder.length > 0) {
    console.log('\n📋 Sample Group (with orderBy):');
    const firstGroup = groupsWithOrder[0];
    console.log(`  ID: ${firstGroup.id}`);
    console.log(`  Name: ${firstGroup.name || 'No name'}`);
    console.log(`  Member Count: ${firstGroup.memberCount || 'No member count'}`);
    console.log(`  Status: ${firstGroup.status || 'No status'}`);
    console.log(`  CreatedAt: ${firstGroup.createdAt || 'No createdAt'}`);
    console.log(`  URL: ${firstGroup.url || 'No URL'}`);
  }
  
  if (groupsWithoutOrder.length > 0) {
    console.log('\n📋 Sample Group (without orderBy):');
    const firstGroup = groupsWithoutOrder[0];
    console.log(`  ID: ${firstGroup.id}`);
    console.log(`  Name: ${firstGroup.name || 'No name'}`);
    console.log(`  Member Count: ${firstGroup.memberCount || 'No member count'}`);
    console.log(`  Status: ${firstGroup.status || 'No status'}`);
    console.log(`  CreatedAt: ${firstGroup.createdAt || 'No createdAt'}`);
    console.log(`  URL: ${firstGroup.url || 'No URL'}`);
  }
  
  // Check if there are createdAt fields
  const groupsWithCreatedAt = groupsWithOrder.filter(g => g.createdAt).length;
  const groupsWithoutCreatedAt = groupsWithoutOrder.filter(g => !g.createdAt).length;
  
  console.log('\n📊 CREATEDAT FIELD ANALYSIS');
  console.log('-'.repeat(50));
  console.log(`Groups with createdAt field (with orderBy): ${groupsWithCreatedAt}`);
  console.log(`Groups without createdAt field (without orderBy): ${groupsWithoutCreatedAt}`);
  
  // Check collection size limits
  console.log('\n📊 COLLECTION SIZE LIMITS');
  console.log('-'.repeat(50));
  console.log('Firebase Firestore default limit: 1000 docs per query');
  console.log('If you see exactly 1000 groups, you might need pagination');
  
  // Check for ordering issues
  if (groupsWithOrder.length !== groupsWithoutOrder.length) {
    console.log('\n⚠️  ORDERING ISSUE DETECTED!');
    console.log('-'.repeat(50));
    console.log('Possible causes:');
    console.log('1. Some documents missing "createdAt" field');
    console.log('2. Indexing issues with orderBy clause');
    console.log('3. Document access permissions');
    console.log('4. Data migration issues');
    
    // Check what might be causing the difference
    const diff = Math.abs(groupsWithOrder.length - groupsWithoutOrder.length);
    if (diff === 1) {
      console.log('\n💡 Likely cause: One document missing createdAt field');
      console.log('Solution: Add missing createdAt fields or use different ordering');
    }
  } else {
    console.log('\n✅ No ordering issues detected - both methods return same count');
  }
  
  // Additional debugging: Check actual collection content
  console.log('\n📊 DETAILED COLLECTION CONTENT');
  console.log('-'.repeat(50));
  console.log('Checking if groups are actually accessible...');
  
  // Get all groups without any filters to see what's actually there
  try {
    const allGroupsRaw = await getDocs(collection(db, COLLECTION_NAME));
    console.log(`Total documents in collection: ${allGroupsRaw.docs.length}`);
    
    // Sample a few documents to see their structure
    console.log('\nDocument structure analysis:');
    allGroupsRaw.docs.slice(0, 5).forEach((doc, idx) => {
      const data = doc.data();
      const keys = Object.keys(data);
      console.log(`  Doc ${idx + 1}: ${keys.length} fields - ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      console.log(`    Has createdAt: ${data.createdAt ? 'Yes' : 'No'}`);
      console.log(`    Has name: ${data.name ? 'Yes' : 'No'}`);
      console.log(`    Has memberCount: ${data.memberCount !== undefined ? 'Yes' : 'No'}`);
    });
  } catch (error) {
    console.log(`Error accessing raw collection: ${error.message}`);
  }
}

// Run the comparison
compareCollectionAccess()
  .then(() => {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 DEBUGGING COMPLETE');
    console.log('=' .repeat(60));
    console.log('If you see different counts between the two methods,');
    console.log('the issue is likely in the ordering or filtering logic.');
    console.log('The solution is to make the algorithm use the same');
    console.log('query pattern as the GroupService.');
  })
  .catch(error => {
    console.error('Debugging failed:', error);
  });