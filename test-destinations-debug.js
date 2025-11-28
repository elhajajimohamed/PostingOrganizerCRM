#!/usr/bin/env node

/**
 * Destinations Debug Test Script
 * 
 * This script helps debug the destinations disappearing issue by testing:
 * 1. Creating a call center with destinations
 * 2. Retrieving the call center and checking if destinations persist
 * 3. Updating destinations and verifying they persist
 * 
 * Run this script to identify where destinations are getting lost in the flow.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

// Firebase configuration - replace with your config
const firebaseConfig = {
  // You'll need to add your Firebase config here
  // This is a template - the actual config should come from your .env or config
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDestinationsPersistence() {
  console.log('🧪 [TEST] Starting destinations persistence test...\n');

  try {
    // Test 1: Create a new call center with destinations
    console.log('📝 [TEST] Test 1: Creating call center with destinations');
    const testCallCenterId = `test-destinations-${Date.now()}`;
    const testData = {
      name: `Test Call Center ${Date.now()}`,
      country: 'Morocco',
      city: 'Casablanca',
      positions: 50,
      status: 'New',
      phones: ['+212 6 12 34 56 78'],
      emails: ['test@example.com'],
      destinations: ['USA', 'Canada', 'France'], // Test destinations
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'callCenters', testCallCenterId), testData);
    console.log('✅ [TEST] Call center created with ID:', testCallCenterId);
    console.log('📍 [TEST] Destinations saved:', testData.destinations);

    // Test 2: Retrieve the call center and check destinations
    console.log('\n🔍 [TEST] Test 2: Retrieving call center to verify destinations');
    const retrievedDoc = await getDoc(doc(db, 'callCenters', testCallCenterId));
    
    if (retrievedDoc.exists()) {
      const retrievedData = retrievedDoc.data();
      console.log('📖 [TEST] Retrieved data:');
      console.log('  - Name:', retrievedData.name);
      console.log('  - Destinations:', retrievedData.destinations);
      console.log('  - Destinations type:', typeof retrievedData.destinations);
      console.log('  - Destinations isArray:', Array.isArray(retrievedData.destinations));
      
      // Check if destinations are preserved
      if (JSON.stringify(retrievedData.destinations) === JSON.stringify(testData.destinations)) {
        console.log('✅ [TEST] Destinations preserved correctly!');
      } else {
        console.log('❌ [TEST] Destinations NOT preserved correctly!');
        console.log('  Expected:', testData.destinations);
        console.log('  Got:', retrievedData.destinations);
      }
    } else {
      console.log('❌ [TEST] Failed to retrieve created call center');
      return;
    }

    // Test 3: Update destinations
    console.log('\n🔄 [TEST] Test 3: Updating destinations');
    const updatedDestinations = ['USA', 'Canada', 'France', 'Spain', 'Germany'];
    await updateDoc(doc(db, 'callCenters', testCallCenterId), {
      destinations: updatedDestinations,
      updatedAt: new Date()
    });
    console.log('📍 [TEST] Updated destinations to:', updatedDestinations);

    // Test 4: Retrieve again to verify update
    console.log('\n🔍 [TEST] Test 4: Retrieving call center after update');
    const updatedDoc = await getDoc(doc(db, 'callCenters', testCallCenterId));
    
    if (updatedDoc.exists()) {
      const updatedData = updatedDoc.data();
      console.log('📖 [TEST] Retrieved updated data:');
      console.log('  - Destinations:', updatedData.destinations);
      console.log('  - Destinations type:', typeof updatedData.destinations);
      console.log('  - Destinations isArray:', Array.isArray(updatedData.destinations));
      
      // Check if updated destinations are preserved
      if (JSON.stringify(updatedData.destinations) === JSON.stringify(updatedDestinations)) {
        console.log('✅ [TEST] Updated destinations preserved correctly!');
      } else {
        console.log('❌ [TEST] Updated destinations NOT preserved correctly!');
        console.log('  Expected:', updatedDestinations);
        console.log('  Got:', updatedData.destinations);
      }
    }

    // Test 5: Cleanup
    console.log('\n🧹 [TEST] Test 5: Cleaning up test data');
    await updateDoc(doc(db, 'callCenters', testCallCenterId), {
      archived: true,
      updatedAt: new Date()
    });
    console.log('✅ [TEST] Test call center archived');

    console.log('\n🎉 [TEST] Destinations persistence test completed!');
    
  } catch (error) {
    console.error('❌ [TEST] Test failed with error:', error);
  }
}

// Test individual Firestore operations
async function testFirestoreDestinations() {
  console.log('\n🔥 [FIRESTORE] Testing Firestore destinations handling...\n');

  try {
    // Test array operations
    const testDocId = `firestore-test-${Date.now()}`;
    
    console.log('📝 [FIRESTORE] Testing array write...');
    await setDoc(doc(db, 'callCenters', testDocId), {
      name: 'Firestore Test',
      destinations: ['USA', 'Canada'],
      createdAt: new Date()
    });
    
    console.log('🔍 [FIRESTORE] Testing array read...');
    const docSnap = await getDoc(doc(db, 'callCenters', testDocId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('📖 [FIRESTORE] Read destinations:', data.destinations);
      console.log('📖 [FIRESTORE] Type:', typeof data.destinations);
      console.log('📖 [FIRESTORE] Is Array:', Array.isArray(data.destinations));
    }

    console.log('🔄 [FIRESTORE] Testing array update...');
    await updateDoc(doc(db, 'callCenters', testDocId), {
      destinations: ['USA', 'Canada', 'France', 'Spain']
    });

    const updatedSnap = await getDoc(doc(db, 'callCenters', testDocId));
    if (updatedSnap.exists()) {
      const updatedData = updatedSnap.data();
      console.log('📖 [FIRESTORE] Updated destinations:', updatedData.destinations);
    }

    // Cleanup
    await updateDoc(doc(db, 'callCenters', testDocId), { archived: true });
    console.log('✅ [FIRESTORE] Test completed');

  } catch (error) {
    console.error('❌ [FIRESTORE] Test failed:', error);
  }
}

// Run tests
async function main() {
  console.log('🚀 Starting Destinations Debug Tests...\n');
  
  // Check if Firebase config is provided
  if (!firebaseConfig.apiKey) {
    console.log('⚠️  [CONFIG] Firebase config not provided.');
    console.log('📝 [CONFIG] Please update the firebaseConfig object in this script with your Firebase project config.');
    console.log('🔧 [CONFIG] You can find this in your Firebase Console > Project Settings > General > Your apps.\n');
    return;
  }

  await testDestinationsPersistence();
  await testFirestoreDestinations();
}

// Export for use in other scripts
module.exports = {
  testDestinationsPersistence,
  testFirestoreDestinations
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}